/* sw.js — App Shell only. Never touches IndexedDB or CRM business data.
 *
 * Goal: one successful online visit → full shell in Cache Storage →
 * entire CRM usable offline through the SPA shell.
 *
 * CACHE_NAME: bump on every deploy that changes static assets.
 */
'use strict';

/* CHANGED: v56 -> v57 (More bottom sheet converted to a dedicated full-page
   SPA route #/more. New view js/views/more.js added to the precache list;
   old More sheet code and CSS left in place for rollback. No other shell
   asset changed.) */
/* CHANGED: v55 -> v56 (global typography weight retuning: all UI font-weight tokens/literals
   lowered by one 100-weight tier, floor 400, so the app is visually balanced with iPhone
   "Bold Text" accessibility setting ON, which is the user's real-world baseline. Print/export
   invoice document typography intentionally left unchanged. No font-family, font-size,
   line-height, layout, or business logic changed.) */
/* CHANGED: v53 -> v54 (surgical retry-orphan graph preservation, validation focus, header geometry, in-app confirmations, and scoped hint/touch fixes). Previous v53 behavior is otherwise preserved.
   The build also retains the v53 scroll-linked header geometry and native-style tab selection.
   */
/* Legacy v53 note: Header geometry, semantic Back, and native-style tab selection refined as a continuous,
   scroll-linked --header-progress custom property instead of a threshold
   class toggle with its own CSS transition — the old version kept
   animating for ~220ms after scroll stopped/reversed, which read as a
   snap/lag; verified via headless scroll test: progress now tracks
   scrollY 1:1 and reverses identically. Removed the now-duplicate "داشبورد"
   <h2> inside Dashboard's own content — the header already shows it as the
   page title since the brand-name/page-title fix) */
