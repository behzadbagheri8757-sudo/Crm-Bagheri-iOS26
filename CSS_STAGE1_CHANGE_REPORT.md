# BAGHERI CRM — CSS Stage 1 Delivery

## Scope
Stage 1 is a CSS ownership/cascade cleanup. It does not redesign components or change business logic.

## Files changed

### `css/app.css`
- Corrected the file header to reflect actual ownership: it no longer claims ownership of the page frame or shared component geometry.
- Removed duplicate `h2.section-title` typography declarations (`font-size`, `font-weight`, `color`, `letter-spacing`). These are owned by `visual-grammar.css`; retained layout declarations (`margin`, `display`, `align-items`, `gap`) and the decorative `::after` rule.
- Removed duplicate `h3.sub-title` typography declarations (`font-size`, `color`, `font-weight`). Typography is owned by `visual-grammar.css`; retained the page-specific margin.
- Removed the duplicate `main` frame and shared page-composition block. These rules were already defined later in `visual-grammar-pages.css`, which wins the cascade. No effective frame values were changed.

### `css/visual-grammar-components.css`
- Clarified that the capsule radius rule applies to buttons/chips, while text fields use the separate flat/separator treatment.
- Removed the earlier redundant 12px radius declaration for `.field input` and `.field select`. The later canonical form-control rule already set these controls to `border-radius:0`; the effective appearance is preserved.

### `css/visual-grammar-pages.css`
- Moved `main`'s `position:relative` and `z-index:1` into the canonical page-frame rule. These were previously supplied by the duplicate `main` rule in `app.css`; computed behavior is preserved.

## Explicitly untouched
- JavaScript, HTML, router, navigation behavior
- Accounting, FIFO, inventory, checks, allocations, backup/restore, database/schema
- Intelligence, Watch, service worker and PWA cache
- Existing `.vg-route-*` dormant selectors (not deleted in this stage because some are documented as intentionally dormant and a safe re-scope requires a separate DOM-hook pass)

## Validation
- CSS syntax/declaration parsing: PASS for all five loaded CSS files.
- Source-level scope check: only the three CSS files listed above were edited, plus this report.
- No browser/iPhone rendering test was performed. This is a static cleanup; no claim of visual QA is made.

## Expected effect
No intentional visual change. This stage removes misleading ownership and redundant cascade declarations so later visual adjustments can be made in one canonical location.
