# BAGHERI CRM — Supplier Pages Audit & Fix Report

- **Base artifact:** `BAGHERI-CRM-v7 16-quickview-family.zip`
- **Patch scope:** supplier detail, supplier checks integration, payment/check views, dashboard check indicators, route CSS activation.
- **Build/cache:** `baqeri-shell-v100` → `baqeri-shell-v101`
- **Data/schema:** no schema, IndexedDB key, backup format, or persisted data structure changes.

## Executive result

The supplier workflow is materially improved. Supplier checks are now visible in the global Checks and Payments views; status changes are confirmed and guarded; bounced supplier checks are terminal in the quick status control; financial status mutations use local snapshots and rollback; purchase returns have a readable history; and safe editing/deletion is available for untouched purchases.

**Important safety boundary:** a purchase that has any recorded return or any FIFO consumption is intentionally locked against direct edit/delete. The existing `deleteOrVoidPurchase()` helper is not wired into the UI because its current `void` branch voids remaining FIFO layers but does not reduce/neutralize the purchase amount used by `supplierTotals()`. Calling it as-is would leave a supplier-ledger mismatch. Supporting reversal of partially consumed or returned purchases requires a separately designed accounting operation and regression fixtures; this patch does not guess that business rule.

## Implemented changes

### 1. Supplier detail — purchase lifecycle

- Added purchase edit for purchases with no returns and no FIFO consumption.
- Supports single-item, multi-item, and description-only purchase records.
- Stocked purchase edits use `adjustPurchaseLayerQty()` and update the corresponding FIFO layer unit cost, purchase amount, item line amounts, purchase date, and associated stock-log dates.
- Added hard delete for untouched purchases using `hardDeletePurchaseLayers()` followed by removal of the supplier purchase record.
- All edit mutations use a local snapshot; any mutation or persistence failure restores the previous data graph.
- Purchases with returns, consumed FIFO layers, missing/ambiguous layers, or legacy item/layer identity mismatch do not expose edit/delete controls. A short lock reason is shown. This is deliberate fail-closed behavior.

### 2. Supplier detail — check safety

- Supplier check status changes now use `appConfirm()` and `withSubmitGuard()`.
- Status mutation now has local snapshot + rollback.
- Quick status transitions are `pending → cleared → bounced`; `bounced` is terminal and no longer cycles back to `pending` with one tap.
- A bounced check can only be corrected through the explicit edit sheet, which asks for confirmation when its status changes.
- Check editing now uses `withSubmitGuard()`, local snapshot, and rollback.
- Supplier payment add/delete and supplier edit/active-toggle mutations now also have local rollback snapshots.

### 3. Supplier purchase-return history

- Added a per-purchase disclosure listing each return separately.
- Each return shows date, returned items/quantities, amount, and `returnReason` (or an explicit “reason not recorded” label for older records).
- Multi-item purchase titles now show the first two item names plus a `+N` suffix rather than only “N items”.

### 4. Global Payments view

- Supplier payments preserve their actual method (`check` or `cash`) instead of being overwritten with a generic `supplier` method.
- Supplier check rows are labeled distinctly and include the check status.
- Added a `چک` filter, so supplier checks can be filtered together with customer checks.
- Supplier cash payments remain discoverable under the cash filter; the existing `تأمین‌کننده` filter still filters by counterparty type.
- Bounced supplier checks display their nominal face amount in the list, while their accounting `amount` remains zero.

### 5. Global Checks view

- Merges customer checks (`data.checks`) and supplier checks (`supplier.payments` where `method === 'check'`).
- Supplier check rows link to the relevant supplier detail page and identify themselves as outgoing supplier checks.
- Added a `برگشتی` filter.
- Supplier checks can be marked paid or bounced from the global list, with confirmation, submit guard, and local rollback.
- Bounced supplier checks are shown as terminal; correction is routed through the supplier edit sheet.
- Summary totals use face amount for supplier checks; the “in progress” subtotal includes only pending checks.
- “Newest” sorting uses date/issue date first, then ID as a tie-breaker, instead of relying on the ID alone.

### 6. Dashboard and global check totals

