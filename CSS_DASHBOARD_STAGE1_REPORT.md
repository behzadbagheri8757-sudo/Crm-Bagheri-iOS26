# BAGHERI CRM — Dashboard Reconstruction Stage 1

## Base
`BAGHERI-CSS-Stage4.zip` (user-provided source of truth)

## Scope
Dashboard presentation only. Modified files:
- `js/views/dashboard.js`
- `css/visual-grammar-pages.css`

## Changes
- Replaced the dashboard eyebrow copy with the action-oriented heading: «امروز چه کار کنم؟».
- Added a final, dashboard-scoped visual layer to establish a clearer hierarchy: alert summary, today's snapshot, monthly target, action queue, Watch summary, financial health, quick actions, and recent activity.
- Refined spacing, typography, touch-area heights, surfaces, dividers, and responsive quick-action layout.
- Kept the existing monthly target SVG ring and its calculation/rendering untouched.
- Kept existing DOM data sources, calculations, links, click handlers, PromiseUI/DeliveryUI bindings, and refresh lifecycle intact.

## Protected areas
No edits to accounting, FIFO, inventory calculations, invoices, payments, checks, allocations, database/schema, backup/restore, Intelligence/Watch generation, router, service worker, or other view modules.

## Validation
- Static diff scope: only the two files listed above plus this report.
- CSS parser validation: see terminal validation output; this is not a device-render test.
- No iPhone/browser visual test was performed in this environment.

## Review note
The change is a first dashboard reconstruction pass, not a claim of pixel-perfect validation. Verify on iPhone 13 Pro Max in both light and dark themes, especially quick-action labels and the alert/action queue vertical rhythm.
