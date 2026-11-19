# UX audit against MASTER PROMPT V2 + implementation pass

Baseline: BAGHERI-CRM-stage2-ui-followup-shadows-raised (Stage 1, Stage 2, light review and follow-up kept as-is).

## Audit result
| Area | Status in baseline | Action |
|---|---|---|
| Customer 360 | Deep overview (identity, alert, story, actions, watch, finance, behaviour) but history split into 4 separate lists; no single timeline; no one-tap call | **Added** unified activity timeline (preview + full page) and call button |
| Fast visits | Visit form already rich (pre-visit context). Entry step was dropdown + «ادامه» | **Replaced** with searchable tap-to-select customer sheet |
| Smart invoicing | Form already has searchable product picker, collapsed lines, sticky total, payment sheets, discount, profit. Customer step was dropdown + «ادامه» | Customer step replaced (same shared picker). Form and calculations untouched |
| Intelligence (Reports) | Already complete: hero KPI, period comparison, trend chart, top products/customers, collections, inventory, field, finance | No change (no demonstrable gap) |
| Watch | Alphabetical customer order regardless of severity | **Changed** order: most severe first (stored `level`, nothing recalculated) |
| Overall | Five separate copies of the same picker (invoice, visit, payment, check, dashboard) | Consolidated into one helper `openCustomerPicker` in ui.js |

## Files changed (presentation only)
css/visual-grammar-pages.css, js/ui.js, js/nav.js (1 line: back-navigation from invoice to timeline), js/views/{customer,visits,invoices,payments,checks,dashboard,watches}.js, sw.js (cache v115→v116 so devices fetch the new CSS/JS), tests/ux-pass/run.js (new).

## Not touched
db.js, models.js, calc.js, computation-bank.js, app.js (invoice/payment engines), backup/restore, intelligence engines, manifest, index.html.

## Verification
Existing suites unchanged: delivery-promises 51/0, one-off 21/0, payment-promises 50/0, visit-plan 28/0, watch-ack-integrity 56/0, new ux-pass 17/0.
Pre-existing, unrelated: quick-view-summary has 3 failing cases (7, 8, 10) in the baseline too; audit-v7_8 needs a private backup file not shipped in the zip.

## Not verified here
Real iPhone Safari / installed PWA rendering, dark-mode appearance, keyboard behaviour in the new search field, offline service-worker update, restoring a real historical backup. Please check these on device.
