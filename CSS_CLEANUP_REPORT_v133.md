# گزارش ممیزی و پاک‌سازی CSS — BAGHERI CRM v133

## مبنا و دامنه

- نسخهٔ مرجع مقایسه: `v118`
- نسخهٔ ورودی و مبنای اصلاح: `v132`
- نسخهٔ خروجی: `v133`
- دامنهٔ تغییر: CSS، ارجاعات stylesheet در `index.html` و نام کش/فهرست precache در `sw.js`
- هیچ فایل منطق برنامه در `js/` تغییر نکرده است. در `sw.js` فقط نسخهٔ کش، چهار ورودی precache و کامنت تغییر نسخه اصلاح شده‌اند.

### نتیجهٔ مقایسهٔ v118 و v132

هفت فایل CSS مشترک در دو نسخه از نظر محتوای بایت‌به‌بایت یکسان بودند:

- `css/00-chrome.css`
- `css/app.css`
- `css/visual-grammar.css`
- `css/visual-grammar-components.css`
- `css/visual-grammar-pages.css`
- `css/10-disclosure.css`
- `css/shamsi-calendar.css`

چهار فایل `11` تا `14` در v118 وجود نداشتند و در v132 به‌عنوان لایه‌های افزوده‌شده وجود داشتند. بنابراین ادغام بر اساس قواعد همین چهار فایل و وضعیت واقعی مارکاپ/JS نسخهٔ v132 انجام شد؛ نه بر اساس حدس دربارهٔ تاریخچهٔ تغییرات.

> اصلاح شمارش گزارش اولیه: در بررسی اولیه، هفت فایل CSS مشترک یکسان بودند، نه شش فایل. همچنین شمارش خام کلاس‌های «پیدا نشد» به روش استخراج و تشخیص کلاس‌های پویا حساس است؛ اعداد اسکریپت اولیه به‌عنوان فهرست حذف قطعی استفاده نشدند.

---

## ۱. فایل‌های تغییرکرده و حذف‌شده

### تغییرکرده

1. `css/00-chrome.css`
2. `css/app.css`
3. `css/visual-grammar.css`
4. `css/visual-grammar-components.css`
5. `css/visual-grammar-pages.css`
6. `css/10-disclosure.css`
7. `index.html`
8. `sw.js`

### حذف‌شده

1. `css/11-v119-prospects.css`
2. `css/12-ios-segmented.css`
3. `css/13-list-contract.css`
4. `css/14-header-ios26.css`

### اضافه‌شده

- `CSS_CLEANUP_REPORT_v133.md` — همین گزارش، داخل ZIP خروجی.

---

## ۲. گزارش دقیق حذف، ادغام و نگه‌داشت

### `css/00-chrome.css`

**ادغام‌شده از `14-header-ios26.css`:**

- قواعد اصلی `header`: مقدارهای نهایی شفافیت، حذف خط زیر هدر و حذف سایه/blur خود هدر در همان قاعدهٔ اصلی ادغام شد.
- `header::before`: blur و mask تدریجی نسخهٔ iOS 26 در قاعدهٔ موجود جایگزین شد.
- `html[data-theme="dark"] header::before`: پس‌زمینهٔ شفاف حفظ شد.
- `@media (prefers-reduced-transparency: reduce)`: پس‌زمینهٔ سطح و حذف blur برای هدر و pseudo-element حفظ شد.

**حذف‌شده:**

- بلوک `@supports not (...)` مربوط به پس‌زمینهٔ fallback هدر حذف شد؛ در cascade نسخهٔ v132، قواعد `14-header-ios26.css` که بعد از آن بارگذاری می‌شدند، همان declarationها را با همان selector یا `!important` بازنویسی می‌کردند. نتیجهٔ نهایی cascade حفظ شده است.

**نگه‌داشته‌شده:**

- هندسهٔ هدر، safe-area، `--header-progress`، فشردگی عنوان، تاریخ، دکمهٔ بازگشت، دکمهٔ افزودن، حالت تاریک دکمه‌ها و مخفی‌سازی FAB دست‌نخورده ماندند.

### `css/app.css`

**حذف‌شده به‌عنوان کد قدیمی و بدون مصرف:**

