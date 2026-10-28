/* js/views/dashboard.js — Daily Command Center
   UI/derived metrics only. Existing accounting logic remains authoritative.
*/
'use strict';

(function (global) {
  const ICON_MAP = { invoice:'invoice', users:'users', box:'cube', card:'creditcard', truck:'truck', bank:'bank', visit:'visit', chart:'chartBar', gear:'cog', warehouse:'warehouse', shop:'buildingStorefront', target:'target', growth:'growth', game:'trophy', actions:'checklist', summary:'chartDoc', quick:'plusCircle', invoiceSection:'invoice', visitSection:'visit' };
  const URGENCY_ICON_MAP = { critical:'urgencyCritical', high:'urgencyHigh', medium:'urgencyMedium', low:'urgencyLow' };
  function dashboardIcon(key, size) { var name=ICON_MAP[key]||key; return (typeof AppIcons!=='undefined' && AppIcons.render) ? AppIcons.render(name,{size:size||20}) : ''; }
  function urgencyIcon(level) { return dashboardIcon(URGENCY_ICON_MAP[level]||URGENCY_ICON_MAP.low,20); }

  /* v2 presentation helpers — section heads are plain iOS-style titles (no icons).
     Signature kept (ico is accepted but unused) so every caller stays valid. */
  function dashSectionHead(ico, title, href, action, badge) {
    return '<div class="dx-head"><h2 class="dx-title">' + title + (badge || '') + '</h2>' +
      (href ? '<a class="dx-link" href="' + href + '">' + action + '</a>' : '') + '</div>';
  }

  function normalizeDigits(v) {
    return String(v || '').replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); }).replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  }

  function money(v) { return toman(Math.round(Number(v) || 0)) + ' ت'; }

  function deltaHtml(pct) {
    if (pct === null || pct === undefined || !isFinite(pct)) return '<span class="kpi-delta flat">بدون مقایسه</span>';
    const n = Math.round(pct * 10) / 10;
    if (n > 0) return '<span class="kpi-delta up">↑ ' + esc(String(n).replace('-', '')) + '٪</span> <span>نسبت به بازه مشابه</span>';
    if (n < 0) return '<span class="kpi-delta down">↓ ' + esc(String(Math.abs(n))) + '٪</span> <span>نسبت به بازه مشابه</span>';
    return '<span class="kpi-delta flat">۰٪</span> <span>بدون تغییر</span>';
  }

  function dashTile(href, ico, title, sub) {
    return '<a class="dash-tile" href="' + href + '"><span class="dash-ico">' + ico + '</span><span class="dash-title">' + title + '</span>' + (sub ? '<span class="dash-sub">' + sub + '</span>' : '') + '</a>';
  }

  /* Quick Actions: opens a tiny customer picker, then delegates to the existing
     global add-* functions (openAddInvoice/openAddTransaction/openAddVisit).
     No new business logic — same pattern as invoices.js's openNewInvoicePicker. */
  function quickActionPickCustomer(title, fn) {
    if (!data.customers || !data.customers.length) {
      if (typeof openSheet === 'function') {
        openSheet('<h3>مشتری ندارید</h3><div class="empty">اول از بخش مشتریان، یک مشتری ثبت کنید.</div>' +
          '<div class="btn-row"><a class="btn secondary" href="#/customers">رفتن به مشتریان</a></div>');
      }
      return;
    }
    const opts = data.customers.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', 'fa'); })
      .map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    openSheet(
      '<h3>' + esc(title) + '</h3>' +
      '<div class="field"><label>مشتری</label><select id="qa-pick-customer">' + opts + '</select></div>' +
      '<div class="btn-row"><button class="btn" id="qa-pick-go">ادامه</button></div>'
    );
    const goBtn = document.getElementById('qa-pick-go');
    if (goBtn) goBtn.onclick = function () {
      const cid = document.getElementById('qa-pick-customer').value;
      closeModal();
      if (typeof fn === 'function') fn(cid);
    };
  }

  function quickActionsHtml() {
    function qaIco(name) { return dashboardIcon(name, 22); }
    return '<section class="dx-section dash-quick-actions-block">' +
      dashSectionHead('', 'اقدام سریع', '#/game', 'بازی فروش') +
      '<div class="dx-qa dash-quick-actions">' +
        '<button type="button" class="dx-qa-btn" data-qa="invoice"><span class="dx-qa-ico" aria-hidden="true">' + qaIco('invoice') + '</span><span class="dx-qa-label">فاکتور جدید</span></button>' +
        '<button type="button" class="dx-qa-btn" data-qa="payment"><span class="dx-qa-ico" aria-hidden="true">' + qaIco('card') + '</span><span class="dx-qa-label">ثبت دریافت</span></button>' +
        '<button type="button" class="dx-qa-btn" data-qa="visit"><span class="dx-qa-ico" aria-hidden="true">' + qaIco('visit') + '</span><span class="dx-qa-label">ثبت ویزیت</span></button>' +
        '<a class="dx-qa-btn" href="#/evaluation"><span class="dx-qa-ico" aria-hidden="true">' + qaIco('shop') + '</span><span class="dx-qa-label">ارزیابی مغازه</span></a>' +
      '</div>' +
    '</section>';
  }

  function bindQuickActions(root) {
    const wrap = root.querySelector('.dx-qa');
    if (!wrap) return;
    wrap.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-qa]');
      if (!btn) return;
      const kind = btn.getAttribute('data-qa');
      if (kind === 'invoice') quickActionPickCustomer('فاکتور جدید — انتخاب مشتری', function (cid) { if (typeof openAddInvoice === 'function') openAddInvoice(cid); });
      else if (kind === 'payment') quickActionPickCustomer('ثبت دریافت — انتخاب مشتری', function (cid) { if (typeof openAddTransaction === 'function') openAddTransaction(cid); });
      else if (kind === 'visit') quickActionPickCustomer('ثبت ویزیت — انتخاب مشتری', function (cid) { if (typeof openAddVisit === 'function') openAddVisit(cid); });
    });
  }


  /* «کارهای پیشنهادی امروز» — pure UI read of the existing Action Engine.
     No decision logic here: sorting, urgency, action text and reason all
     come from calculateAllCustomerActions() as-is. This function only
     looks up the customer's name (read-only) and renders the existing
     dashboard-block/ledger-row markup used elsewhere on this page. */
  function todaysActionsHtml(ctx) {
    // Prefer unified queue; fall back to legacy customer-only actions.
    let items = [];
    try {
      if (typeof calculateAllActions === 'function') {
        items = (calculateAllActions(ctx) || []).filter(function (a) {
          return a && a.actionType !== 'no_action';
        });
      } else if (typeof calculateAllCustomerActions === 'function') {
        items = (calculateAllCustomerActions(ctx) || []).filter(function (a) {
          return a && a.actionType !== 'no_action';
        });
      }
    } catch (e) { return ''; }
    if (!items.length) {
      return '<section class="dx-section">' +
        dashSectionHead('', 'کارهای پیشنهادی امروز', '', '') +
        '<div class="dx-card dx-empty">' +
          '<strong>امروز کار ضروری نداری</strong>' +
          '<span>وضعیت مشتری‌ها و پتانسیل‌ها تحت کنترل است.</span>' +
        '</div></section>';
    }

    // Max Top 5 by unifiedScore (already sorted by calculateAllActions)
    items = items.slice(0, 5);

    const visibleItems = items.slice(0, 3);
    const hiddenItems = items.slice(3);

    function renderRow(a) {
      const isProspect = a.type === 'prospect';
      const name = a.name || (function () {
        if (a.customerId && typeof data !== 'undefined') {
          const cust = (data.customers || []).find(function (c) { return c.id === a.customerId; });
          return cust ? cust.name : '—';
        }
        return '—';
      })();
      const badge = isProspect ? 'پتانسیل' : 'مشتری';
      const urgency = a.urgency || 'low';
      const icon = urgencyIcon(urgency);
      const actionText = a.action || '';
      const why = a.reason || '';
      const whyNow = a.whyNow || '';
      const href = isProspect
        ? ('#/prospect?id=' + encodeURIComponent(a.prospectId || ''))
        : ('#/customer?id=' + encodeURIComponent(a.customerId || ''));
      return '<a class="dx-row dx-act dx-act-' + esc(urgency) + '" href="' + href + '">' +
        '<span class="dx-act-ico" aria-label="اولویت ' + esc(urgency) + '">' + icon + '</span>' +
        '<span class="dx-act-body">' +
          '<span class="dx-act-head"><span class="dx-act-name">' + esc(name) + '</span><span class="dx-chip">' + esc(badge) + '</span></span>' +
          (actionText ? '<span class="dx-act-main">' + esc(actionText) + '</span>' : '') +
          (why ? '<span class="dx-act-why"><span class="dx-act-key">چرا:</span> ' + esc(why) + '</span>' : '') +
          (whyNow ? '<span class="dx-act-now"><span class="dx-act-key">الان:</span> ' + esc(whyNow) + '</span>' : '') +
        '</span>' +
        '<span class="dx-chev" aria-hidden="true"></span>' +
      '</a>';
    }

    const visibleRows = visibleItems.map(renderRow).join('');
    let hiddenBlock = '';
    if (hiddenItems.length) {
      const hiddenRows = hiddenItems.map(renderRow).join('');
      hiddenBlock =
        '<div class="dx-act-more" data-action-more hidden>' + hiddenRows + '</div>' +
        '<button type="button" class="dx-toggle" data-action-toggle aria-expanded="false">' +
          '<span data-action-toggle-label>نمایش ' + enToFaDigits(String(hiddenItems.length)) + ' کار دیگر</span>' +
          '<span class="dx-toggle-ico" aria-hidden="true"></span>' +
        '</button>';
    }

    const riskCount = items.filter(function (a) {
      return a && (a.urgency === 'critical' || a.urgency === 'high');
    }).length;
    const riskBadge = riskCount > 0
      ? '<span class="dx-badge" title="تعداد موارد بحرانی/پراهمیت در همین لیست">' + riskCount + ' مورد مهم</span>'
      : '';

    return '<section class="dx-section">' + dashSectionHead('', 'کارهای پیشنهادی امروز', '', '', riskBadge) + '<div class="dx-card dx-list dx-act-list">' + visibleRows + hiddenBlock + '</div></section>';
  }

  /* Toggles the collapsed remainder of the Action Queue (items 3-5).
     Presentation-only: does not alter which actions exist, their order, or count. */
  function bindActionQueueToggle(root) {
    const btn = root.querySelector('[data-action-toggle]');
    const more = root.querySelector('[data-action-more]');
    const label = root.querySelector('[data-action-toggle-label]');
    if (!btn || !more) return;
    const hiddenCount = more.querySelectorAll('.dx-act').length;
    btn.addEventListener('click', function () {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        more.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-open');
        if (label) label.textContent = 'نمایش ' + hiddenCount + ' کار دیگر';
      } else {
        more.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('is-open');
        if (label) label.textContent = 'نمایش کمتر';
      }
    });
  }

  /* --- Watch / Early Warning + Lifecycle (additive) ---
     Generation still comes from extractWatchObservations via
     reconcileWatchLifecycle. The Dashboard no longer lists individual
     Watch rows here — it shows one compact summary card that links to
     the full Watch List (#/watches). Per-occurrence rendering now lives
     in js/views/watches.js (WatchesView / WatchDetailView), which reads
     the same existing public Watch API used below. */
  function faDigits(n) {
    return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  function watchSummaryHtml(ctx) {
    var rows = [];
    try { rows = typeof getActiveWatchOccurrences === 'function' ? (getActiveWatchOccurrences() || []) : []; } catch (e) { rows = []; }
    if (!rows.length) return '';
    rows = rows.slice().sort(function (a, b) {
      var rank = { critical: 4, high: 3, medium: 2, low: 1 };
      return (rank[b.level || b.severity] || 0) - (rank[a.level || a.severity] || 0) || String(b.lastEvaluatedAt || '').localeCompare(String(a.lastEvaluatedAt || ''));
    }).slice(0, 2);
    var total = 0;
    try { var sum = typeof getWatchLifecycleSummary === 'function' ? getWatchLifecycleSummary() : null; total = sum && Number.isFinite(sum.active) ? sum.active : rows.length; } catch (e2) { total = rows.length; }
    function label(o) {
      var product = o && o.productName;
      if (!product && o && o.productId && Array.isArray(data.products)) {
        var p = data.products.find(function (x) { return x && x.id === o.productId; });
        product = p && p.name;
      }
      if (product) return product;
      if (o && o.watchCategory && global.BagheriPresent && global.BagheriPresent.watchLabel) {
        try { return global.BagheriPresent.watchLabel(o.watchCategory); } catch (e) {}
      }
      return 'هشدار نیازمند بررسی';
    }
    function body(o) {
      if (global.BagheriPresent && global.BagheriPresent.watchSentence) {
        try { return global.BagheriPresent.watchSentence(o) || ''; } catch (e) {}
      }
      return (o && o.generatedReason) || 'یک نشانه در رفتار خرید این مشتری دیده شده است.';
    }
    var cards = rows.map(function (o) {
      var cid = o.customerId || '';
      var customer = (data.customers || []).find(function (c) { return c.id === cid; });
      var sev = o.severity || o.level || 'medium';
      var sevKey = (sev === 'critical' || sev === 'high' || sev === 'medium') ? sev : 'low';
      var sevLabel = sev === 'critical' ? 'فوری' : sev === 'high' ? 'زیاد' : sev === 'medium' ? 'متوسط' : 'کم';
      return '<a class="dx-row dx-watch" href="#/watch?id=' + encodeURIComponent(o.id || '') + '">' +
        '<span class="dx-watch-body">' +
          '<span class="dx-watch-title">' + (customer ? '<strong>' + esc(customer.name) + '</strong><span class="dx-dot-sep" aria-hidden="true"></span>' : '') + '<span>' + esc(label(o)) + '</span></span>' +
          '<span class="dx-watch-reason">' + esc(body(o)) + '</span>' +
        '</span>' +
        '<span class="dx-sev dx-sev-' + sevKey + '">' + esc(sevLabel) + '</span>' +
      '</a>';
    }).join('');
    return '<section class="dx-section">' +
      dashSectionHead('', 'هشدارهای زودهنگام', '#/watches', 'همه ' + faDigits(total) + ' مورد') +
      '<div class="dx-card dx-list">' + cards + '</div>' +
      '</section>';
  }

  function dashboardAlertBar(ctx) {
    var att = { count: 0, totalBalance: 0, rows: [] };
    var overdueChecks = [];
    var dueSoonChecks = [];
    var followups = 0, lowStock = 0;

    try {
      if (ctx && typeof ctx.receivableAttention === 'function') {
        att = ctx.receivableAttention();
      }
    } catch (e1) {}

    try {
      var todayMs = new Date(todayISO() + 'T00:00:00').getTime();
      var allChecks = (typeof data !== 'undefined' && Array.isArray(data.checks)) ? data.checks : [];
      allChecks.forEach(function (c) {
        if (!c || !c.dueDate) return;
        // همان تعریف checkStatusLabel در checks.js: فقط 'cleared' نادیده گرفته می‌شود
        if (c.status === 'cleared') return;

        var dueMs = new Date(c.dueDate + 'T00:00:00').getTime();
        if (!isFinite(dueMs)) return;

        var diffDays = Math.round((dueMs - todayMs) / 86400000);

        if (diffDays < 0) overdueChecks.push(c);
        else if (diffDays <= 3) dueSoonChecks.push(c);
      });
    } catch (e2) {}

    // موارد قبلی نوار (حفظ شده تا رگرسیون ایجاد نشود)
    try {
      followups = typeof getPendingWatchFollowUps === 'function'
        ? (getPendingWatchFollowUps() || []).filter(function (o) {
            // همان قاعده‌ی صفحه‌ی هشدارها: مشتری غیرفعال شمرده نمی‌شود
            var cu = (data.customers || []).find(function (x) { return x && x.id === o.customerId; });
            return !!cu && cu.active !== false;
          }).length
        : 0;
    } catch (e3) {}
    try { lowStock = typeof lowStockProducts === 'function' ? (lowStockProducts() || []).length : 0; } catch (e4) {}

    if (!(att.count || overdueChecks.length || dueSoonChecks.length || followups || lowStock)) return '';

    /* هر مورد یک ردیف کامل (iOS list row): عدد، عنوان، توضیح/مقدار و فلش. */
    function row(href, count, label, meta, extraAttr) {
      return '<a class="dx-row dx-att" href="' + href + '"' + (extraAttr || '') + '>' +
        '<span class="dx-att-count">' + faDigits(count) + '</span>' +
        '<span class="dx-att-text">' + label + '</span>' +
        (meta ? '<span class="dx-att-meta">' + meta + '</span>' : '') +
        '<span class="dx-chev" aria-hidden="true"></span>' +
      '</a>';
    }

    var bits = [];
    if (att.count > 0) bits.push(row('#', att.count, 'مشتری نیازمند پیگیری', money(att.totalBalance), ' data-attention="1"'));
    if (overdueChecks.length > 0) bits.push(row('#/checks?filter=overdue', overdueChecks.length, 'چک سررسیدگذشته'));
    if (dueSoonChecks.length > 0) bits.push(row('#/checks?filter=dueSoon', dueSoonChecks.length, 'چک نزدیک سررسید'));
    if (followups) bits.push(row('#/watches?filter=followup', followups, 'پیگیری‌های باز'));
    if (lowStock) bits.push(row('#/inventory', lowStock, 'کالای کم‌موجودی'));

    return '<section class="dx-section" role="status">' +
      '<div class="dx-head"><h2 class="dx-title"><span class="dx-alert-dot" aria-hidden="true"></span>نیازمند رسیدگی</h2></div>' +
      '<div class="dx-card dx-list">' + bits.join('') + '</div>' +
    '</section>';
  }

  function openAttentionSheet(ctx) {
    var att = { count: 0, rows: [] };
    try {
      if (ctx && typeof ctx.receivableAttention === 'function') {
        att = ctx.receivableAttention();
      }
    } catch (e) {}
    if (!att.rows.length) return;

    var rowsHtml = att.rows.map(function (r) {
      var line = receivableAttentionDesc(r);   // one wording shared with Customer Detail / Quick View
      if (r.legacyBalance > 0) line += ' · بدهی قدیمی جدا: ' + money(r.legacyBalance);
      return '<button type="button" class="bp-attention-row" data-attention-cid="' + esc(r.customerId) + '">' +
        '<span class="bp-attention-row-name">' + esc(r.name) + '</span>' +
        '<span class="bp-attention-row-meta">' + money(r.balance) + ' · ' + line + '</span>' +
      '</button>';
    }).join('');

    openSheet(
      '<h3>مشتریان نیازمند پیگیری</h3>' +
      '<div class="empty" style="padding:0 0 10px;text-align:right;font-size:.78rem;">' +
        faDigits(att.count) + ' مشتری با مانده حداقل ۱۰ میلیون تومان و نیازمند بررسی پرداخت' +
      '</div>' +
      '<div class="bp-attention-list">' + rowsHtml + '</div>'
    );

    var root = document.getElementById('modalRoot');
    if (!root) return;
    root.querySelectorAll('[data-attention-cid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cid = btn.getAttribute('data-attention-cid');
        try {
          if (typeof closeModal === 'function') closeModal();
        } catch (e) {}
        setTimeout(function () {
          if (typeof openCustomerQuickView === 'function') {
            openCustomerQuickView(cid);
          }
        }, 330);
      });
    });
  }

  function bindAttentionLink(root, ctx) {
    var attLink = root.querySelector('[data-attention]');
    if (!attLink) return;
    attLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof openAttentionSheet === 'function') openAttentionSheet(ctx);
    });
  }

  function todaySnapshotHtml(ctx) {
    var now = new Date();
    var sales = 0, invoices = 0, received = 0, visits = 0;
    try {
      var invs = data.invoices || [];
      invs.forEach(function (i) { if (typeof isSameDay === 'function' && isSameDay(i.date, now)) { sales += Number(i.total) || 0; invoices++; } });
      (data.payments || []).forEach(function (p) { if (typeof isSameDay === 'function' && isSameDay(p.date, now) && ['cash','card','transfer'].indexOf(p.method) !== -1) received += Number(p.amount) || 0; });
      (data.customers || []).forEach(function (c) { (c.visits || []).forEach(function (v) { if (typeof isSameDay === 'function' && isSameDay(v.date, now)) visits++; }); });
    } catch (e) {}
    /* Compact amounts for the tiles only (display formatting, same numbers):
       ≥ 1B → «میلیارد», ≥ 1M → «میلیون», ≥ 10K → «هزار». Exact value stays in title/aria-label. */
    function tileMoney(v) {
      var n = Math.round(Number(v) || 0);
      var abs = Math.abs(n);
      function f(x) { return x.toLocaleString('fa-IR', { maximumFractionDigits: 1 }); }
      if (abs >= 1e9) return { num: f(n / 1e9), unit: 'میلیارد ت', full: money(n) };
      if (abs >= 1e6) return { num: f(n / 1e6), unit: 'میلیون ت', full: money(n) };
      if (abs >= 1e4) return { num: f(n / 1e3), unit: 'هزار ت', full: money(n) };
      return { num: toman(n), unit: 'ت', full: money(n) };
    }
    function tile(tone, label, num, unit, sub, full) {
      return '<div class="dx-kpi dx-kpi-' + tone + '"' + (full ? ' title="' + esc(full) + '" aria-label="' + esc(label + ': ' + full) + '"' : '') + '>' +
        '<span class="dx-kpi-label">' + label + '</span>' +
        '<span class="dx-kpi-value"><strong>' + num + '</strong>' + (unit ? '<small>' + unit + '</small>' : '') + '</span>' +
        '<span class="dx-kpi-sub">' + sub + '</span>' +
      '</div>';
    }
    var s1 = tileMoney(sales), s2 = tileMoney(received);
    return '<section class="dx-section">' +
      dashSectionHead('', 'خلاصه امروز', '', '') +
      '<div class="dx-kpis">' +
        tile('blue', 'فروش', s1.num, s1.unit, faDigits(invoices) + ' فاکتور', s1.full) +
        tile('green', 'ویزیت', faDigits(visits), '', 'امروز', '') +
        tile('violet', 'دریافتی', s2.num, s2.unit, 'امروز', s2.full) +
      '</div>' +
    '</section>';
  }


  function recentInvoicesHtml(ctx) {
    const invs = (data.invoices || []).slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || String(b.number || '').localeCompare(String(a.number || ''));
    }).slice(0, 5);
    if (!invs.length) return '';
    const rows = invs.map(function (inv) {
      const cust = ctx && typeof ctx.customerById === 'function'
        ? ctx.customerById(inv.customerId)
        : (data.customers || []).find(function (c) { return c.id === inv.customerId; });
      return '<a class="dx-row dx-act-line" href="#/invoice?id=' + encodeURIComponent(inv.id) + '"><span class="dx-line-body"><span class="dx-line-title">فاکتور #' + esc(String(inv.number || '')) + '</span><span class="dx-line-sub">' + esc(cust ? cust.name : '—') + ' — ' + faDate(inv.date) + '</span></span><span class="dx-line-amount">' + money(inv.total) + '</span></a>';
    }).join('');
    return '<div class="dx-subhead"><span>آخرین فاکتورها</span><a class="dx-link" href="#/invoices">همه</a></div>' + rows;
  }

  function recentVisitsHtml() {
    const items = [];
    (data.customers || []).forEach(function (c) {
      (c.visits || []).forEach(function (v) { items.push({ customerId: c.id, name: c.name, date: v.date, time: v.time, result: v.result }); });
    });
    items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''); });
    const top = items.slice(0, 5);
    if (!top.length) return '';
    const rows = top.map(function (v) {
      return '<a class="dx-row dx-act-line" href="#/customer?id=' + encodeURIComponent(v.customerId) + '"><span class="dx-line-body"><span class="dx-line-title">' + esc(v.name) + '</span><span class="dx-line-sub">' + faDate(v.date) + (v.time ? ' ' + esc(v.time) : '') + (v.result ? ' — ' + esc(v.result) : '') + '</span></span><span class="dx-chip">ویزیت</span></a>';
    }).join('');
    return '<div class="dx-subhead"><span>آخرین ویزیت‌ها</span><a class="dx-link" href="#/visits">همه</a></div>' + rows;
  }

  function targetHtml(metrics) {
    const target = typeof getMonthlySalesTarget === 'function' ? getMonthlySalesTarget() : 0;
    const sales = Number(metrics.mtdSales) || 0;
    const rawPct = target > 0 ? Math.round((sales / target) * 100) : 0;
    const pct = Math.min(100, Math.max(0, rawPct));
    const capped = pct;
    const done = target > 0 && sales >= target;

    function compactMoney(value) {
      const n = Math.abs(Number(value) || 0);
      if (n >= 1000000) {
        const m = n / 1000000;
        const text = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
        return enToFaDigits(text) + 'M';
      }
      return toman(n);
    }

    /* Pure-SVG gauge (270° arc, opens at the bottom). Fills from the right edge
       counter-clockwise so progress reads in the same direction as RTL text. */
    function ringSvg(p) {
      const cx = 62, cy = 62, r = 50;
      function pt(deg) {
        const a = deg * Math.PI / 180;
        return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
      }
      const trackPath = 'M ' + pt(45) + ' A ' + r + ' ' + r + ' 0 1 0 ' + pt(135);
      let fillPath = '';
      if (p > 0) {
        const sweep = 270 * Math.min(100, p) / 100;
        fillPath = '<path class="dx-ring-fill" d="M ' + pt(45) + ' A ' + r + ' ' + r + ' 0 ' + (sweep > 180 ? 1 : 0) + ' 0 ' + pt(45 - sweep) + '" fill="none" stroke="url(#dx-ring-grad)" stroke-width="12" stroke-linecap="round"/>';
      }
      return '<svg class="dx-ring-svg" viewBox="0 0 124 124" aria-hidden="true" focusable="false">' +
        '<defs><linearGradient id="dx-ring-grad" gradientUnits="userSpaceOnUse" x1="112" y1="62" x2="12" y2="62"><stop class="dx-g0" offset="0"/><stop class="dx-g1" offset="1"/></linearGradient></defs>' +
        '<path class="dx-ring-track" d="' + trackPath + '" fill="none" stroke-width="12" stroke-linecap="round"/>' +
        fillPath +
      '</svg>';
    }

    /* فقط دکمهٔ آیکون قابل کلیک است؛ بقیهٔ کارت صرفاً نمایشی است. */
    function targetTitleHtml() {
      return '<div class="dx-hero-top">' +
        '<span class="dx-hero-title">هدف فروش این ماه</span>' +
        '<button type="button" class="dx-icon-btn" data-monthly-target aria-label="تنظیم هدف فروش این ماه">' +
          dashboardIcon('target',20) +
        '</button>' +
      '</div>';
    }

    if (!(target > 0)) {
      return '<section class="dx-section"><div class="dx-card dx-hero dx-tone-empty">' +
        targetTitleHtml() +
        '<div class="dx-hero-body">' +
          '<div class="dx-ring">' + ringSvg(0) + '<div class="dx-ring-center"><strong>—</strong></div></div>' +
          '<div class="dx-hero-info">' +
            '<div class="dx-hero-empty-text">هنوز هدفی برای این ماه تعیین نشده</div>' +
            '<button type="button" class="dx-btn" data-monthly-target>تنظیم هدف</button>' +
          '</div>' +
        '</div>' +
      '</div></section>';
    }

    let status = { cls: 'ontrack', icon: '✓', text: 'روی برنامه' };
    let daysLeft = 0;
    let requiredDaily = 0;
    if (!done) {
      const monthLen = (metrics.jy && metrics.jm && typeof jalaliMonthLength === 'function')
        ? jalaliMonthLength(metrics.jy, metrics.jm) : null;
      if (monthLen) {
        daysLeft = Math.max(0, monthLen - (metrics.jd || 0));
        const expectedFraction = Math.min(1, (metrics.jd || 0) / monthLen);
        const expectedSales = target * expectedFraction;
        if (sales >= expectedSales * 1.05) status = { cls: 'ahead', icon: '↑', text: 'جلوتر از برنامه' };
        else if (sales <= expectedSales * 0.95) status = { cls: 'behind', icon: '⚠', text: 'عقب‌تر از برنامه' };
        requiredDaily = daysLeft > 0 ? Math.round(Math.max(0, target - sales) / daysLeft) : 0;
      }
    }

    const tone = done ? 'done' : status.cls;   /* behind | ontrack | ahead | done */

    return '<section class="dx-section"><div class="dx-card dx-hero dx-tone-' + tone + '">' +
      targetTitleHtml() +
      '<div class="dx-hero-body">' +
        '<div class="dx-ring" role="img" aria-label="پیشرفت هدف ' + enToFaDigits(String(pct)) + ' درصد">' +
          ringSvg(pct) +
          '<div class="dx-ring-center"><strong>' + enToFaDigits(String(pct)) + '<small>٪</small></strong></div>' +
        '</div>' +
        '<div class="dx-hero-info">' +
          '<div class="dx-hero-fig"><strong>' + compactMoney(sales) + '</strong><span>از ' + compactMoney(target) + ' تومان</span></div>' +
          '<span class="dx-pill"><i aria-hidden="true"></i>' + (done ? 'رسید' : status.text) + '</span>' +
          '<div class="dx-hero-meta">' +
            (done ? '<span>آفرین!</span>' : '<span>نیاز روزانه <b>' + compactMoney(requiredDaily) + '</b> ت</span>') +
            (!done && daysLeft > 0 ? '<span>' + enToFaDigits(String(daysLeft)) + ' روز مانده</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div></section>';
  }

  function bindMonthlyTarget(root, refresh) {
    const targetBtns = root.querySelectorAll('[data-monthly-target]');
    if (!targetBtns.length) return;
    targetBtns.forEach(function (btn) { btn.addEventListener('click', onMonthlyTargetClick); });
    function onMonthlyTargetClick(e) {
      e.preventDefault(); e.stopPropagation();
      const current = typeof getMonthlySalesTarget === 'function' ? getMonthlySalesTarget() : 0;
      openSheet(
        '<div class="sheet-title">هدف فروش این ماه</div>' +
        '<div class="field"><label>مبلغ هدف (تومان)</label>' +
        '<input id="monthly-target-input" type="text" inputmode="decimal" autocomplete="off" value="' + (current ? formatAmountForInput(current) : '') + '">' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">' +
        '<button type="button" class="btn" id="monthly-target-cancel">انصراف</button>' +
        '<button type="button" class="btn primary" id="monthly-target-save">ذخیره</button>' +
        '</div>'
      );
      const input = document.getElementById('monthly-target-input');
      if(input && typeof reformatAmountInputEl === 'function') reformatAmountInputEl(input);
      if(input) input.focus();
      const save = document.getElementById('monthly-target-save');
      const cancel = document.getElementById('monthly-target-cancel');
      if(cancel) cancel.addEventListener('click', closeModal);
      if(save) save.addEventListener('click', function(){
        const raw = input ? input.value : '';
        const normalized = normalizeDigits(raw).replace(/[,_\s٬]/g, '');
        const value = Number(normalized);
        if (!(value > 0)) { if (typeof showToast === 'function') showToast('هدف باید بیشتر از صفر باشد'); return; }
        if (typeof setMonthlySalesTarget === 'function') setMonthlySalesTarget(value);
        closeModal();
        refresh();
      });
    }
  }

  function formatAmountForInput(value){
    try { return Number(value).toLocaleString('fa-IR'); } catch(e) { return String(value || ''); }
  }

  async function renderInto(root, isStale, ctx) {
    // Lifecycle reconcile before painting Watch summary (additive; fail-open)
    if (typeof reconcileWatchLifecycle === 'function') {
      try { await reconcileWatchLifecycle(null, ctx); } catch (eRec) { console.warn('watch lifecycle reconcile failed', eRec); }
    }
    const metrics = typeof commandCenterMetrics === 'function' ? commandCenterMetrics(new Date(), ctx) : { mtdSales: globalTotals(ctx).monthSales, mtdProfit: 0, salesDeltaPct: null, profitDeltaPct: null };
    const g = globalTotals(ctx);
    const invVal = inventoryValue();
    if (typeof isStale === 'function' && isStale()) return;

    /* Eyeflow (presentation only — data sources, helpers, IDs and bindings unchanged):
         1. Target ring      — how is the month going?
         2. Today's KPIs     — three coloured tiles
         3. Today's actions  — what do I do now (heart of the page)
         4. Needs attention  — debts / checks / stock
         5. Early warnings   — watch summary
         6. Financial status — calm list rows
         7. Quick actions    — tools
         8. Recent activity  — invoices + visits */
    const alertBar = dashboardAlertBar(ctx);
    const todaySnapshot = todaySnapshotHtml(ctx);
    const focusActions = todaysActionsHtml(ctx);
    const watchSummary = watchSummaryHtml(ctx);
    const activityBody = recentInvoicesHtml(ctx) + recentVisitsHtml();
    const activityBlock = activityBody
      ? ('<section class="dx-section">' + dashSectionHead('', 'فعالیت اخیر', '', '') +
          '<div class="dx-card dx-list">' + activityBody + '</div></section>')
      : '';

    root.innerHTML =
      '<div class="dx">' +
      targetHtml(metrics) +
      todaySnapshot +
      focusActions +
      alertBar +
      watchSummary +

      '<section class="dx-section">' +
        dashSectionHead('', 'وضعیت مالی', '', '') +
        '<div class="dx-card dx-list">' +
          '<div class="dx-row dx-fin"><span class="dx-fin-label">سود این ماه</span><span class="dx-fin-value">' + money(metrics.mtdProfit) + '</span></div>' +
          '<div class="dx-row dx-fin"><span class="dx-fin-label">ارزش موجودی</span><span class="dx-fin-value">' + money(invVal) + '</span></div>' +
          '<a class="dx-row dx-fin" href="#/customers?filter=debt"><span class="dx-fin-label">بدهی مشتریان</span><span class="dx-fin-value is-debt">' + money(g.customerDebt) + '</span><span class="dx-chev" aria-hidden="true"></span></a>' +
        '</div>' +
      '</section>' +

      quickActionsHtml() +
      activityBlock +
      '</div>';

    bindMonthlyTarget(root, function () { renderInto(root, isStale, ctx); });
    bindActionQueueToggle(root);
    bindQuickActions(root);
    bindAttentionLink(root, ctx);
  }

  function mount(root, params) {
    if (!root) return function () {};
    const nav = document.getElementById('nav');
    if (nav) nav.style.display = 'none';
    document.documentElement.classList.add('dx-on');   /* presentation only: scopes the Dashboard canvas */
    let cancelled = false;
    let refreshToken = null;
    const isStale = function () { return cancelled; };
    function refreshDashboard() {
      var ctx = typeof createComputationContext === 'function'
        ? createComputationContext({ data: data })
        : null;
      renderInto(root, isStale, ctx).catch(function (e) { if (!cancelled) console.error('DashboardView refresh failed', e); });
    }
    refreshDashboard();
    if (typeof ViewHost !== 'undefined' && ViewHost.setRefresh) refreshToken = ViewHost.setRefresh(refreshDashboard);
    return function unmount() {
      cancelled = true;
      if (typeof ViewHost !== 'undefined' && ViewHost.clearRefresh) ViewHost.clearRefresh(refreshToken);
      refreshToken = null;
      if (nav) nav.style.display = '';
      document.documentElement.classList.remove('dx-on');
      root.innerHTML = '';
    };
  }

  global.DashboardView = { mount: mount, unmount: function () {} };
})(typeof window !== 'undefined' ? window : this);