/* CHANGED: v152 -> v153 — dead-code cleanup: 22 unused functions removed (old inline product dropdown helpers, unused nav/ui/dashboard/watch helpers) and 14 unused CSS rules/classes removed. No behaviour change. */
/* CHANGED: v151 -> v152 — visit quantity: invoice rows seeded from an accepted product use the visit quantity; quantity stepper updates in place (no card re-render, no flicker). */
/* CHANGED: v150 -> v151 — visit: accepted products get a quantity control (+ right, value, − left); quantity saved on the offer and shown in visit history. */
/* CHANGED: v149 -> v150 — invoice: payment amounts stay visible after a re-render (updateInvPaymentTotal runs in renderSheet); condensed header date reads day-month-year right-to-left in Persian. */
/* CHANGED: v148 -> v149 — visual cleanup: dashboard commitments label moved out of the card and card tightened; invoice section spacing; stepper + on the right (RTL); add-item row as an iOS row; header buttons without letter-spacing/washed colour. */
/* CHANGED: v147 -> v148 — review fixes: removed-empty-row index shift in setActiveRow; scroll restore only into the same host kind; merged duplicate .inv-line-del and .inv-payment-action-value rules; dropped redundant !important. */
/* CHANGED: v146 -> v147 — invoice: taps inside the product picker no longer close it; payment panel sits inline under the segment (lens visible), values more legible. */
/* CHANGED: v145 -> v146 — invoice phase 5: product picker is a pushed layer inside the invoice sheet with back, search and filters (all / frequent / recent / visit suggestions); selection uses the existing selectProduct(). */
/* CHANGED: v144 -> v145 — invoice sheet phase 4: payment method is an iOS segmented control (same buttons and panels, lens from ui-segmented.js). */
/* CHANGED: v143 -> v144 — invoice sheet phase 3: item rows restyled, quantity stepper (+/−) uses the same update path as typing, delete button restyled. */
/* CHANGED: v142 -> v143 — invoice sheet phase 2: sections become iOS grouped cards with section headers and hairline rows. Presentation only. */
/* CHANGED: v141 -> v142 — invoice sheet header: cancel labelled انصراف (right), save as iOS text action (left), hairline under the bar. Presentation only. */
/* CHANGED: v140 -> v141 — route transition snapshot now keeps #main-scoped styles (no raw copy); target capsule layout: need top-left, percent centred above, sales top-right, days below-left; card more compact. */
/* CHANGED: v139 -> v140 — capsule liquid colour follows the target status (ahead/done green, on-track blue, behind amber). */
/* CHANGED: v138 -> v139 — monthly target: horseshoe ring replaced by a glass capsule with animated green liquid filling right-to-left (presentation only). */
/* CHANGED: v137 -> v138 — Game Center mode segment is full width like the rest of the app. */
/* CHANGED: v136 -> v137 — Reports: four period segments; custom range moved to a filter button in the summary row; context shown as a pill. */
/* CHANGED: v135 -> v136 — Watches list: search row (customer or product), 4 segments, follow-ups as summary flag. */
/* CHANGED: v134 -> v135 — commitment cards restyled as one grouped surface with a centre divider, centred counts and labels on one baseline. */
/* CHANGED: v133 -> v134 — dashboard commitments: two tappable count cards (payment promises, delivery promises); commitments page with two in-page segments and an empty state. */
/* CHANGED: v132 -> v133 — merged CSS patch layers 11–14 into their canonical stylesheets, removed confirmed superseded/dead selectors, removed deleted patch files from index.html and PRECACHE_URLS. CSS appearance and JS behavior are intended to remain unchanged; no JS, data, schema, accounting, stock, or backup logic changed. */
/* CHANGED: v131 -> v132 — filter button icon sized (was invisible); active state and badge position. */
/* CHANGED: v130 -> v131 — shared location sheet (region → route → neighborhood, labelled 'موقعیت') used by Customers and Prospects; both use the filter button in the search row. */
/* CHANGED: v129 -> v130 — Customers list converted to the list contract (search row with filter button, summary+sort row, badge on filter). */
/* CHANGED: v128 -> v129 — Payments (filter sheet for secondary types, 4 segments, summary pill) and Invoices (search row, summary+sort row) converted to the list contract. */
/* CHANGED: v127 -> v128 — Products and Visits converted to the list contract (search row, max-4 segments, summary+sort row, shortcut flags for negative stock and closed stores). */
/* CHANGED: v126 -> v127 — Suppliers list converted to the list contract (search row, summary+sort row, summary line). */
/* CHANGED: v125 -> v126 — cache bump only, to force devices still showing the v124 header to fetch the v125 shell and CSS. */
/* CHANGED: v124 -> v125 — iOS 26 header: transparent, no hairline, progressive blur under content. New css/14-header-ios26.css in PRECACHE_URLS. */
/* CHANGED: v123 -> v124 — list summary restyled as a glass pill (was plain text on background). */
/* CHANGED: v122 -> v123 — list-page contract pilot on Checks (search row, max-4 segments, summary+sort row, flag shortcuts). New css/13-list-contract.css in PRECACHE_URLS. */
/* CHANGED: v121 -> v122 — segmented lens now receives ios-has-on (was missing, lens stayed invisible). */
/* CHANGED: v120 -> v121 — one iOS-style segmented control rule for the whole project (js/ui-segmented.js + css/12-ios-segmented.css), added to PRECACHE_URLS. */
/* CHANGED: v119 -> v120 — single location capsule with drill-down sheet, grouped iOS rows for business type and questions, count line replaces summary cards. */
/* CHANGED: v118 -> v119 — Shop evaluation list: search moved to top, target card compacted, location filters as glass capsules, sort moved left, numbered options and separators in evaluation, double-tap skip guard. New css/11-v119-prospects.css added to PRECACHE_URLS. */
/* CHANGED: v63 -> v64 (Computation Bank is now part of the offline app shell. Added js/computation-bank.js to PRECACHE_URLS and bumped the shell cache version so the execution-scoped bank is available offline. No business logic changed.)
   */
/* CHANGED: v61 -> v62 (offline-shell fix only: css/shamsi-calendar.css and
   js/shamsi-calendar.js are loaded by index.html on every page load but were
   missing from PRECACHE_URLS, so a freshly-activated cache version had no
   guarantee they'd be cached before the first offline use. Added both to the
   precache list; no other asset, route, or business logic touched.) */
/* CHANGED: v64 -> v65 (classification fix only: js/pin-lock.js moved into
   CRITICAL_SHELLS — bootSpaShell() hard-gates boot on it whenever a PIN is
   configured, so it is boot-critical, not merely a nice-to-have precache
   entry. It was already in PRECACHE_URLS; no asset list, route, or business
   logic otherwise changed.) */
