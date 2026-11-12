# BAGHERI CRM — CSS Stage 2 Delivery

## Base
Applied directly to the Stage 1 delivery ZIP (`BAGHERI-CSS-Stage1.zip`).

## Changes

### 1) Removed dormant route selectors
- Removed 98 selector branches containing `.vg-route-*` from `css/visual-grammar-pages.css`.
- Removed 51 rules that became empty after those selector branches were removed.
- Confirmed that executable HTML/JavaScript does not add `.vg-route-*` to the route host; the router adds only the canvas classes to `<html>`.
- Preserved all non-route selector branches in mixed selector lists, plus all live hooks such as `#main.customer-detail-view` and ID-scoped list rules.
- Left explanatory comments that refer to the dormant namespace intact where useful.

### 2) Unified bottom content clearance
- Added `--vg-bottom-nav-clearance:86px` as the shared clearance contract.
- Applied it to the page frame at default widths, compact mobile widths, and 768–900px widths where the bottom navigation is still visible.
- Clearance is derived from the 60px resting navigation height + 10px bottom offset + 16px visual gap. Safe-area inset remains additive.
- Kept the 901px+ behavior at 40px because the bottom navigation is hidden at that breakpoint.

## Files changed
- `css/visual-grammar-pages.css`
- `CSS_STAGE2_CHANGE_REPORT.md`

No JavaScript, HTML, database, accounting, FIFO, inventory, checks, allocation, backup/restore, schema, Intelligence, Watch, service worker, or PWA cache files were changed.

## Validation
- CSS parser validation: performed for all five CSS files loaded by `index.html`.
- Selector scan: zero executable `.vg-route-*` selector branches remain in the loaded CSS.
- Scope check against Stage 1: only the page CSS and this report differ.
- No browser/iPhone rendering test was performed; this is source-level validation, not visual QA.
