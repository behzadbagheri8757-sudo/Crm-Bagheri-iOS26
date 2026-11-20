/* js/intelligence/signals.js — Signal Engine (MVP, Patch-only).
   ============================================================
   READ-ONLY layer on top of the existing system:

     Existing Data (data.customers/invoices/checks/...)
           |
     Existing calc.js (customerBehavior, customerInvoices, ...)
           |
     THIS FILE (signals.js)
           |
        Signal[]

   Rules followed (per spec):
   - Does not mutate any data.
   - Does not write to IndexedDB.
   - Does not change calc.js, the DB schema, or existing UI.
   - Only reads from customerBehavior(cid) and, where explicitly
     allowed, data.checks / data.customers.
   - No PAYMENT_PATTERN_BREAK, no Cross-sell, no Basket Growth,
     no AI/ML, no invented thresholds beyond what was specified.

   Public API:
     extractCustomerSignals(cid) -> Signal[]

   Signal shape:
     {
       id, customerId, type, category, severity,
       value, unit, reason, confidence, detectedAt,
       actionable, source
     }
   ============================================================ */
'use strict';

(function (global) {

  /* ---------------------------------------------------------
     Small local helpers (kept private to this file — no
     collisions with existing globals, nothing exported besides
     extractCustomerSignals).
     --------------------------------------------------------- */

  function _nowISO() {
    // Consistent with the rest of the app's date handling (todayISO
    // is date-only); detectedAt should carry a real timestamp for
    // traceability, so use a full ISO datetime instead.
    return new Date().toISOString();
  }

  function _round(n, dp) {
    const m = Math.pow(10, dp || 0);
    return Math.round((n + Number.EPSILON) * m) / m;
  }

  function _pctChange(from, to) {
    // ((from - to) / from) * 100  -- caller decides direction (decline vs growth)
    if (!from) return null;
    return ((from - to) / from) * 100;
  }

  function _fa(n) {
    // Persian-friendly integer for reason strings; keep plain if not finite.
    if (!isFinite(n)) return String(n);
    return String(Math.round(n));
  }

  /* P-01: sourceLevel is derived from signal category nature.
     'sku'  = Customer×SKU intelligence categories (product-scoped).
     'account' = account / visit / payment behavior categories.
     Used by Risk Engine for double-counting prevention; never removes signals. */
  var SKU_SOURCE_CATEGORIES = {
    SKU_DELAY: true,
    SKU_QUANTITY_DROP: true,
    SKU_FREQUENCY_DROP: true,
    LINE_DROP: true,
    COMBINED_SKU_DETERIORATION: true,
    MULTI_SKU_DECLINE: true,
    SKU_CHURN: true
  };

  function _sourceLevelForCategory(category) {
    return SKU_SOURCE_CATEGORIES[category] ? 'sku' : 'account';
  }

  function _mkSignal(cid, category, opts) {
    return {
      id: 'sig_' + cid + '_' + category,
      customerId: cid,
      type: opts.type,
      category: category,
      severity: opts.severity,
      value: opts.value,
      unit: opts.unit,
      reason: opts.reason,
      confidence: opts.confidence != null ? opts.confidence : 0.9,
      detectedAt: _nowISO(),
      actionable: opts.actionable !== false,
      source: opts.source || 'customerBehavior',
      sourceLevel: opts.sourceLevel || _sourceLevelForCategory(category),
      evidence: opts.evidence || null,
    };
  }

  /* ---------------------------------------------------------
     Product Analysis Group (surgical addition — see models.js/db.js
     data.analysisGroups + product.analysisGroupId).
     Distinguishes "SKU واقعاً از دست رفته" from "SKU افت کرده ولی مشتری
     SKU دیگری از همان گروه تحلیلی را خریده" — Intelligence-layer only,
     no financial/inventory/FIFO/invoice behavior touched.
     --------------------------------------------------------- */

  /** Map productId -> product object, built once per extraction call. */
  function _buildProductsByIdMap() {
    var map = Object.create(null);
    var list = (typeof data !== 'undefined' && Array.isArray(data.products)) ? data.products : [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && p.id) map[p.id] = p;
    }
    return map;
  }

  function _analysisGroupNameById(gid) {
    if (!gid || typeof data === 'undefined' || !Array.isArray(data.analysisGroups)) return '';
    var g = data.analysisGroups.find(function (x) { return x && x.id === gid; });
    return g ? (g.name || '') : '';
  }

  /**
   * Set of productIds purchased (qty > 0) in the "late half" of the customer's
   * invoice history, using the EXACT same time split calc.js uses for
   * decliningProducts (customerBehavior): sort by date, invoice number as
   * tie-breaker, mid = Math.floor(count/2), late = second half.
   * No new threshold invented — same split, no invoiceCount gate beyond what
   * the split itself implies (an empty/short history naturally yields an
   * empty or trivial late-set).
   * Computed ONCE per extraction call (extractCustomerSignals /
   * extractWatchObservations) and passed down — never re-scanned per signal.
   */
  function _getConfirmedLateProductIds(cid, ctx) {
    var ids = Object.create(null);
    if (typeof customerInvoices !== 'function') return ids;
    var raw = customerInvoices(cid, ctx).filter(function(inv){return typeof isValidPurchaseInvoice !== 'function' || isValidPurchaseInvoice(inv);});
    var occasions = typeof groupPurchaseOccasions === 'function' ? groupPurchaseOccasions(raw) : raw.map(function(inv){return {date:inv.date,invoices:[inv]};});
    var mid = Math.floor(occasions.length / 2);
    var late = occasions.slice(mid).reduce(function(a,g){return a.concat(g.invoices||[]);}, []);
    for (var i = 0; i < late.length; i++) {
      var items = late[i].items || [];
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        if (it && it.productId && it.qty > 0) ids[it.productId] = true;
      }
    }
    return ids;
  }

  /**
   * Group Retention rule (exact, no fuzzy matching):
   * A declined + A.analysisGroupId exists + some B in lateProductIds shares
   * that analysisGroupId + B !== A  =>  true. Any missing piece => false.
   */
  function _isGroupRetained(productIdA, productsById, lateProductIds) {
    if (!productIdA || !productsById || !lateProductIds) return false;
    var prodA = productsById[productIdA];
    var groupId = prodA ? (prodA.analysisGroupId || null) : null;
    if (!groupId) return false;
    var lateIds = Object.keys(lateProductIds);
    for (var i = 0; i < lateIds.length; i++) {
      var pidB = lateIds[i];
      if (pidB === productIdA) continue;
      var prodB = productsById[pidB];
      var groupB = prodB ? (prodB.analysisGroupId || null) : null;
      if (groupB && groupB === groupId) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------
     1-3: Purchase decline / growth (based on sales30 vs salesPrev30)
     --------------------------------------------------------- */
  /* Limited-history guard (minimum caution, NOT a scientific sufficiency rule).
     With a single distinct purchase day, a sales30-vs-salesPrev30 comparison is
     not a purchase PATTERN (one old purchase always reads as a 100% drop), so it
     must not produce PURCHASE_DECLINE_* signals. Checked at generation time,
     before persistence, so previously stored occurrences cannot bypass it.
     Payment events (CHECK_BOUNCED / PAYMENT_OVERDUE) use a separate path and are
     unaffected. The Watch layer (PURCHASE_DECLINE_WATCH) still reports the raw
     drop as a non-scoring early observation. */
  var MIN_PURCHASE_DAYS_FOR_DECLINE = 2;
  /* BEHIND_PATTERN needs at least two distinct-day intervals (3 purchase days);
     one gap is not an established rhythm. */
  var MIN_DISTINCT_INTERVALS_FOR_BEHIND = 2;

  function _purchaseTrendSignals(cid, b, out) {
    if (!(b.salesPrev30 > 0)) return; // false-positive rule: no signal if no baseline
    // Distinct purchase days from customerBehavior; if that field is ever absent,
    // fall back to the invoice count (always present) instead of failing open.
    var purchaseDaysKnown = (typeof b.purchaseDayCount === 'number') ? b.purchaseDayCount
      : ((typeof b.invoiceCount === 'number') ? b.invoiceCount : null);
    var limitedPurchaseHistory = (purchaseDaysKnown != null
      && purchaseDaysKnown < MIN_PURCHASE_DAYS_FOR_DECLINE);

    const declinePct = _pctChange(b.salesPrev30, b.sales30); // positive => decline
    // growthPct: same baseline guard as decline (salesPrev30 > 0 already enforced above)
    const growthPct = ((b.sales30 - b.salesPrev30) / b.salesPrev30) * 100;

    if (!limitedPurchaseHistory && declinePct != null && declinePct >= 30) {
      out.push(_mkSignal(cid, 'PURCHASE_DECLINE_SEVERE', {
        type: 'risk',
        severity: 'critical',
        value: _round(declinePct, 1),
        unit: '%',
        reason: 'خرید ' + _fa(declinePct) + '٪ کاهش یافته است',
        confidence: 0.9,
      }));
      return; // duplication rule: severe suppresses mild
    }

    if (!limitedPurchaseHistory && declinePct != null && declinePct >= 15 && declinePct < 30) {
      out.push(_mkSignal(cid, 'PURCHASE_DECLINE_MILD', {
        type: 'risk',
        severity: 'medium',
        value: _round(declinePct, 1),
        unit: '%',
        reason: 'خرید ' + _fa(declinePct) + '٪ کاهش یافته است',
        confidence: 0.85,
      }));
    }

    if (growthPct != null && growthPct >= 20) {
      out.push(_mkSignal(cid, 'PURCHASE_GROWTH', {
        type: 'opportunity',
        severity: 'high',
        value: _round(growthPct, 1),
        unit: '%',
        reason: 'خرید ' + _fa(growthPct) + '٪ رشد داشته است',
        confidence: 0.85,
      }));
    }
  }

  /* ---------------------------------------------------------
     4: BEHIND_PATTERN — reuse existing behavior flag as-is
     --------------------------------------------------------- */
  function _behindPatternSignal(cid, b, out) {
    if (typeof b.distinctIntervalCount === 'number') {
      // Distinct-purchase-day basis: same-day invoices make no 0-day gaps, and a
      // single gap is not an established pattern.
      if (b.distinctIntervalCount < MIN_DISTINCT_INTERVALS_FOR_BEHIND) return;
      if (b.behindPatternDistinct !== true) return;
    } else if (b.behindPattern !== true) {
      return; // legacy fallback if the distinct-day fields are absent
    }
    out.push(_mkSignal(cid, 'BEHIND_PATTERN', {
      type: 'risk',
      severity: 'high',
      value: b.daysSinceLast,
      unit: 'days',
      reason: 'از الگوی معمول خرید مشتری عقب افتاده است',
      confidence: 0.85,
    }));
  }

  /* ---------------------------------------------------------
     5: CONSECUTIVE_NO_ORDER
     --------------------------------------------------------- */
  function _consecutiveNoOrderSignal(cid, b, out) {
    if (!(b.visitCount >= 2)) return; // false-positive rule
    if (!(b.consecutiveNoOrder >= 2)) return;
    out.push(_mkSignal(cid, 'CONSECUTIVE_NO_ORDER', {
      type: 'risk',
      severity: 'high',
      value: b.consecutiveNoOrder,
      unit: 'count',
      reason: _fa(b.consecutiveNoOrder) + ' ویزیت متوالی بدون سفارش',
      confidence: 0.9,
    }));
  }

  /* ---------------------------------------------------------
     6: BASKET_SHRINK
     --------------------------------------------------------- */
  function _basketShrinkSignal(cid, b, out, productsById, lateProductIds) {
    if (!((b.purchaseDayCount || 0) >= 4)) return;
    const declining = Array.isArray(b.decliningProductsAll) ? b.decliningProductsAll : (Array.isArray(b.decliningProducts) ? b.decliningProducts : []);
    if (!(declining.length >= 1)) return;
    // Product Analysis Group: a decline that's actually a same-group SKU
    // switch isn't a meaningful basket shrink — filter it out before counting.
    const meaningful = declining.filter(function (p) {
      return !(p && _isGroupRetained(p.productId, productsById, lateProductIds));
    });
    if (!(meaningful.length >= 1)) return;
    out.push(_mkSignal(cid, 'BASKET_SHRINK', {
      type: 'risk',
      severity: 'medium',
      value: meaningful.length,
      unit: 'count',
      reason: 'تعدادی از کالاهای سبد خرید کاهش یافته‌اند',
      confidence: 0.75,
      evidence: { decliningProductIds: meaningful.map(function (p) { return p && p.productId; }).filter(Boolean), decliningProducts: meaningful.map(function(p){ return {productId:p.productId, earlyQty:p.earlyQty, lateGrossQty:p.lateGrossQty, lateReturnQty:p.lateReturnQty, lateNetQty:p.lateNetQty, latePurchaseState:p.latePurchaseState, quantityQuality:p.quantityQuality || {status:'complete',reasons:[]} }; }) },
    }));
  }

  /* ---------------------------------------------------------
     7: KEY_PRODUCT_LOST
     Uses only fields that actually exist on decliningProducts:
     name, productId, earlyQty, lateQty (see calc.js).
     A product only "existed before" if it appears in
     decliningProducts with earlyQty > 0 (i.e. it was actually
     purchased in the earlier half of the customer's history).
     --------------------------------------------------------- */
  function _keyProductLostSignal(cid, b, out, productsById, lateProductIds) {
    const declining = Array.isArray(b.decliningProductsAll) ? b.decliningProductsAll : (Array.isArray(b.decliningProducts) ? b.decliningProducts : []);
    const lost = declining.filter(function (p) {
      // A net-zero purchase after a recorded return is not 'no purchase'.
      // Keep the decline/return evidence in customerBehavior, but do not label it lost.
      var state = p && p.latePurchaseState;
      if (!state && p) state = (Number(p.lateGrossQty) > 0 || Number(p.lateReturnQty) > 0) ? 'net_nonpositive' : 'no_purchase';
      return p && p.earlyQty >= 5 && p.lateQty === 0 && state === 'no_purchase';
    });
    if (!lost.length) return;

    // Product Analysis Group split: a "lost" SKU whose analysis group is
    // retained via a substitute SKU is not the same signal as a genuinely
    // abandoned product line — see spec §4.4. Existing earlyQty/lateQty
    // threshold above is untouched.
    const hardLost = [];
    const retainedLost = [];
    lost.forEach(function (p) {
      if (_isGroupRetained(p.productId, productsById, lateProductIds)) retainedLost.push(p);
      else hardLost.push(p);
    });

    // decliningProducts (from calc.js) doesn't carry invoice-level
    // presence counts, only aggregated early/late qty — so the
    // ">50% of prior-period invoices" importance boost described in
    // the spec cannot be computed from the data actually available.
    // Per instructions ("اگر ساختار کافی نیست، حدس نزن")، این بخش
    // پیاده‌سازی نشد و confidence بر همان مبنای earlyQty/lateQty ثابت می‌ماند.
    if (hardLost.length > 0) {
      const names = hardLost.map(function (p) { return p.name; }).filter(Boolean);
      const reason = names.length === 1
        ? 'محصول کلیدی «' + names[0] + '» دیگر خریداری نمی‌شود'
        : 'محصولات کلیدی (' + names.join('، ') + ') دیگر خریداری نمی‌شوند';

      out.push(_mkSignal(cid, 'KEY_PRODUCT_LOST', {
        type: 'risk',
        severity: 'high',
        value: hardLost.length,
        unit: 'count',
        reason: reason,
        confidence: 0.8,
        evidence: { hardLost: hardLost, retainedLost: retainedLost },
      }));
      return;
    }

    if (retainedLost.length > 0) {
      const retainedReason = retainedLost.map(function (p) {
        const prod = productsById ? productsById[p.productId] : null;
        const groupName = _analysisGroupNameById(prod ? prod.analysisGroupId : null);
        return 'محصول «' + (p.name || '') + '» دیگر خریداری نمی‌شود، اما گروه تحلیلی «'
          + (groupName || '') + '» با محصول جایگزین حفظ شده است';
      }).join(' — ');

      out.push(_mkSignal(cid, 'KEY_PRODUCT_LOST', {
        type: 'risk',
        severity: 'low',
        value: retainedLost.length,
        unit: 'count',
        reason: retainedReason,
        confidence: 0.7,
        evidence: { hardLost: hardLost, retainedLost: retainedLost },
      }));
    }
  }

  /* ---------------------------------------------------------
     8: LONG_NO_VISIT
     --------------------------------------------------------- */
  function _longNoVisitSignal(cid, b, out, ctx) {
    // Fallback only when visit cadence is unavailable.
    if (typeof visitCadence === 'function' && visitCadence(cid, ctx)) return;
    if (!b.lastVisit) return;
    if ((b.purchaseDayCount || 0) < 2) return;

    const lastVisitDate = b.lastVisit.date;
    if (!lastVisitDate) return;
    const days = (typeof analysisDaysAgo === 'function') ? analysisDaysAgo(lastVisitDate, ctx) : ((typeof daysAgo === 'function') ? daysAgo(lastVisitDate) : null);
    if (days == null || !isFinite(days)) return;
    if (days < 45) return;

    // Observational / operational — does not contribute to Account Risk by default.
    // Action engine still selects this category for visit recommendations.
    out.push(_mkSignal(cid, 'LONG_NO_VISIT', {
      type: 'opportunity',
      severity: 'medium',
      value: days,
      unit: 'days',
      reason: _fa(days) + ' روز است که مشتری ویزیت نشده است',
      confidence: 0.85,
    }));
  }

  /* ---------------------------------------------------------
     VISIT_OVERDUE — cadence-based (when cadence exists).
     Buffer = min(7, cadence * 0.5). Does not replace LONG_NO_VISIT
     fallback for customers without cadence.
     --------------------------------------------------------- */
  function _visitOverdueSignal(cid, b, out, ctx) {
    if (typeof visitCadence !== 'function') return;
    const cadence = visitCadence(cid, ctx);
    if (!cadence) return;

    let daysSince = null;
    if (b && b.lastVisit && b.lastVisit.date) {
      daysSince = (typeof analysisDaysAgo === 'function') ? analysisDaysAgo(b.lastVisit.date, ctx) : ((typeof daysAgo === 'function') ? daysAgo(b.lastVisit.date) : null);
    }
    if (daysSince == null || !isFinite(daysSince)) {
      const cust = (ctx && typeof ctx.customerById === 'function')
        ? ctx.customerById(cid)
        : (typeof data !== 'undefined' && Array.isArray(data.customers)
            ? data.customers.find(function (c) { return c && c.id === cid; })
            : null);
      if (cust) {
        const visits = (cust && Array.isArray(cust.visits)) ? cust.visits.slice() : [];
        if (visits.length) {
          visits.sort(function (a, b2) {
            return String(b2.date || '').localeCompare(String(a.date || ''));
          });
          if (visits[0] && visits[0].date) {
            daysSince = (typeof analysisDaysAgo === 'function') ? analysisDaysAgo(visits[0].date, ctx) : ((typeof daysAgo === 'function') ? daysAgo(visits[0].date) : null);
          }
        }
      }
    }
    if (daysSince == null || !isFinite(daysSince)) return;

    const buffer = Math.min(7, cadence * 0.5);
    if (daysSince <= cadence + buffer) return;

    const overdue = Math.max(0, daysSince - cadence);
    const severity = overdue > (2 * cadence) ? 'high' : 'medium';

    // Observational / operational — does not contribute to Account Risk by default.
    // Action engine still selects this category for visit recommendations.
    out.push(_mkSignal(cid, 'VISIT_OVERDUE', {
      type: 'opportunity',
      severity: severity,
      value: overdue,
      unit: 'days',
      reason: 'ویزیت ' + _fa(overdue) + ' روز از الگوی معمول عقب افتاده است',
      confidence: 0.8,
    }));
  }

  /* ---------------------------------------------------------
     VISIT_CONVERSION_LOW — low-severity; does not override stronger signals.
     visitCount >= 3 and conversionRate < 0.5
     --------------------------------------------------------- */
  function _visitConversionLowSignal(cid, b, out) {
    if (!b) return;
    if (!(b.visitCount >= 3)) return;
    if (!(typeof b.conversionRate === 'number' && b.conversionRate < 0.5)) return;
    if (out.some(function (s) { return s && s.category === 'VISIT_CONVERSION_LOW'; })) return;

    out.push(_mkSignal(cid, 'VISIT_CONVERSION_LOW', {
      type: 'risk',
      severity: 'low',
      value: _round((b.conversionRate || 0) * 100, 0),
      unit: '%',
      reason: 'ویزیت‌های اخیر به سفارش تبدیل نشده‌اند — بررسی کنید',
      confidence: 0.75,
    }));
  }

  /* ---------------------------------------------------------
     Conditional payment signals — only when data.checks exists
     and is non-empty. Uses data.checks + data.customers directly
     (as explicitly allowed by the spec), never mutated.
     --------------------------------------------------------- */
  function _paymentSignals(cid, out, ctx) {
    if (typeof data === 'undefined' || !Array.isArray(data.checks) || data.checks.length === 0) {
      return;
    }
    const today = (ctx && ctx.asOfDate) || ((typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0, 10));
    const custChecks = (typeof customerChecks === 'function')
      ? customerChecks(cid, ctx)
      : data.checks.filter(function (c) { return c && c.customerId === cid; });
    if (!custChecks.length) return;

    const bounced = custChecks.filter(function (c) { return c.status === 'bounced'; });
    if (bounced.length) {
      out.push(_mkSignal(cid, 'CHECK_BOUNCED', {
        type: 'risk',
        severity: 'critical',
        value: bounced.length,
        unit: 'count',
        reason: bounced.length === 1
          ? 'یک چک برگشتی دارد'
          : _fa(bounced.length) + ' چک برگشتی دارد',
        confidence: 0.95,
        source: 'data.checks',
      }));
    }

    const overdue = custChecks.filter(function (c) {
      return c.status === 'pending' && c.dueDate && c.dueDate < today;
    });
    if (overdue.length) {
      out.push(_mkSignal(cid, 'PAYMENT_OVERDUE', {
        type: 'risk',
        severity: 'high',
        value: overdue.length,
        unit: 'count',
        reason: overdue.length === 1
          ? 'یک چک سررسیدگذشته و وصول‌نشده دارد'
          : _fa(overdue.length) + ' چک سررسیدگذشته و وصول‌نشده دارد',
        confidence: 0.9,
        source: 'data.checks',
      }));
    }
  }

  /* ---------------------------------------------------------
     Main entry point
     --------------------------------------------------------- */
  function extractCustomerSignals(cid, ctx, skipMemo) {
    if (ctx && typeof ctx.memo === 'function' && !skipMemo) {
      return ctx.memo('customerSignals', String(cid) + '|' + String(ctx.asOfDate || ''), function () {
        return extractCustomerSignals(cid, ctx, true);
      });
    }
    const out = [];
    if (!cid) return out;
    if (typeof customerBehavior !== 'function') return out;

    const b = customerBehavior(cid, ctx);
    if (!b) return out;

    // Product Analysis Group: computed ONCE here and reused by both
    // consumer functions below — never re-scans invoice history per signal.
    const productsById = _buildProductsByIdMap();
    const lateProductIds = _getConfirmedLateProductIds(cid, ctx);

    // Signals 1-3 require at least a comparable previous-30-day baseline;
    // customerBehavior() itself returns 0 (not null) when there's no data,
    // and the false-positive rule (#10) already guards on salesPrev30 > 0.
    _purchaseTrendSignals(cid, b, out);
    _behindPatternSignal(cid, b, out);
    _consecutiveNoOrderSignal(cid, b, out);
    _basketShrinkSignal(cid, b, out, productsById, lateProductIds);
    _keyProductLostSignal(cid, b, out, productsById, lateProductIds);
    _visitOverdueSignal(cid, b, out, ctx);
    _longNoVisitSignal(cid, b, out, ctx);
    _visitConversionLowSignal(cid, b, out);

    // openingBalance is intentionally never inspected here — signals are
    // based only on actual recorded behavior (invoices/visits/checks),
    // never on the pre-existing opening balance itself (spec #7).
    _paymentSignals(cid, out, ctx);

    // ------------------------------------------------------------------
    // PATCH: Product Gap ≠ Account Risk by default.
    // KEY_PRODUCT_LOST / BASKET_SHRINK remain fully generated (reason,
    // value, category, Action visibility). They contribute to Account
    // Risk only when corroborated by at least one independent
    // account-level deterioration signal already present.
    // ------------------------------------------------------------------
    const ACCOUNT_LEVEL_CORROBORATORS = {
      PURCHASE_DECLINE_SEVERE: true,
      PURCHASE_DECLINE_MILD: true,
      BEHIND_PATTERN: true,
      CONSECUTIVE_NO_ORDER: true,
      CHECK_BOUNCED: true,
      PAYMENT_OVERDUE: true
    };
    let hasAccountLevelRisk = false;
    for (let i = 0; i < out.length; i++) {
      const s = out[i];
      if (s && s.type === 'risk' && ACCOUNT_LEVEL_CORROBORATORS[s.category]) {
        hasAccountLevelRisk = true;
        break;
      }
    }
    if (!hasAccountLevelRisk) {
      for (let i = 0; i < out.length; i++) {
        const s = out[i];
        if (s && (s.category === 'KEY_PRODUCT_LOST' || s.category === 'BASKET_SHRINK')) {
          s.type = 'opportunity';
        }
      }
    }

    // ------------------------------------------------------------------
    // Customer × SKU Intelligence V1 integration (Handoff order):
    // existing account signals → existing opportunity reclassification
    // → extractSkuSignals → merge → F4 deduplication → return
    // SKU signals must NOT pass through the reclassification patch above.
    // ------------------------------------------------------------------
    var skuSignals = [];
    if (typeof extractSkuSignals === 'function') {
      try {
        skuSignals = extractSkuSignals(cid, ctx) || [];
      } catch (eSku) {
        skuSignals = [];
      }
    }
    if (skuSignals.length) {
      for (var si = 0; si < skuSignals.length; si++) {
        if (skuSignals[si]) {
          // P-01: guarantee sourceLevel on SKU-origin signals (sku_intelligence
          // may not set it; tagging here keeps Risk dominance deterministic).
          if (!skuSignals[si].sourceLevel) {
            skuSignals[si].sourceLevel = _sourceLevelForCategory(skuSignals[si].category) || 'sku';
          }
          out.push(skuSignals[si]);
        }
      }
    }

    // ------------------------------------------------------------------
    // Family identity (runtime only): every product-level signal carries
    //   signal.familyId = analysisGroupId || productId
    // productId is preserved for display/context. familyId is never
    // persisted (it only feeds the persistence KEY string).
    // ------------------------------------------------------------------
    if (typeof resolveFamilyId === 'function') {
      for (var fmi = 0; fmi < out.length; fmi++) {
        var fs = out[fmi];
        if (!fs || fs.familyId != null) continue;
        if (fs.productId == null || fs.productId === '' || fs.productId === 'multi') continue;
        try { fs.familyId = resolveFamilyId(fs.productId, ctx); } catch (eFam) { /* fail-open */ }
      }
    }

    // ------------------------------------------------------------------
    // P-02 Persistence: record occurrence + set status pending|active.
    // Does not remove signals. Risk only scores status === 'active'.
    // ------------------------------------------------------------------
    if (typeof applyPersistence === 'function') {
      try {
        applyPersistence(out);
      } catch (ePersist) {
        // Fail-open: persistence errors must not break signal extraction.
      }
    }

    // F4 deduplication runs only after persistence has assigned pending/active.
    // Pending SKU evidence must never suppress an account-level signal.
    if (skuSignals.length) {
      try { _dedupeSkuAgainstAccountSignals(out, skuSignals, ctx); } catch (eDedup) { /* fail-open */ }
    }

    // ------------------------------------------------------------------
    // P-03 Seller Feedback: attach evidence + riskModifier when present.
    // Does not change status (P-02) or sourceLevel (P-01). No removals.
    // ------------------------------------------------------------------
    if (typeof applyFeedbackToSignals === 'function') {
      try {
        applyFeedbackToSignals(out);
      } catch (eFb) {
        // Fail-open: feedback errors must not break signal extraction.
      }
    } else if (typeof applyFeedbackToSignal === 'function') {
      try {
        for (var fi = 0; fi < out.length; fi++) applyFeedbackToSignal(out[fi]);
      } catch (eFb2) { /* fail-open */ }
    }

    // ------------------------------------------------------------------
    // P-06 Seasonality: suppress false decline signals in historical
    // low seasons. Does not change status/sourceLevel/baseline.
    // ------------------------------------------------------------------
    if (typeof adjustSignalForSeasonality === 'function') {
      try {
        for (var sei = 0; sei < out.length; sei++) {
          if (out[sei]) adjustSignalForSeasonality(out[sei], ctx);
        }
      } catch (eSea) { /* fail-open */ }
    }

    return out;
  }

  /* F4 — KEY_PRODUCT_LOST / BASKET_SHRINK deduplication against SKU signals.
     Mutates accountSignals in place; may filter skuSignals array length by
     leaving suppressed account signals removed from accountSignals. */
  function _dedupeSkuAgainstAccountSignals(accountSignals, skuSignals, ctx) {
    if (!accountSignals || !skuSignals || !skuSignals.length) return;
    // Only active, semantically equivalent SKU evidence may cover an account issue.
    // SKU_DELAY is timing-only and never proves basket shrink or product loss.
    var lineDropByProduct = Object.create(null);
    for (var i = 0; i < skuSignals.length; i++) {
      var ss = skuSignals[i];
      if (!ss || ss.status !== 'active') continue;
      if (ss.category !== 'LINE_DROP' || !ss.productId || ss.productId === 'multi') continue;
      var ev = ss.evidence || {};
      if (ev.currentBasketPresence !== 0) continue;
      lineDropByProduct[ss.productId] = true;
    }
    for (var j = accountSignals.length - 1; j >= 0; j--) {
      var sig = accountSignals[j];
      if (!sig || sig.status !== 'active') continue;
      if (sig.category === 'BASKET_SHRINK') {
        var topics = sig.evidence && Array.isArray(sig.evidence.decliningProductIds)
          ? sig.evidence.decliningProductIds.filter(Boolean) : [];
        // Basket shrink may be deduplicated only when every affected product is
        // independently confirmed absent by an active LINE_DROP for that exact SKU.
        if (topics.length && topics.every(function(pid){ return lineDropByProduct[pid] === true; })) {
          accountSignals.splice(j, 1);
        }
      } else if (sig.category === 'KEY_PRODUCT_LOST') {
        var hardLost = sig.evidence && Array.isArray(sig.evidence.hardLost) ? sig.evidence.hardLost : [];
        var remaining = hardLost.filter(function(p){ return !p || !lineDropByProduct[p.productId]; });
        if (hardLost.length && remaining.length === 0) {
          accountSignals.splice(j, 1);
        } else if (hardLost.length && remaining.length !== hardLost.length) {
          sig.evidence.hardLost = remaining;
          sig.value = remaining.length;
          var names = remaining.map(function(p){return p && p.name;}).filter(Boolean);
          if (names.length) sig.reason = names.length === 1
            ? 'محصول کلیدی «' + names[0] + '» دیگر خریداری نمی‌شود'
            : 'محصولات کلیدی (' + names.join('، ') + ') دیگر خریداری نمی‌شوند';
        }
      }
    }
  }

  global.extractCustomerSignals = extractCustomerSignals;
  // Internal deterministic test seam for post-persistence overlap handling.
  global._dedupeSkuAgainstAccountSignals = _dedupeSkuAgainstAccountSignals;

  /* ============================================================
     WATCH / EARLY WARNING LAYER (frozen spec — implementation only)
     ------------------------------------------------------------
     Independent second pipeline. Does NOT reuse Confirmed signal
     objects for detection — only raw customerBehavior()/invoice data.
     Confirmed pipeline above is completely untouched by everything
     below this line.

     Public API: extractWatchObservations(cid, confirmedSignalsOverride?)
     ============================================================ */

  var WATCH_SUPERSESSION_MAP = {
    'PURCHASE_DECLINE_WATCH': ['PURCHASE_DECLINE_SEVERE', 'PURCHASE_DECLINE_MILD'],
    'BEHIND_PATTERN_WATCH': ['BEHIND_PATTERN'],
    'BASKET_SHRINK_WATCH': ['BASKET_SHRINK'],
    'KEY_PRODUCT_LOST_WATCH': ['KEY_PRODUCT_LOST'],
    'SKU_DELAY_WATCH': ['SKU_DELAY'],
    'SKU_QUANTITY_DROP_WATCH': ['SKU_QUANTITY_DROP'],
    'SKU_FREQUENCY_DROP_WATCH': ['SKU_FREQUENCY_DROP'],
    'LINE_DROP_WATCH': ['LINE_DROP'],
    'COMBINED_SKU_WATCH': [
      'SKU_DELAY',
      'SKU_QUANTITY_DROP',
      'SKU_FREQUENCY_DROP',
      'LINE_DROP',
      'COMBINED_SKU_DETERIORATION'
    ]
  };

  /* ---------------------------------------------------------
     Raw invoice split (early half vs late half), independent of
     customerBehavior().decliningProducts. Used only by
     BASKET_SHRINK_WATCH / KEY_PRODUCT_LOST_WATCH (spec 6C/6D
     explicitly require independence from decliningProducts).
     --------------------------------------------------------- */
  function _watchProductName(pid) {
    if (typeof data === 'undefined' || !Array.isArray(data.products)) return pid || '';
    var p = data.products.find(function (x) { return x && x.id === pid; });
    return (p && p.name) ? p.name : (pid || '');
  }

  function _watchRawInvoiceSplit(cid, ctx) {
    if (typeof customerInvoices !== 'function') return null;
    var raw = customerInvoices(cid, ctx).filter(function(inv){return typeof isValidPurchaseInvoice !== 'function' || isValidPurchaseInvoice(inv);});
    var occasions = typeof groupPurchaseOccasions === 'function' ? groupPurchaseOccasions(raw) : raw.map(function(inv){return {date:inv.date,invoices:[inv]};});
    var count = occasions.length;
    if (count < 2) return null;
    var mid = Math.floor(count / 2);
    var early = occasions.slice(0,mid).reduce(function(a,g){return a.concat(g.invoices||[]);}, []);
    var late = occasions.slice(mid).reduce(function(a,g){return a.concat(g.invoices||[]);}, []);
    function qtyMap(list) {
      var map = Object.create(null);
      for (var i = 0; i < list.length; i++) {
        var items = list[i].items || [];
        for (var j = 0; j < items.length; j++) {
          var it = items[j];
          if (!it || !it.productId || !(it.qty > 0)) continue;
          if (!map[it.productId]) map[it.productId] = { productId: it.productId, name: it.name || _watchProductName(it.productId), qty: 0, grossQty: 0, returnQty: 0 };
          var ip = (data.products||[]).find(function(p){return p && p.id===it.productId;});
          var isRaisin = String(it.name||'').trim()==='کشمش پلویی' || !!(ip && String(ip.name||'').trim()==='کشمش پلویی');
          var q = isRaisin && typeof _raisinPilafPackages === 'function' ? _raisinPilafPackages(it) : it.qty;
          map[it.productId].qty += q;
          map[it.productId].grossQty += q;
        }
      }
      return map;
    }
    var earlyMap = qtyMap(early), lateMap = qtyMap(late);
    var uncertainByProduct = Object.create(null);
    var sideByInvoice = Object.create(null), invoiceById = Object.create(null);
    early.forEach(function(inv){if(inv.id){sideByInvoice[inv.id]=earlyMap;invoiceById[inv.id]=inv;}});
    late.forEach(function(inv){if(inv.id){sideByInvoice[inv.id]=lateMap;invoiceById[inv.id]=inv;}});
    var pays = typeof customerPayments === 'function' ? customerPayments(cid, ctx) : [];
    pays.forEach(function(pay){
      if(!pay || pay.method!=='return') return;
      var sourceInvoice = pay.invoiceId ? invoiceById[pay.invoiceId] : null;
      var target = pay.invoiceId ? sideByInvoice[pay.invoiceId] : null;
      (pay.returnItems||[]).forEach(function(ri){
        if(!ri || !ri.productId) return;
        var rp = (data.products||[]).find(function(p){return p && p.id===ri.productId;});
        var isRaisin = String(ri.name||'').trim()==='کشمش پلویی' || !!(rp && String(rp.name||'').trim()==='کشمش پلویی');
        var q = isRaisin && typeof _raisinPilafReturnPackages === 'function'
          ? _raisinPilafReturnPackages(ri, pay, sourceInvoice) : (sourceInvoice ? (ri.qty||0) : null);
        if(!target || q == null) {
          if(!uncertainByProduct[ri.productId]) uncertainByProduct[ri.productId] = [];
          uncertainByProduct[ri.productId].push({paymentId:pay.id||null,invoiceId:pay.invoiceId||null,reason:!target?'unlinked_or_missing_source_invoice':'ambiguous_unit_conversion'});
          return;
        }
        if(!target[ri.productId]) target[ri.productId] = {productId:ri.productId,name:ri.name||_watchProductName(ri.productId),qty:0,grossQty:0,returnQty:0};
        target[ri.productId].qty -= q;
        target[ri.productId].returnQty += q;
      });
    });
    return { purchaseDayCount: count, early: earlyMap, late: lateMap, uncertainByProduct: uncertainByProduct };
  }

  function _mkWatch(cid, category, opts) {
    return {
      customerId: cid,
      productId: opts.productId != null ? opts.productId : null,
      productName: opts.productName != null ? opts.productName : null,
      category: category,
      level: opts.level,
      reason: opts.reason,
      deviationStrength: opts.deviationStrength,
      source: opts.source,
      watchComponents: opts.watchComponents || null,
      evidence: opts.evidence || null
    };
  }

  /* A) PURCHASE_DECLINE_WATCH — raw sales30 vs salesPrev30, independent
     of PURCHASE_DECLINE_MILD/SEVERE thresholds (spec 6A). */
  function _purchaseDeclineWatch(cid, b, out) {
    if (!(b.salesPrev30 > 0)) return;
    var declinePct = ((b.salesPrev30 - b.sales30) / b.salesPrev30) * 100;
    if (!(declinePct >= 15)) return;
    var level = declinePct >= 25 ? 'high' : (declinePct >= 20 ? 'medium' : 'low');
    out.push(_mkWatch(cid, 'PURCHASE_DECLINE_WATCH', {
      level: level,
      reason: 'نشانه‌های زودهنگام کاهش خرید (حدود ' + _fa(declinePct) + '٪) مشاهده می‌شود',
      deviationStrength: Math.min(1, declinePct / 30),
      source: 'account',
      evidence: { salesPrevious30: b.salesPrev30, salesRecent30: b.sales30, declinePercent: declinePct, comparison: '۳۰ روز قبل در برابر ۳۰ روز اخیر' }
    }));
  }

  /* B) BEHIND_PATTERN_WATCH — daysSinceLast / avgIntervalDays (spec 6B). */
  function _behindPatternWatch(cid, b, out) {
    if (!(b.avgIntervalDays > 0) || b.daysSinceLast == null) return;
    var ratio = b.daysSinceLast / b.avgIntervalDays;
    if (!(ratio >= 0.80)) return;
    var level = ratio >= 0.95 ? 'high' : (ratio >= 0.90 ? 'medium' : 'low');
    out.push(_mkWatch(cid, 'BEHIND_PATTERN_WATCH', {
      level: level,
      reason: 'مشتری در حال نزدیک‌شدن به عقب‌افتادن از الگوی معمول خرید است',
      deviationStrength: Math.min(1, ratio),
      source: 'account',
      evidence: { daysSinceLast: b.daysSinceLast, averageIntervalDays: b.avgIntervalDays, ratio: ratio, comparison: 'فاصله فعلی از خرید در برابر فاصله معمول خرید' }
    }));
  }

  /* C) BASKET_SHRINK_WATCH — raw purchase-day split, independent of
     customerBehavior().decliningProducts (spec 6C).
     ASSUMPTION (spec gives no level bands for this rule — reported in
     the implementation report, not guessed silently): level is 'medium'
     when >=2 products show a meaningful decline, otherwise 'low'.
     "Meaningful decline" per product: earlyQty >= 2 and lateQty <= earlyQty*0.5
     — chosen independently of calc.js's decliningProducts thresholds
     (which require four purchase days, earlyQty>=2, lateQty<earlyQty*0.6). */
  function _basketShrinkWatch(cid, out, ctx, productsById, lateProductIds) {
    var split = _watchRawInvoiceSplit(cid, ctx);
    if (!split) return;
    var earlyKeys = Object.keys(split.early);
    var decliningCount = 0;
    for (var i = 0; i < earlyKeys.length; i++) {
      var pid = earlyKeys[i];
      var e = split.early[pid];
      var l = split.late[pid];
      var lateQty = l ? l.qty : 0;
      if (e.qty >= 2 && lateQty <= e.qty * 0.5) {
        // Product Analysis Group: a same-group substitute means this SKU's
        // decline is not a "hard" decline — don't count it (spec §4.7).
        if (_isGroupRetained(pid, productsById, lateProductIds)) continue;
        decliningCount++;
      }
    }
    if (decliningCount < 1) return;
    var level = decliningCount >= 2 ? 'medium' : 'low';
    var affected = [];
    for (var ai = 0; ai < earlyKeys.length; ai++) {
      var apid = earlyKeys[ai];
      var ae = split.early[apid];
      var al = split.late[apid];
      var aq = al ? al.qty : 0;
      if (!(ae.qty >= 2 && aq <= ae.qty * 0.5)) continue;
      if (_isGroupRetained(apid, productsById, lateProductIds)) continue;
      affected.push({ productId: apid, productName: ae.name || _watchProductName(apid), earlyQty: ae.qty, lateQty: aq, earlyGrossQty: ae.grossQty||0, lateGrossQty: (al && al.grossQty)||0, lateReturnQty: (al && al.returnQty)||0, lateNetQty: aq, latePurchaseState: (split.uncertainByProduct && split.uncertainByProduct[apid]) ? 'uncertain' : ((al && ((al.grossQty||0)>0 || (al.returnQty||0)>0)) ? (aq<=0?'net_nonpositive':'net_positive') : 'no_purchase'), quantityQuality: (split.uncertainByProduct && split.uncertainByProduct[apid]) ? 'uncertain' : 'known', quantityQualityReasons: (split.uncertainByProduct && split.uncertainByProduct[apid]) || [] });
    }
    out.push(_mkWatch(cid, 'BASKET_SHRINK_WATCH', {
      level: level,
      reason: 'افت مقدار کالاهای مشخص بین نیمه اول و نیمه دوم روزهای خرید مشاهده می‌شود',
      deviationStrength: Math.min(1, decliningCount / 2),
      source: 'account',
      evidence: {
        comparison: 'نیمه اول روزهای خرید در برابر نیمه دوم روزهای خرید',
        purchaseDayCount: split.purchaseDayCount,
        earlyPurchaseDayCount: Math.floor(split.purchaseDayCount / 2),
        latePurchaseDayCount: split.purchaseDayCount - Math.floor(split.purchaseDayCount / 2),
        affectedProducts: affected
      }
    }));
  }

  /* D) KEY_PRODUCT_LOST_WATCH — raw purchase-day split-history, independent of
     customerBehavior().decliningProducts (spec 6D). Exact thresholds
     given by spec: earlyQty >= 3, lateQty === 0.
     ASSUMPTION (spec gives no level bands for this rule — reported,
     not guessed silently): same medium/low convention as 6C above. */
  function _keyProductLostWatch(cid, out, ctx, productsById, lateProductIds) {
    var split = _watchRawInvoiceSplit(cid, ctx);
    if (!split) return;
    var earlyKeys = Object.keys(split.early);
    var lostCount = 0;
    for (var i = 0; i < earlyKeys.length; i++) {
      var pid = earlyKeys[i];
      var e = split.early[pid];
      var l = split.late[pid];
      var lateQty = l ? l.qty : 0;
      if (e.qty >= 3 && lateQty === 0 && !((l && (l.grossQty > 0 || l.returnQty > 0))) && !(split.uncertainByProduct && split.uncertainByProduct[pid])) {
        // Product Analysis Group: retained-by-group SKU never becomes a
        // hard-lost Watch item (spec §4.6). Watch lifecycle untouched otherwise.
        if (_isGroupRetained(pid, productsById, lateProductIds)) continue;
        lostCount++;
      }
    }
    if (lostCount < 1) return;
    var level = lostCount >= 2 ? 'medium' : 'low';
    var lostProducts = [];
    for (var li = 0; li < earlyKeys.length; li++) {
      var lpid = earlyKeys[li];
      var le = split.early[lpid];
      var ll = split.late[lpid];
      var lq = ll ? ll.qty : 0;
      if (!(le.qty >= 3 && lq === 0 && !((ll && (ll.grossQty > 0 || ll.returnQty > 0))) && !(split.uncertainByProduct && split.uncertainByProduct[lpid]))) continue;
      if (_isGroupRetained(lpid, productsById, lateProductIds)) continue;
      lostProducts.push({ productId: lpid, productName: le.name || _watchProductName(lpid), earlyQty: le.qty, lateQty: lq, earlyGrossQty: le.grossQty||0, lateGrossQty: (ll && ll.grossQty)||0, lateReturnQty: (ll && ll.returnQty)||0, lateNetQty: lq, latePurchaseState: ((ll && ((ll.grossQty||0)>0 || (ll.returnQty||0)>0)) ? (lq<=0?'net_nonpositive':'net_positive') : 'no_purchase'), quantityQuality: 'known' });
    }
    out.push(_mkWatch(cid, 'KEY_PRODUCT_LOST_WATCH', {
      level: level,
      reason: 'توقف زودهنگام خرید یک یا چند محصول کلیدی مشاهده می‌شود',
      deviationStrength: Math.min(1, lostCount / 2),
      source: 'account',
      evidence: {
        comparison: 'نیمه اول روزهای خرید در برابر نیمه دوم روزهای خرید',
        purchaseDayCount: split.purchaseDayCount,
        earlyPurchaseDayCount: Math.floor(split.purchaseDayCount / 2),
        latePurchaseDayCount: split.purchaseDayCount - Math.floor(split.purchaseDayCount / 2),
        lostProducts: lostProducts
      }
    }));
  }

  /* Suppression (spec 11/12): a Watch is suppressed only when a mapped
     Confirmed signal with the SAME customerId+productId identity has
     status === 'active'. Pending Confirmed never suppresses a Watch. */
  function _isWatchSuppressedByConfirmed(watch, confirmedSignals) {
    var superseded = WATCH_SUPERSESSION_MAP[watch.category];
    if (!superseded || !superseded.length || !confirmedSignals || !confirmedSignals.length) return false;
    // Identity = customerId + FAMILY (analysisGroupId||productId, runtime).
    // For products without a group this equals the legacy productId match.
    function _wid(pid, fid) {
      if (pid == null || pid === '' || pid === 'multi') return null;
      if (fid != null && fid !== '') return fid;
      return (typeof resolveFamilyId === 'function') ? resolveFamilyId(pid) : pid;
    }
    var wantPid = _wid(watch.productId, watch.familyId);
    for (var i = 0; i < confirmedSignals.length; i++) {
      var s = confirmedSignals[i];
      if (!s || s.status !== 'active') continue;
      if (superseded.indexOf(s.category) === -1) continue;
      var sPid = _wid(s.productId, s.familyId);
      if (sPid === wantPid) return true;
    }
    return false;
  }

  /* Memo signature of a confirmed-signals override: exactly the fields that
     _isWatchSuppressedByConfirmed reads (status === 'active', a category listed
     in WATCH_SUPERSESSION_MAP, productId, familyId). Overrides that suppress the
     same set of watches share a slot; different ones never do. */
  function _watchOverrideSignature(list) {
    var relevant = Object.create(null);
    var mapKeys = Object.keys(WATCH_SUPERSESSION_MAP);
    for (var i = 0; i < mapKeys.length; i++) {
      var cats = WATCH_SUPERSESSION_MAP[mapKeys[i]];
      for (var j = 0; j < cats.length; j++) relevant[cats[j]] = true;
    }
    var parts = [];
    for (var k = 0; k < list.length; k++) {
      var s = list[k];
      if (!s || s.status !== 'active' || !relevant[s.category]) continue;
      parts.push([s.category, s.productId == null ? '' : s.productId, s.familyId == null ? '' : s.familyId]);
    }
    parts.sort(function (a, b) { return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1; });
    return JSON.stringify(parts);
  }

  /* Main Watch entry point (spec 4/5).
     confirmedSignalsOverride: optional — lets a caller that already
     computed extractCustomerSignals(cid) this render cycle (e.g.
     customer.js, which must call both per spec §15) pass it in to
     avoid a redundant recomputation. When omitted, computed internally. */
  function extractWatchObservations(cid, confirmedSignalsOverride, ctx, skipMemo) {
    if (ctx && typeof ctx.memo === 'function' && !skipMemo) {
      // The optional confirmedSignalsOverride is part of the function input.
      // Keep override and self-computed results in separate memo slots so a
      // prior call cannot silently satisfy a later call with a different
      // input shape.
      // For an array override the slot is keyed by the CONTENT that actually
      // drives suppression (see _watchOverrideSignature), so [] (raw) and a
      // real confirmed list can never share a result.
      var watchMemoKey = String(cid) + ':' + (Array.isArray(confirmedSignalsOverride)
        ? 'override:' + _watchOverrideSignature(confirmedSignalsOverride)
        : 'self');
      return ctx.memo('watchObservations', watchMemoKey, function () {
        return extractWatchObservations(cid, confirmedSignalsOverride, ctx, true);
      });
    }
    var out = [];
    if (!cid) return out;
    if (typeof customerBehavior !== 'function') return out;
    var b = customerBehavior(cid, ctx);
    if (!b) return out;

    // Product Analysis Group: computed ONCE here and reused by both
    // consumer Watch functions below — never re-scans invoice history per Watch.
    var productsById = _buildProductsByIdMap();
    var lateProductIds = _getConfirmedLateProductIds(cid, ctx);

    _purchaseDeclineWatch(cid, b, out);
    _behindPatternWatch(cid, b, out);
    _basketShrinkWatch(cid, out, ctx, productsById, lateProductIds);
    _keyProductLostWatch(cid, out, ctx, productsById, lateProductIds);

    if (typeof extractSkuWatchObservations === 'function') {
      try {
        var skuW = extractSkuWatchObservations(cid, ctx) || [];
        for (var i = 0; i < skuW.length; i++) {
          if (skuW[i]) out.push(skuW[i]);
        }
      } catch (eSkuW) { /* fail-open: Watch errors must never break the page */ }
    }

    var confirmed;
    if (Array.isArray(confirmedSignalsOverride)) {
      confirmed = confirmedSignalsOverride;
    } else {
      confirmed = [];
      if (typeof extractCustomerSignals === 'function') {
        try { confirmed = extractCustomerSignals(cid, ctx) || []; } catch (eConf) { confirmed = []; }
      }
    }

    var visible = [];
    for (var j = 0; j < out.length; j++) {
      if (out[j] && !_isWatchSuppressedByConfirmed(out[j], confirmed)) visible.push(out[j]);
    }
    return visible;
  }

  global.extractWatchObservations = extractWatchObservations;
  global.WATCH_SUPERSESSION_MAP = WATCH_SUPERSESSION_MAP;

})(typeof window !== 'undefined' ? window : this);
