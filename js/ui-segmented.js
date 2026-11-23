/* js/ui-segmented.js — یک قانون برای همهٔ سگمنت‌های پروژه (شبیه سگمنت iOS).
   هر کانتینر سگمنت (هر جا کلاس‌های زیر باشد) با کلاس `ios-seg` علامت می‌خورد،
   هر دکمهٔ آن `ios-seg-item`، و دکمهٔ فعال `ios-on`. یک «لنز» (::before در CSS)
   با CSS variables ‏--seg-x / --seg-w روی دکمهٔ فعال می‌نشیند و با منحنی فنری
   جابه‌جا می‌شود. منطق هیچ view تغییر نمی‌کند: فعال بودن از کلاس/aria خود view
   خوانده می‌شود، پس هر view که حالت فعال را عوض کند، لنز هم دنبال می‌کند. */
(function () {
  'use strict';

  var SEG_SELECTOR = '.segmented-control, .gc-seg, .rp-seg, .bp-watch-filters';

  function isOn(el) {
    return el.classList.contains('active') ||
      el.classList.contains('is-active') ||
      el.getAttribute('aria-selected') === 'true' ||
      el.getAttribute('aria-pressed') === 'true';
  }

  function sync(seg) {
    if (!seg.classList.contains('ios-seg')) seg.classList.add('ios-seg');
    var on = null;
    Array.prototype.forEach.call(seg.children, function (c) {
      if (!c.classList.contains('ios-seg-item')) c.classList.add('ios-seg-item');
      var yes = isOn(c);
      if (c.classList.contains('ios-on') !== yes) c.classList.toggle('ios-on', yes);
      if (yes) on = c;
    });
    // ios-has-on لنز را نمایان می‌کند. (در نسخهٔ قبلی این کلاس جا افتاده بود و
    // لنز همیشه opacity:0 می‌ماند.) فقط در صورت تغییر، کلاس عوض می‌شود تا حلقهٔ
    // MutationObserver ایجاد نشود.
    var hasOn = !!on;
    if (seg.classList.contains('ios-has-on') !== hasOn) seg.classList.toggle('ios-has-on', hasOn);
    if (on && on.offsetWidth > 0) {
      seg.style.setProperty('--seg-x', on.offsetLeft + 'px');
      seg.style.setProperty('--seg-w', on.offsetWidth + 'px');
      if (!seg.classList.contains('ios-ready')) {
        // اولین نقاشی بدون انیمیشن؛ بعد از آن لنز با فنر حرکت می‌کند.
        seg.classList.add('ios-ready');
      }
    }
  }

  function syncAll() {
    document.querySelectorAll(SEG_SELECTOR).forEach(sync);
  }

  var frame = 0;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = 0; syncAll(); });
  }

  function start() {
    syncAll();
    new MutationObserver(schedule).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'aria-pressed']
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.__iosSegSync = schedule;
})();
