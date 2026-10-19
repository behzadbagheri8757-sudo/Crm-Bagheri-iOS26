# گزارش اجرای Addendum نهایی V1 تا V9

تاریخ اجرای بررسی: 2026-10-19

## تغییرات اعمال‌شده

- **V1:** در `buildProductRejectionInsights` مقایسه‌ی `lastPurchaseDate` و `lastOfferedDate` فقط پس از اعتبارسنجی واقعی الگوی `YYYY-MM-DD` انجام می‌شود. اگر هر تاریخ خالی، `null` یا نامعتبر باشد، آیتم حذف نمی‌شود. اگر خرید معتبر بعد از پیشنهاد معتبر باشد، محصول از Focus حذف می‌شود.
- **V2:** Quick View امضای واقعی `calculateCustomerAction(cid, precomputedPriority, { ctx })` را استفاده می‌کند. دکمه‌ی اقدام پیشنهادی mapping کامل `visit/follow_up`، `payment_followup`، `check_followup` و مسیر مشاهده‌ی جزئیات برای سایر انواع را دارد. اگر `openAddCheck` موجود نباشد، به Customer Detail می‌رود. handler جدید در همان event delegation موجود overlay پیاده‌سازی شده و listener جداگانه‌ی متداخل اضافه نشده است.
- **V3:** `DECISION_LABELS` از `ack.js` روی global export شده و Quick View از همان برچسب‌ها استفاده می‌کند. تاریخ ACK با `faDate` نمایش داده می‌شود.
- **V4:** Customer Story فرصت‌هایی را که ACK فعال competitor دارند حذف نمی‌کند؛ فقط Opportunityهای suppress‌شده یا reviewed کنار گذاشته می‌شوند.
- **V6:** متن `no_payment_history` به «N روز از فاکتور آخر · پرداختی ثبت نشده» تغییر کرد. چک برگشتی فعال در Quick View برچسب قرمز «اقدام فوری · چک برگشتی فعال» دارد.
- **V7:** Opportunity در Action/Priority/Story فقط وقتی معتبر است که `ackActionEffect !== 'suppress'` و `ackReviewed` نداشته باشد.
- **V8:** در List فقط critical و high badge دارند. medium و low در List badge ندارند؛ Detail و Quick View برچسب کامل را نگه می‌دارند. این رفتار عمدی است.
- **V9:** متن UI مربوط به پیگیری‌های قبلی به «پیگیری‌های باز» یکسان‌سازی شد و جست‌وجوی وابستگی به «پیگیری‌های منتظر» و «پیگیری باز» در فایل‌های JavaScript نتیجه‌ای نداشت.

دامنه‌ی رنگ داینامیک Customer Story تغییر نکرده است.

## تست‌هایی که واقعاً اجرا شدند

فرمان زیر با موفقیت اجرا شد:

```bash
node tests/addendum_v1_v9.test.js
```

خروجی:

```text
Addendum tests passed: T-C1, T-C4, T-C9, T-V3-a, T-V4, T-V6, T-V7, V8/V9
```

در این تست، **T-C1** با اجرای واقعی `buildProductRejectionInsights` بررسی شد: محصول «کالای V1» پس از خرید معتبر حذف شد و محصول دارای تاریخ نامعتبر باقی ماند. همچنین برای V4/V7 یک runtime proof برای Story اجرا شد که Opportunity دارای اثر competitor باقی می‌ماند و Opportunity reviewed وارد Story نمی‌شود.

## تست‌هایی که فقط syntax-check شدند

با `node --check` تمام **55 فایل JavaScript غیر minified** زیرشاخه‌ی `js` بررسی شدند و همگی موفق بودند. این بررسی فقط صحت syntax را ثابت می‌کند و رفتار مرورگر، IndexedDB یا event handler را اثبات نمی‌کند.

## موارد NOT PROVABLE

موارد زیر در محیط فعلی NOT PROVABLE هستند، چون اجرای تعاملی کامل مرورگر و دیتابیس واقعی برنامه انجام نشد:

1. کلیک واقعی هر چهار نوع دکمه‌ی Quick View و fallback به Customer Detail در DOM واقعی.
2. نمایش تصویری کامل تاریخ شمسی در همه‌ی locale/fontهای مرورگر؛ کد از `faDate` استفاده می‌کند و syntax/runtime seam بررسی شده است.
3. سناریوی کامل ACK competitor از ایجاد رکورد واقعی در IndexedDB تا اعمال آن در تمام مسیرهای Risk/Action/Story.
4. رندر نهایی List/Detail/Quick View با داده‌ی واقعی کاربر و CSS در مرورگر.

## دامنه‌ی فایل‌های تغییرکرده

فقط فایل‌های مرتبط با این پچ تغییر یا اضافه شدند:

- `js/views/customer.js`
- `js/views/customers.js`
- `js/app.js`
- `js/views/dashboard.js`
- `js/views/watches.js`
- `js/intelligence/ack.js`
- `js/intelligence/action.js`
- `js/intelligence/priority.js`
- `js/intelligence/interpretation.js`
- `css/visual-grammar-pages.css`
- `tests/addendum_v1_v9.test.js`
- `ADDENDUM_FINAL_REPORT.md`

بنابراین پاسخ به «آیا فقط فایل‌های مجاز تغییر کرده‌اند؟» **بله، فقط فایل‌های محدوده‌ی همین Addendum تغییر کرده‌اند.**

## اثر بر منطق Risk/Priority/Action/Watch/ACK

- منطق **Risk** تغییر نکرده است.
- منطق **Watch** تغییر نکرده است؛ فقط متن ارائه‌ای پیگیری‌ها یکسان‌سازی شده است.
- منطق **ACK** تغییر نکرده است؛ فقط `DECISION_LABELS` export شده و از آن در Quick View استفاده شده است.
- در **Priority** و **Action**، فیلتر صریح ACK-aware برای Opportunity طبق الزام V7 اضافه شده است؛ بنابراین نمی‌توان صادقانه گفت هیچ منطق Priority/Action تغییر نکرده است. سایر قواعد رتبه‌بندی، Risk، severity و action mapping موجود دست‌نخورده باقی مانده‌اند.