/* CHANGED: v99 -> v100 (Quick View pre-visit summary: customer.js, app.js BagheriPresent.lastOfferMap export, additive CSS. No asset list or route changed.) */
/* CHANGED: v116 -> v117 — Customer product purchase-history push page (derived read-only stats) and scoped CSS. No schema, stored data, accounting, stock or backup changes. */
/* CHANGED: v112 -> v113 — Stage 2 UX: normalized buttons and states, accessible sheet focus handling, customer action layout, and keyboard-accessible report chart. UI-only; no CRM data or accounting behavior changed. */
/* CHANGED: v111 -> v112 — UI typography, shared segmented filters, theme-aware form colors and validation states. Removed the obsolete bundled font asset from the offline precache. */
/* Previous v110 -> v111 — 00-chrome.css and 10-disclosure.css were missing from PRECACHE_URLS (first load / offline showed unstyled header and disclosure surfaces until the network fetch finished). Both added; cache bumped so devices re-fetch the updated CSS instead of serving the stale cached copy. */
/* CHANGED: v98 -> v99 (Soft iOS look: CSS-only visual refresh — tokens in visual-grammar.css and a new layer at the end of visual-grammar-pages.css. No asset list, route or business logic changed.) */
const CACHE_NAME = 'baqeri-shell-v153';

/* CHANGED: v117 -> v118 — Restored unified section-heading styling from the blue patch on top of the product purchase-history baseline. No prospect-evaluation UX, segment, data, schema or business-logic changes. */

/** App Shell — paths relative to this SW (same directory as index.html). */
const PRECACHE_URLS = [
  './index.html',
  './css/app.css',
  './css/visual-grammar.css',
  './css/visual-grammar-components.css',
  './css/visual-grammar-pages.css',
  './css/00-chrome.css',
  './css/10-disclosure.css',
  './js/ui-segmented.js',
  './js/ui-location-sheet.js',
  './css/shamsi-calendar.css',
  './js/shamsi-calendar.js',
  './js/models.js',
  './js/ui.js',
  './js/db.js',
  './js/location.js',
  './js/calc.js',
  './js/payment-promises.js',
  './js/delivery-promises.js',
  './js/visit-plan.js',
  './js/computation-bank.js',
  './js/stock.js',
  './js/backup.js',
  './js/pin-lock.js',
  './js/icons.js',
  './js/nav.js',
  './js/app.js',
  './js/prospect-scoring.js',
  './js/prospect-db.js',
  './js/prospect-core.js',
  './js/game-config.js',
  './js/game-logic.js',
  './js/sw-register.js',
  './js/router.js',
  './js/view.host.js',
  './js/views/dashboard.js',
  './js/views/reports.js',
  './js/views/products.js',
  './js/views/inventory.js',
  './js/views/customers.js',
  './js/views/payment-promises.js',
  './js/views/delivery-promises.js',
  './js/views/visit-plan.js',
  './js/views/customer.js',
  './js/views/payments.js',
  './js/views/invoices.js',
  './js/views/suppliers.js',
  './js/views/supplier.js',
  './js/views/visits.js',
  './js/views/prospects.js',
  './js/views/prospect.js',
  './js/views/prospect-routes.js',
  './js/views/locations.js',
  './js/views/evaluation.js',
  './js/views/checks.js',
  './js/views/invoice.js',
  './js/views/game-center.js',
  './js/views/settings.js',
  './js/views/more.js',
  './vendor/xlsx.full.min.js',
  './vendor/html2canvas.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-152.png',
  './logo-export.png',
  './js/intelligence/ack.js',
  './js/intelligence/persistence.js',
  './js/intelligence/feedback.js',
  './js/intelligence/baseline_manager.js',
  './js/intelligence/seasonality.js',
  './js/intelligence/interpretation.js',
  './js/intelligence/signals.js',
  './js/intelligence/sku_intelligence.js',
  './js/intelligence/risk.js',
  './js/intelligence/priority.js',
  './js/intelligence/action.js',
  './js/intelligence/watch_lifecycle.js',
  './js/views/watches.js',
];

/** Critical SPA shell/assets that must exist for install to be considered successful. */
const CRITICAL_SHELLS = [
  './index.html',
  './css/app.css',
  './js/db.js',
  './js/nav.js',
  './js/app.js',
  './js/models.js',
  './js/ui.js',
  './js/router.js',
  './js/view.host.js',
  './js/views/dashboard.js',
  // js/pin-lock.js: bootSpaShell() (js/nav.js) hard-gates boot on
  // window.pinLock whenever a PIN is configured (localStorage
  // baqeri_pin_lock_v1) — if the module is missing it shows an error screen
  // and returns before loadData()/render() ever run. That makes it required
  // for offline boot for any user with PIN lock enabled, so it belongs here
  // like the other boot-path files above, not just in PRECACHE_URLS.
  './js/pin-lock.js'
];