- `.tx-toolbar`
- `.tx-toolbar-select` در قاعدهٔ پایه
- `.tx-toolbar-label`
- `.tx-toolbar-select` در media query عرض حداکثر 360px
- selector fragment مربوط به `.tx-toolbar-select` از گروه استایل کنترل‌ها
- `.prospect-subnav`
- `.eval-q-options .eval-q-opt`
- `.chip-wrap.eval-q-options .chip-opt`
- `.eval-q-options` به‌عنوان wrapper

**نگه‌داشته‌شده:**

- `.eval-q-opt` مستقل؛ این کلاس هنوز در markup گزینه‌های فرم ارزیابی استفاده می‌شود.
- `.action-row-*` و `.action-urgency-*`؛ نام کلاس‌ها با `urgency` در `dashboard.js` ساخته می‌شود.
- `.rank-pill-*`؛ رتبه با `safeRank` در `prospect-scoring.js` ساخته می‌شود.
- `.watch-severity-*`؛ پسوند کلاس از `o.level` در `watches.js` ساخته می‌شود.
- سایر قواعد عمومی چیپ‌ها، فرم‌ها و فاکتورها.

### `css/visual-grammar.css`

**حذف‌شده:**

- selector fragment مربوط به `html[data-theme="dark"] .tx-toolbar-select` از دو گروه قواعد dark mode؛ کنترل `tx-toolbar-select` دیگر در مارکاپ/JS استفاده نمی‌شود.

**نگه‌داشته‌شده:**

- قواعد dark mode برای فیلدهای واقعی، جستجو، ورودی‌های موجودی و تخفیف.
- قواعد `action-urgency-*` و سایر وضعیت‌هایی که به‌صورت پویا ساخته می‌شوند.

### `css/visual-grammar-components.css`

**حذف‌شده به‌عنوان استایل جایگزین‌شده یا بدون مصرف:**

- `.tx-toolbar-select` از گروه قواعد کنترل‌ها و selectها
- قاعدهٔ مستقل `.tx-toolbar-select`
- `.tx-toolbar`
- `.tx-toolbar-label`
- `.segmented-control` قدیمی
- `.segmented-control::-webkit-scrollbar`
- `.segmented-control > .chip`
- `.segmented-control > .chip.active`
- `.segmented-control .bp-watch-chip`
- `.segmented-control .bp-watch-chip-count`
- `html[data-theme="dark"] .segmented-control > .chip.active`
- selector fragment مربوط به `.chip.active` از گروه حالت فعال چیپ‌ها

**ادغام‌شده از `12-ios-segmented.css`:**

- `.ios-seg` و حالت dark
- لنز `::before` و وضعیت‌های `ios-has-on` و `ios-ready`
- `.ios-seg-item` و `ios-on`
- اندازه‌های `rp-seg-sm` و `gc-seg`
- شمارندهٔ چیپ‌های Watch
- رفتار active و touch

**نگه‌داشته‌شده:**

- `.chip-opt.selected`؛ این کلاس برای گزینه‌های انتخابی خارج از سگمنت نیز استفاده می‌شود.
- `.segmented-control#check-sides > .chip`؛ قرارداد اختصاصی دو گزینهٔ انتخاب نوع چک حفظ شد.
- قواعد اختصاصی `#customer-chips` و `#invoice-chips`؛ به‌دلیل specificity بالاتر و رفتار اندازه‌گذاری فعلی حذف نشدند.
- `.badge.tone-success`، `.badge.tone-warning` و `.badge.tone-danger`؛ مقدار `tone` از دادهٔ badge ساخته می‌شود و نام کلاس به‌صورت کامل در JS وجود ندارد.

### `css/visual-grammar-pages.css`

**حذف‌شده به‌عنوان کد قدیمی و جایگزین‌شده:**

- `main > .tx-toolbar`
- `.bp-sort-label`
- `.bp-customer-secondary-filters`
- `.bp-customer-health-value.radar-risk-critical`
- `.bp-customer-health-value.radar-risk-high`
- `.bp-customer-health-value.radar-risk-medium`
- `.bp-qv-health.radar-risk-critical`
- `.bp-qv-health.radar-risk-high`
- `.bp-qv-health.radar-risk-medium`
- قواعد گروه `.cl-tools`
- قواعد `.cl-count`
- قواعد وابسته به `.cl-tools .tx-toolbar-select` و `.tx-toolbar-label`
- `.eval-q-options .chip-opt`
- `.eval-q-options .chip-opt.selected`
- قواعد کارت قدیمی `#payment-summary`، `#check-summary`، `#visit-summary` و `#prospect-summary`
- قواعد فرزندهای `.card` داخل summaryهای قدیمی
- قواعد border قدیمی summaryها در dark mode
- تمام قواعد `.check-tools-row`

