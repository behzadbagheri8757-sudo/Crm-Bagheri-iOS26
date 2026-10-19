# گزارش تکمیل نهایی پچ V1–V9

این بسته بر مبنای آخرین نسخه‌ی پچ‌شده ساخته شده است، نه ZIP پایه. اصلاحات این مرحله فقط موارد جاافتاده‌ی V1، V2، V4، V5، V6 و V7 را پوشش می‌دهد و رنگ داینامیک Story، refactor عمومی، تغییر آستانه‌ها و قواعد اصلی مالی/Risk/Watch/ACK را خارج از دامنه نگه می‌دارد.

## V1 — مسیر واقعی تولید `lastPurchaseDate`

بررسی نسخه‌ی قبلی نشان داد `calc.js` در `_behaviorOfferedProductStats(visits)` فقط `lastOfferedDate` را از ویزیت‌ها تولید می‌کرد و `lastPurchaseDate` اصلاً در `offeredProductStats` وجود نداشت. بنابراین شرط قبلی در `buildProductRejectionInsights` ورودی واقعی نداشت.

اصلاح واقعی در `js/calc.js` انجام شد:

- تابع `_behaviorOfferedProductStats` اکنون `invs` را نیز دریافت می‌کند.
- از `data.invoices[].items[]` فقط آیتم‌های دارای `productId` و `qty > 0` استفاده می‌شود.
- برای هر محصول، جدیدترین `invoice.date` به‌عنوان `lastPurchaseDate` ثبت می‌شود.
- در `customerBehavior` مسیر واقعی با `_behaviorOfferedProductStats(visits, invs)` فراخوانی می‌شود.

مسیر مصرف:

```text
customerBehavior
  → offeredProductStats
  → buildProductRejectionInsights
  → customerFocusHtml
```

در `js/views/customer.js`، تابع `buildProductRejectionInsights` فقط وقتی حذف انجام می‌دهد که هر دو تاریخ با `isValidISODateOnly` معتبر باشند و `lastPurchaseDate > lastOfferedDate` باشد. تاریخ خالی یا نامعتبر باعث حذف نمی‌شود.

### تست اجرایی V1

در `tests/addendum_v1_v9.test.js`، خطوط ۱۷ تا ۳۷:

- `calc.js` واقعی در VM اجرا می‌شود.
- `customerBehavior` واقعی با فاکتور و ویزیت واقعی‌نما اجرا می‌شود.
- سپس `buildProductRejectionInsights` واقعی فراخوانی می‌شود.
- assertion واقعی:

```js
assert(!focusText.includes('کالای V1'));
assert(focusText.includes('کالای نامعتبر'));
```

## V2 — متن دکمه و متن توضیح اقدام

در `js/views/customer.js`، Quick View همچنان امضای واقعی زیر را استفاده می‌کند:

```js
calculateCustomerAction(cid, priority, { ctx: ctx })
```

متن توضیح اقدام از `recommendedAction.action` جدا شده و متن دکمه طبق mapping صریح ساخته می‌شود:

- `visit / follow_up` → `ثبت ویزیت`
- `payment_followup` → `ثبت پرداخت`
- `check_followup` → `ثبت چک`
- سایر انواع مانند `manager_review / investigate / call` → `مشاهده جزئیات`

fallback `openAddCheck` به Customer Detail باقی مانده است.

تست mapping در خطوط ۹۴ تا ۱۰۲ تست، source-level است. کلیک واقعی DOM در این محیط اجرا نشده و **NOT PROVABLE** است.

## V4 — مسیر واقعی ACK و Story

تست قبلی فقط یک `ackActionEffect: 'change_to'` مصنوعی داشت و سناریوی کامل را اثبات نمی‌کرد. در این بسته، تست واقعی در خطوط ۳۹ تا ۷۰ انجام می‌شود:

```text
createAck(competitor)
createAck(visit_reviewed, scope=account)
→ getActiveAcksForCustomer
→ applyAcksToSignals
→ buildCustomerStory
```

هر دو ACK روی مشتری `c1` و محصول/خانواده‌ی `p1` اعمال می‌شوند. competitor با `keepAlert` فعال است؛ assertionها بررسی می‌کنند:

```js
assert.strictEqual(applied.ackDecision, 'competitor');
assert(applied.ackActionEffect === 'change_to');
assert(!applied.ackReviewed);
assert(story.summary.length > 0);
assert(story.themes.risk === 'تأخیر خرید کالا');
```

این تست نشان می‌دهد competitor فعال، سیگنال را از Story حذف نمی‌کند و `visit_reviewed` نیز به‌خاطر استثنای competitor/main-product آن را پنهان نمی‌کند.

## V5 — `still_stock + ours`

