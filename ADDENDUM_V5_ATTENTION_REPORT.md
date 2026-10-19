# گزارش تکمیل محدود نسخه تحویلی

مبنای کار دقیقاً ZIP تحویلی قبلی `Bagheri-crm-mainACKfinalv3-completion-final.zip` بود و قبل از تغییرات با `unzip -t` سالم بودن آن بررسی شد. نسخه پایه یا پچ قبلی دوباره‌سازی نشد.

## ایراد تأییدشده

دو مورد تأیید شد:

1. `buildProductRejectionInsights` هر rejection را نگه می‌داشت؛ بنابراین محصولی که تمام شواهد مثبت آن `still_stock + ours` بود، در Rejection و در نتیجه در مسیر Focus نیز باقی می‌ماند.
2. Quick View از `ctx.receivableAttention().byCustomerId[cid]` خط خلاصه attention مالی نداشت، در حالی که همان داده در Detail وجود داشت.

## اصلاحات انجام‌شده

### still_stock + ours

در `js/views/customer.js` تابع مشترک `isPureOursStillStock(st)` اضافه شد و در `buildProductRejectionInsights` قبل از ساخت خروجی اعمال شد.

حذف فقط وقتی انجام می‌شود که همه شواهد مثبت و سازگار باشند:

- `rejectionReasons.still_stock > 0`
- تعداد `still_stock` با `stillStockSources.ours` برابر باشد
- `competitor` و `unknown` مقدار مثبت نداشته باشند
- هیچ علت دیگری مقدار مثبت نداشته باشد

کلیدهای صفر، نبود داده، منبع نامشخص، competitor و علت‌هایی مانند price باعث حذف نمی‌شوند. چون Focus از `buildProductRejectionInsights` استفاده می‌کند، منطق موازی یا تکراری ساخته نشده است.

### Quick View attention

در `js/views/customer.js` تابع قالب‌بندی مشترک `receivableAttentionSummary` اضافه شد. Detail از همان formatter استفاده می‌کند و Quick View نیز فقط رکورد مشتری بازشده را از مسیر زیر می‌خواند:

```text
ctx.receivableAttention().byCustomerId[cid]
```

خط خلاصه فقط در صورت وجود attention واجدشرایط نمایش داده می‌شود. برای `no_payment_history` متن مقرر حفظ شده است:

```text
N روز از فاکتور آخر · پرداختی ثبت نشده
```

هشدار موجود `اقدام فوری · چک برگشتی فعال` دست‌نخورده باقی ماند.

یک CSS حداقلی برای `.bp-qv-attention` با token موجود اضافه شد.

## فایل‌های تغییرکرده

- `js/views/customer.js`: فیلتر خالص `still_stock + ours`، formatter attention، نمایش attention در Quick View و test seamهای محدود.
- `css/visual-grammar-pages.css`: استایل حداقلی خط attention Quick View.
- `sw.js`: افزایش نسخه کش از `baqeri-shell-v85` به `baqeri-shell-v86` چون JS/CSS استاتیک تغییر کرده‌اند؛ فهرست precache نیاز به تغییر نداشت.
- `tests/addendum_v1_v9.test.js`: تست‌های رفتاری still_stock در Rejection و Focus و تست attention/formatter تکمیل شد.
- `ADDENDUM_V5_ATTENTION_REPORT.md`: این گزارش.
- `ADDENDUM_V5_ATTENTION.diff`: diff نسبت به ZIP ورودی، بدون احتساب خود گزارش و diff.

## مواردی که از قبل درست بودند و دست‌نخورده ماندند

- تولید واقعی `lastPurchaseDate` از فاکتورها.
- V2 mapping مستقل action button.
- منبع مشترک `DECISION_LABELS` و `faDate` برای ACK.
- ACK competitor همراه `visit_reviewed`.
- Opportunity و ترتیب bucketهای Focus.
- رفتار badgeها؛ `getRiskBadge` ساخته نشد.
- محاسبات مالی، بدهی، تخصیص پرداخت، آستانه‌ها، ضرایب Risk/Priority و قواعد اصلی Watch/ACK.
- رنگ داینامیک Customer Story.

## تست‌ها و نتایج

### PASS — تست رفتاری

```bash
node tests/addendum_v1_v9.test.js
```

نتیجه:

```text
Acceptance tests passed: V1(real path), V2(contract), V3(contract), V4(real ACK path), V5(real Focus/Rejection path), V6(real attention/formatter), V7(contract), V8/V9
```

تست‌های جدید بخش اصلی این مأموریت، مسیر واقعی `calc.js → customerBehavior → buildProductRejectionInsights → customerFocusHtml` را اجرا می‌کنند و موارد زیر را بررسی می‌کنند:

- ours خالص از Rejection و Focus خارج می‌شود.
- competitor، price، unknown و نبود stockSource حذف نمی‌شوند.
- customer دارای attention خط صحیح می‌گیرد.
- customer بدون attention خط نمی‌گیرد.
- attention از مشتری دیگر نشت نمی‌کند.
- عبارت `no_payment_history` دقیقاً بررسی می‌شود.

### PASS — syntax-check

```bash
node --check 55 فایل JavaScript غیر minified
```

نتیجه:

```text
syntax-check passed: 55 files
```

### PASS — سلامت ZIP

```bash
unzip -tq Bagheri-crm-mainACKfinalv3-v5-attention-final.zip
```

بدون خطا انجام شد.

### Source-check

بررسی source-level برای حفظ V1، V2، V3، V7، badgeها و عدم تغییر رنگ داینامیک Story انجام شد.

### NOT PROVABLE

- کلیک و رندر کامل Quick View در مرورگر واقعی در این محیط اجرا نشد؛ تست attention با formatter واقعی و داده‌ی computation context اجرا شده، اما تست DOM مرورگر نیست.
- بررسی بصری نهایی CSS در مرورگر واقعی انجام نشد.

هیچ تستی که اجرا نشده باشد PASS اعلام نشده است. نتیجه بسته: **آماده تست کاربری**.
