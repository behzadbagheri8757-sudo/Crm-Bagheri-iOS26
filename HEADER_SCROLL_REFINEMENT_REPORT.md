# Header scroll refinement — v117 source

## Scope
Presentation-only refinement of the shared app header. Existing scroll progress, route handling, page title assignment, navigation buttons, and all business/data logic remain unchanged.

## Changes
- The full Persian weekday/date remains visible only on the dashboard root.
- Once the existing header collapse reaches 50% (24px of the existing 48px range), the dashboard date changes to compact Jalali `day/month/year` and moves to the physical top-left of the header.
- On all non-dashboard routes, the header date is hidden.
- At the same collapse point, the existing page title is centered in the compact header, with space reserved for the leading/trailing header controls.
- Scrolling back to the top restores the full dashboard date and the existing expanded title layout.
- Service-worker shell cache bumped from v115 to v116 so updated static assets are fetched after deployment.

## Files changed
- `js/nav.js`
- `css/00-chrome.css`
- `sw.js`
- `tests/header-scroll/check.js`

## Checks
- `node --check js/nav.js` — PASS
- `node --check sw.js` — PASS
- `node tests/header-scroll/check.js` — PASS (7 contract checks)
- Existing Playwright visual test — NOT RUN: Chromium executable is not installed in this environment. No iPhone/Safari visual verification is claimed.

No database, backup, schema, accounting, inventory, FIFO, invoice, payment, check, Intelligence, or Watch code was changed.