- `globalTotals().outstandingChecks` now includes pending supplier checks as well as outstanding customer checks.
- Dashboard due-soon and overdue alerts include pending supplier checks.
- Dashboard adds a distinct alert for bounced supplier checks.
- Cleared and bounced supplier checks are excluded from due-soon/overdue calculations.

### 7. Route styling and touch targets

- Router now applies the `vg-route-*` class matching the active route and removes the previous route class on navigation. This activates existing supplier-list visual-grammar rules that previously had no matching route class.
- Supplier detail now has a dedicated identity-card style and collapsible purchase/payment history sections.
- Supplier transaction action buttons have a 44×44px minimum target.

### 8. Offline cache

- Bumped the service-worker shell cache to `baqeri-shell-v101`, as required when deployed JS/CSS assets change.
- All changed JS/CSS files were already present in the precache list; no asset-list change was needed.

## Files changed

| File | Change |
|---|---|
| `js/views/supplier.js` | Safe purchase edit/delete, return history, check guards/rollback, supplier mutation rollback, supplier detail structure |
| `js/views/payments.js` | Preserve supplier payment method and add check filtering |
| `js/views/checks.js` | Merge supplier checks, bounced state/filter, guarded status updates |
| `js/calc.js` | Include pending supplier checks in outstanding check total |
| `js/views/dashboard.js` | Supplier check due/overdue and bounced alerts |
| `js/router.js` | Activate route namespace classes |
| `css/visual-grammar-pages.css` | Supplier identity/disclosure styles and 44px targets |
| `sw.js` | Cache version v101 |
| `tests/supplier-ledger-integrity/run.js` | Added static regression checks |

## Validation results

### PASS

- JavaScript syntax check: **55/55 JS files passed**.
- Supplier-ledger static regression checks: **19/19 passed**.
- Existing Watch/ACK integrity test: **PASS — 56 checks, 0 failures**.
- Functional smoke test of `globalTotals()` with synthetic customer/supplier checks: **PASS**. Pending supplier face value was included; cleared/bounced supplier checks were excluded from outstanding balance.
- Functional smoke test of `adjustPurchaseLayerQty()`: **PASS**. Quantity, supplier purchase quantity, FIFO layer and product stock remained aligned.
- Functional smoke test of `hardDeletePurchaseLayers()`: **PASS** for an untouched purchase layer; layer was removed and stock decremented.

### Existing test limitations / baseline comparison

- `tests/quick-view-summary/run.js`: **18 passed, 3 failed** on the patched build. The exact same **18 passed, 3 failed** result occurs on the original ZIP baseline; these failures are pre-existing and unrelated to this patch.
- `tests/audit-v7_8/run_all.js`: could not run because the ZIP does not contain its required fixture `tests/audit-v7_8/baqeri-backup-2026-10-27_2.json`.
- No browser automation, live IndexedDB restore, or iPhone PWA interaction test was available in this execution. UI behavior on the actual device remains **NOT PROVABLE** from these checks alone.

## Remaining issues / explicit exclusions

1. **Returned or FIFO-consumed purchase edit/delete:** locked intentionally. The current void helper is not ledger-safe for direct UI use because it does not neutralize the supplier purchase amount. A proper partial-reversal model needs its own design and historical allocation tests.
2. **Supplier active/inactive reporting policy:** unchanged. Inactive suppliers remain included in historical/global supplier totals, matching the existing calculation behavior.
3. **Legacy payment IDs:** no migration was added. Supplier check UI still resolves a payment by its current array position within the supplier record; the current synchronous render/action path is retained.
4. **Runtime visual verification:** iPhone layout, VoiceOver, sheet interactions, offline update/activation and restore-from-backup were not exercised here.

## Accounting invariants preserved

- Supplier balance formula remains `openingBalance + purchaseTotal - payTotal - returnTotal`.
- Bounced supplier checks retain `faceAmount` but have `amount = 0`, so they no longer reduce supplier debt.
- Pending supplier checks are included in outstanding-check reporting but do not change supplier balance until cleared.
- No FIFO allocation algorithm, invoice allocation, schema version, backup/restore format, or persisted entity structure was changed.