معنای داده‌ی `stockSource` در مسیر واقعی ACK بررسی شد. `createAck` با `decision: 'still_stock'` و `stockSource: 'ours'` اجرا می‌شود.

assertionهای اجرایی در خطوط ۷۲ تا ۷۶:

```js
assert(oursAck && oursAck.effects.action === 'suppress');
assert.strictEqual(oursAck.effects.riskDelta, -30);
assert.strictEqual(oursAck.effects.priorityDelta, -5);
```

هیچ threshold یا rule مالی/Risk جدیدی تعریف نشده است.

## V6 — `receivableAttention`

Customer Detail از `ctx.receivableAttention()` استفاده می‌کند. تست این مرحله در خطوط ۷۸ تا ۹۲، `computation-bank.js` واقعی و `createComputationContext` واقعی را با داده‌ی واقعی‌نما اجرا می‌کند و assertion می‌کند:

```js
assert(att.byCustomerId.c1);
assert.strictEqual(att.byCustomerId.c1.refKind, 'no_payment_history');
assert.strictEqual(att.byCustomerId.c1.daysSince, 20);
```

متن UI از همان `attRow` واقعی تولیدشده استفاده می‌کند؛ آستانه‌ها و فرمول جدیدی اضافه نشده‌اند.

## V7 — Opportunity در Focus و ترتیب گروهی

در `customerFocusHtml`، تابع `calculateCustomerPriority` با همان context اجرا می‌شود و Opportunityهای واجدشرایط از `focusPriority.signals` وارد candidateها می‌شوند.

فیلتر واجدشرایط:

```js
sg.type === 'opportunity'
sg.ackActionEffect !== 'suppress'
!sg.ackReviewed
```

گروه‌ها با bucket زیر مرتب می‌شوند:

```text
Risk / Watch       bucket 0
Opportunity        bucket 1
Rejection          bucket 2
```

ظرفیت موجود `slice(0, 3)` و deduplication بر اساس key حفظ شده است. Opportunity محصول متفاوت به‌علت key مستقل حذف نمی‌شود و Risk در bucket بالاتر قرار می‌گیرد.

تست موجود در خطوط ۱۰۹ تا ۱۱۴، insertion/filter/order را source-level بررسی می‌کند. تست runtime با DOM واقعی که هم‌زمان Risk و Opportunity متفاوت را render کند در این محیط اجرا نشده و **NOT PROVABLE** است.

## V8 و V9

V8 بدون بازطراحی بصری تغییر نکرده است: List فقط critical/high badge دارد و Detail/Quick View برچسب کامل خود را نگه می‌دارند. در این مرحله `getRiskBadge` مستقلی در کد پروژه پیدا نشد.

V9 با جست‌وجوی متن legacy در فایل‌های JavaScript بررسی شد؛ وابستگی به «پیگیری‌های منتظر» باقی نمانده است.

## تست‌های اجراشده

### تست رفتاری

```bash
node tests/addendum_v1_v9.test.js
```

خروجی موفق:

```text
Acceptance tests passed: V1(real path), V2(contract), V3(contract), V4(real ACK path), V5(real ACK effect), V6(real attention), V7(contract), V8/V9
```

### syntax-check

با `node --check` تمام ۵۵ فایل JavaScript غیر minified زیرشاخه‌ی `js` بررسی شدند و موفق بودند.

### تست‌های source-level

برای V2، V3 و V7 assertions متن سورس اجرا شده‌اند، اما این‌ها جایگزین تست DOM یا render واقعی نیستند و در گزارش با عنوان contract/source-level مشخص شده‌اند.

## موارد NOT PROVABLE

1. کلیک واقعی دکمه‌های Quick View در DOM و اجرای navigation/open form.
2. رندر واقعی تاریخ شمسی کامل از `faDate` در مرورگر.
3. تست DOM واقعی Focus با Risk و Opportunity متفاوت و بررسی ترتیب نهایی HTML.
4. تست تصویری CSS و مرورگر واقعی.

## Diff تکمیلی

فایل `ADDENDUM_COMPLETION.diff` diff این مرحله نسبت به آخرین ZIP پچ‌شده‌ی قبلی است. تغییرات تکمیلی شامل:

- اتصال `lastPurchaseDate` واقعی در `calc.js`.
- ورود Opportunity به Focus و bucket ordering در `customer.js`.
- جداسازی متن توضیح اقدام از متن دکمه‌ی Quick View.
- style کوچک توضیح اقدام در CSS.
- تبدیل تست‌ها از mock صرف به مسیرهای اجرایی واقعی V1، ACK، still_stock و receivableAttention.

رنگ داینامیک Story در diff تکمیلی وجود ندارد.
