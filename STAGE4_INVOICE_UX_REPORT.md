# Stage 4 — Invoice creation / editing UX

Baseline: Stage 3 (BAGHERI-CRM-stage3-ux-pass). Presentation layer only.

## What changed
1. **Customer card** — avatar, name, phone · region; «تغییر» button on NEW invoices (reuses the Stage 3 searchable picker; asks for confirmation only if items/amounts were already entered; reopens a blank form for the new customer, visit/delivery prefill dropped). Edit mode has no change button (an invoice keeps its customer).
2. **Product picker** — now a bottom sheet pinned to the *visual* viewport (follows the iOS keyboard, safe-area aware, dimmed backdrop, tap-outside / × to close, 16px search to stop iOS zoom). Rows also show the product's existing price (retail||sell) beside stock. Search now normalises Arabic ي/ك, Persian/Arabic digits, ZWNJ (`normalizeSearchText`, shared with the customer picker).
3. **Summary** — payable total is the hero figure; «جمع اقلام» row appears when an invoice discount exists (value = engine `metrics.subtotal`); payment-status pill (پرداخت‌نشده / پرداخت جزئی / تسویه روی فاکتور) in the summary and the payment heading, using the same thresholds as `invoicePayStatus()`.
4. **Sticky bottom bar** — total + large Save. It only forwards a click to the original `#save-invoice` (all validation, FIFO/stock checks, payments, double-submit guard run unchanged) and mirrors its disabled state («در حال ثبت…»). Hidden while the keyboard is open; the sticky top total chip shows then instead.

## JavaScript changes (js/app.js, inside openInvoiceForm — presentation only)
product search matcher; product row/panel markup; `positionProductDrop` (+ viewport listener attach/detach); picker close handlers; customer-card markup; summary template; payment-heading pill; bottom-bar markup and a wiring block. js/ui.js: `normalizeSearchText` (+ picker now uses it).

## Untouched
invoiceMetrics, invoiceProfitEstimate, selectProduct, the whole save handler, validateSaleAvailability, customerTotals, db.js, models.js, calc.js, computation-bank.js, backup/restore, printing, routes, manifest, index.html.
Modified files: js/app.js, js/ui.js, css/visual-grammar-pages.css, sw.js (cache v117), tests/invoice-ux/run.js (new).

## Tests
delivery-promises 51/0, one-off 21/0, payment-promises 50/0, visit-plan 28/0, watch-ack 56/0, ux-pass 17/0, invoice-ux 16/0 (opens the real openInvoiceForm).
Pre-existing (identical before Stage 3): quick-view-summary 3 failures (7, 8, 10); audit-v7_8 needs a private backup file not in the zip.

## Not verified
Real iPhone/installed-PWA behaviour (keyboard + visualViewport positioning, sheet animation, safe areas), dark-mode appearance, actually saving/editing an invoice end-to-end in a browser, printing, offline update, restoring a real backup. Product search typing and picker open/close are covered by static checks only (their handlers live inside the form closure).
Limitation: no per-invoice "remaining on this invoice" figure was added — the engine only exposes the customer's new balance, and computing a new financial value in the UI was out of scope.