**ادغام‌شده از `11-v119-prospects.css`:**

- تنظیمات جستجوی صفحهٔ مغازه‌های بالقوه
- فشرده‌سازی کارت هدف روزانه
- نوار ابزار و مرتب‌سازی موقعیت
- کپسول موقعیت و شمارنده
- اجزای برگهٔ موقعیت
- گروه‌ها و ردیف‌های iOS فرم ارزیابی
- شمارهٔ گزینه‌ها و جداکنندهٔ پاسخ‌ها

**ادغام‌شده از `13-list-contract.css`:**

- ردیف جستجو و دکمهٔ فیلتر
- badge شمارندهٔ فیلتر
- ردیف خلاصه و مرتب‌سازی
- `lp-summary`، `lp-count`، `lp-sep`، `lp-flag` و حالت dark
- آیکون SVG و حالت active دکمهٔ فیلتر

**نگه‌داشته‌شده:**

- `.cs-dot-success` و `.cs-dot-warning`؛ `customer.js` نام این کلاس‌ها را با `HIST_DOT_TONE` می‌سازد.
- `.watch-reason` و `.watch-reviewed`؛ در JS مصرف دارند.
- `.is-*`، `.pp-*` و سایر وضعیت‌های مبتنی بر مقدارهای runtime حذف نشدند.
- `.pl-*`های موجود در لایهٔ 11، با وجود اینکه بعضی نام‌ها در جست‌وجوی سادهٔ JS دیده نمی‌شوند، مطابق فهرست کلاس‌های فعال کاربر نگه داشته شدند.

**نکته دربارهٔ `radar-risk-*`:**

در JS/HTML نسخهٔ v132، این prefix به‌صورت literal یا با الحاق رشته‌ای ساخته نمی‌شود؛ وضعیت رابطهٔ فعلی از خانوادهٔ `radar-rel-*` استفاده می‌کند. بنابراین قواعد قدیمی `radar-risk-*` حذف شدند.

### `css/10-disclosure.css`

**حذف‌شده:**

- `#main.customer-detail-view a.cd-push-back`
- `#main.customer-detail-view a.cd-push-back svg`

این دو selector در markup یا JS نسخهٔ v132 یافت نشدند.

**نگه‌داشته‌شده:**

- `cd-push-row`، `cd-push-page`، قواعد disclosure و قواعد صفحهٔ جزئیات مشتری.
- قواعد اختصاصی گزارش‌ها و `rp-seg` دست‌نخورده ماندند.

### `index.html`

**حذف‌شده از stylesheet links:**

- `11-v119-prospects.css`
- `12-ios-segmented.css`
- `13-list-contract.css`
- `14-header-ios26.css`

تمام stylesheetهای اصلی باقی ماندند. ترتیب باقی‌ماندهٔ بارگذاری حفظ شد.

### `sw.js`

**تغییرات:**

- `CACHE_NAME`: از `baqeri-shell-v132` به `baqeri-shell-v133`
- چهار فایل حذف‌شده از `PRECACHE_URLS` خارج شدند.
- کامنت `CHANGED: v132 -> v133` اضافه شد.
- تعداد ورودی‌های precache از 83 به 79 رسید؛ هر 79 مسیر به فایل واقعی موجود در ZIP اشاره می‌کند.

هیچ منطق install/activate/fetch، مسیر داده، IndexedDB، بکاپ یا منطق مالی تغییر نکرد.

---

## ۳. کلاس‌های پویا و مواردی که عمداً حذف نشدند

این کلاس‌ها در بررسی ساده ممکن است «پیدا نشده» به نظر برسند، اما در زمان اجرا ساخته می‌شوند یا به‌صورت پویا پسوند می‌گیرند:

- `tone-*` — مقدار `badge.tone`
- `action-row-*` و `action-urgency-*` — مقدار `urgency`
- `rank-pill-*` — مقدار رتبهٔ محاسبه‌شده
- `watch-severity-*` — مقدار `o.level`
- `cs-dot-*` — مقدار `HIST_DOT_TONE`
- `is-*` — مقدارهای وضعیت هدف روزانه
- `pp-*` — tone خروجی برنامهٔ ویزیت
- `dash-act` — در JS استفاده می‌شود