/**
 * Precache each URL individually.
 * One 404 must NOT wipe the whole install (unlike cache.addAll all-or-nothing).
 * Install fails only if a critical shell is missing.
 */
function precacheShell() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return Promise.all(
      PRECACHE_URLS.map(function (url) {
        return fetch(url, { cache: 'reload' })
          .then(function (response) {
            if (!response || !response.ok) {
              throw new Error('HTTP ' + (response && response.status));
            }
            return cache.put(url, response);
          })
          .then(function () {
            return { url: url, ok: true };
          })
          .catch(function (err) {
            console.error('[SW] precache failed:', url, err && err.message);
            return { url: url, ok: false, err: String(err && err.message || err) };
          });
      })
    ).then(function (results) {
      var failed = results.filter(function (r) { return !r.ok; });
      var criticalFailed = failed.filter(function (r) {
        return CRITICAL_SHELLS.indexOf(r.url) !== -1;
      });
      if (failed.length) {
        console.warn('[SW] precache non-critical failures:', failed.length);
      }
      if (criticalFailed.length) {
        console.error('[SW] CRITICAL precache failures:', criticalFailed);
        return Promise.reject(new Error(
          'Critical shell missing: ' + criticalFailed.map(function (r) { return r.url; }).join(', ')
        ));
      }
      return results;
    });
  });
}

self.addEventListener('install', function (event) {
  // Activate as soon as install succeeds so the SAME day offline session
  // can use the precache (first-install readiness).
  // clients.claim is in activate — does not reload an open page by itself.
  event.waitUntil(
    precacheShell().then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME && key.indexOf('baqeri-shell-') === 0) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      // Take control of open pages so the next navigation is offline-capable
      // without requiring a second visit. Does not force reload mid-form.
      return self.clients.claim();
    })
  );
});

/** Last path segment of a URL (for fallback cache lookup). */
function fileNameFromUrl(url) {
  var path = (url && url.pathname) ? url.pathname : '';
  var i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

/**
 * Fallback when cache.match(request) misses due to absolute vs relative key differences.
 * Prefer a key whose pathname equals the request pathname; otherwise first same file name.
 */
function matchByFileName(cache, fileName, requestUrl) {
  if (!fileName) return Promise.resolve(undefined);
  var reqPath = '';
  try {
    if (requestUrl) reqPath = new URL(requestUrl).pathname;
  } catch (e) {}
  return cache.keys().then(function (keys) {
    var fallback = null;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        var u = new URL(key.url);
        if (fileNameFromUrl(u) !== fileName) continue;
        if (reqPath && u.pathname === reqPath) {
          return cache.match(key);
        }
        if (!fallback) fallback = key;
      } catch (e) { /* ignore bad key */ }
    }
    return fallback ? cache.match(fallback) : undefined;
  });
}

/** Resolve every document navigation to the SPA shell. Hash routes are client-side. */
function respondNavigate(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match('./index.html', { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          try { cache.put('./index.html', response.clone()); } catch (e) {}
        }
        return response;
      }).catch(function () {
        return new Response(
          'آفلاین — App Shell هنوز روی این دستگاه آماده نشده. یک‌بار با اینترنت برنامه را باز کنید و دوباره تلاش کنید.',
          { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        );
      });
    });
  });
}

/** Cache-first for static assets (JS/CSS/vendor/icons/logo). */
function respondStatic(request) {
  var url = new URL(request.url);
  var name = fileNameFromUrl(url);

  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;

      // Try pathname key (covers some absolute/relative storage differences)
      return cache.match(url.pathname, { ignoreSearch: true }).then(function (byPath) {
        if (byPath) return byPath;

        return matchByFileName(cache, name, request.url).then(function (byName) {
          if (byName) return byName;

          return fetch(request)
            .then(function (response) {
              if (response && response.ok) {
                try {
                  cache.put(request, response.clone());
                } catch (e) { /* ignore */ }
              }
              return response;
            })
            .catch(function () {
              return new Response('', { status: 503, statusText: 'Offline' });
            });
        });
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // Same-origin only
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(respondNavigate(request));
    return;
  }

  event.respondWith(respondStatic(request));
});

// Optional: page can postMessage({type:'SKIP_WAITING'}) for controlled updates later
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
