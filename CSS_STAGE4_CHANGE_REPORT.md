# BAGHERI CRM — CSS Stage 4 Delivery

## Base
Applied directly to `BAGHERI-CSS-Stage3.zip`.

## Scope: shared toolbar ownership cleanup

The shared geometry for `.btn-row`, `.tx-toolbar`, `.tx-toolbar-select`, and `.tx-toolbar-label` is already defined in `css/visual-grammar-components.css`. The duplicate geometry in `css/app.css` was removed so the component layer is the single owner.

### Changes in `css/app.css`
- Removed duplicate `display`, `flex-wrap`, `gap`, and `margin-top` from `.btn-row`.
- Removed duplicate `display`, `align-items`, `gap`, and `margin` from `.tx-toolbar`.
- Removed duplicate `min-height` from `.tx-toolbar-select`; the component layer supplies `var(--vg-control-height)`.
- Removed duplicate font size, font weight, and color from `.tx-toolbar-label`; the component layer supplies the design tokens.
- Preserved view-specific composition: toolbar alignment/min-height, select width constraints/margin/flex behavior, and label flex/line-height.

## Safety / scope
No JavaScript, HTML, database, accounting, FIFO, inventory, checks, allocations, backup/restore, schema, Intelligence, Watch, service worker, manifest, or PWA cache files were changed.

## Validation
- CSS syntax parsed for all five stylesheets loaded by `index.html`.
- Confirmed the component stylesheet still contains the canonical toolbar declarations.
- Compared Stage 3 and Stage 4 trees: only `css/app.css` and this report differ.
- ZIP integrity tested after packaging.
- No browser/iPhone rendering test was performed.