همچنین `segmented-control` از markup حذف نشده است؛ این کلاس همچنان hook مربوط به `js/ui-segmented.js` است. فقط استایل قدیمی آن با استایل جدید `ios-seg` جایگزین شد. کلاس `active` نیز در markup و منطق viewها باقی است؛ نمایش فعال توسط کلاس‌های افزوده‌شدهٔ سیستم iOS انجام می‌شود.

---

## ۴. اعتبارسنجی فنی

| بررسی | نتیجه |
|---|---|
| تجزیهٔ CSS همهٔ فایل‌ها | PASS — بدون خطای parse |
| `node --check` فایل‌های JS و SW | PASS — بدون خطای syntax |
| فایل‌های JS داخل `js/` | 63 فایل، بدون تغییر |
| مسیرهای محلی ارجاع‌شده در `index.html` | PASS — بدون فایل مفقود |
| لینک stylesheetهای حذف‌شده | PASS — هیچ‌کدام باقی نمانده |
| مسیرهای `PRECACHE_URLS` | PASS — 79 از 79 موجود |
| ارجاع precache به فایل‌های حذف‌شده | PASS — صفر |
| `tests/watch-ack-integrity/run.js` | PASS — 56 موفق، 0 ناموفق |

### تست‌های موجود که از قبل در v132 هم شکست داشتند

- `tests/header-scroll/check.js`: در v132 و v133 در اولین assertion مربوط به متن تاریخ شمسی شکست می‌خورد. این شکست با تغییر CSS ایجاد نشده؛ اجرای همان تست روی ZIP اصلی v132 نیز همین نتیجه را داد.
- `tests/quick-view-summary/run.js`: در v132 و v133 هر دو 18 موفق و 3 ناموفق دارند. این تست مربوط به منطق خلاصهٔ پیش‌ویزیت است و در این پاک‌سازی تغییر داده نشده است.

تست رندر واقعی Safari/iPhone در این محیط اجرا نشده است؛ بنابراین حفظ دقیق ظاهر باید با چک‌لیست گوشی تأیید شود.

---

## ۵. ریسک‌ها و چک‌لیست تست روی iPhone

1. **هدر:** حالت عادی، اسکرول و header-condensed، جای تاریخ، عنوان، دکمهٔ برگشت و دکمهٔ افزودن.
2. **هدر در حالت‌های دسترس‌پذیری:** تم تاریک و تنظیم iOS برای Reduce Transparency.
3. **سگمنت‌ها:** چک‌ها، مشتریان، مغازه‌های بالقوه، فاکتورها، پرداخت‌ها، تأمین‌کنندگان، کالاها، ویزیت‌ها، Watch و گزارش‌ها؛ لنز اولیه و حرکت آن پس از انتخاب.
4. **کپسول خلاصه:** شمارنده‌ها، جداکننده‌ها، فلگ‌های هشدار و مرتب‌سازی در صفحات فهرست.
5. **برگهٔ موقعیت:** بازشدن از فیلتر مشتری و مغازهٔ بالقوه، انتخاب مسیر/منطقه، بازگشت، مدیریت و بستن.
6. **فرم ارزیابی:** انتخاب گزینه‌ها، نمایش selected، شماره‌گذاری، پاسخ‌های خلاصه و ویرایش پاسخ.
7. **حالت تاریک:** هدر، سگمنت، summary، badge فیلتر، فرم ارزیابی و برگهٔ موقعیت.
8. **حالت آفلاین:** پس از یک بار بارگذاری آنلاین v133، اپ را ببندید و دوباره از Home Screen در حالت آفلاین باز کنید تا کش جدید و فایل‌های ادغام‌شده بررسی شوند.

## جمع‌بندی

این خروجی یک پاک‌سازی ساختاری است، نه بازطراحی. چهار لایهٔ CSS حذف شده‌اند، قواعدشان در فایل‌های اصلی قرار گرفته‌اند، قواعد جایگزین‌شدهٔ تأییدشده حذف شده‌اند و منطق JS دست‌نخورده مانده است. تأیید نهایی ظاهر به تست Safari روی گوشی نیاز دارد.
