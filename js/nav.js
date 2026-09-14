/* nav.js — SPA navigation & boot
   UI/Navigation only. Does not change accounting logic.
   Production Freeze: SPA-only navigation.
*/
/** SPA shell is the only supported application shell. */
function isSpaShell() {
  try {
    return !!(document.documentElement && document.documentElement.getAttribute('data-spa-shell') === '1');
  } catch (e) {
    return false;
  }
}

/** Dashboard href: hash on SPA shell, classic page elsewhere. */
function spaDashboardHref() { return '#/dashboard'; }

const NAV_ITEMS = [
  { id: 'dashboard', href: '#/dashboard',     label: 'داشبورد', spaPath: '/dashboard' },
  { id: 'customers', href: '#/customers', label: 'مشتریان', spaPath: '/customers' },
  { id: 'products',  href: '#/products',  label: 'اجناس', spaPath: '/products' },
  { id: 'inventory', href: '#/inventory', label: 'انبار', spaPath: '/inventory' },
  { id: 'suppliers', href: '#/suppliers', label: 'تامین‌کننده‌ها', spaPath: '/suppliers' },
  { id: 'invoices',  href: '#/invoices',  label: 'فاکتورها', spaPath: '/invoices' },
  { id: 'payments',  href: '#/payments',  label: 'پرداخت‌ها', spaPath: '/payments' },
  { id: 'checks',    href: '#/checks',    label: 'چک‌ها', spaPath: '/checks' },
  { id: 'visits',    href: '#/visits',    label: 'ویزیت', spaPath: '/visits' },
  { id: 'prospects', href: '#/prospects', label: 'ارزیابی مغازه', spaPath: '/prospects' },
  { id: 'reports',   href: '#/reports',   label: 'گزارش‌ها', spaPath: '/reports' },
  { id: 'settings',  href: '#/settings',  label: 'تنظیمات', spaPath: '/settings' },
];

/** Primary mobile bottom bar (5 items).
 * iconKey references js/icons.js (AppIcons) — the single icon registry.
 * Each key has an outline (inactive) + solid (active) pair, matching the
 * SF-Symbols-style state change iOS tab bars use, instead of a single
 * fixed-weight glyph. */
const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', href: '#/dashboard', spaPath: '/dashboard', label: 'داشبورد',  iconKey: 'home' },
  { id: 'customers', href: '#/customers', spaPath: '/customers', label: 'مشتریان',  iconKey: 'users' },
  { id: 'products',  href: '#/products',  spaPath: '/products',  label: 'اجناس',    iconKey: 'cube' },
  { id: 'invoices',  href: '#/invoices',  spaPath: '/invoices',  label: 'فاکتورها', iconKey: 'documentText' },
  { id: 'more',      href: '#more',       label: 'بیشتر',        iconKey: 'more' },
];

/** Secondary destinations opened from «بیشتر». iconKey references js/icons.js. */
const MORE_NAV_ITEMS = [
  { id: 'inventory', href: '#/inventory', label: 'انبار', spaPath: '/inventory', iconKey: 'archiveBox' },
  { id: 'suppliers', href: '#/suppliers', label: 'تأمین‌کنندگان', spaPath: '/suppliers', iconKey: 'truck' },
  { id: 'payments',  href: '#/payments',  label: 'پرداخت‌ها', spaPath: '/payments', iconKey: 'banknotes' },
  { id: 'checks',    href: '#/checks',    label: 'چک‌ها', spaPath: '/checks', iconKey: 'documentCheck' },
  { id: 'visits',    href: '#/visits',    label: 'ویزیت مشتریان', spaPath: '/visits', iconKey: 'mapPin' },
  { id: 'prospects', href: '#/prospects', label: 'ارزیابی مغازه‌ها', spaPath: '/prospects', iconKey: 'buildingStorefront' },
  { id: 'game',      href: '#/game',      label: 'مرکز بازی فروش', spaPath: '/game', iconKey: 'trophy' },
  { id: 'reports',   href: '#/reports',   label: 'گزارش‌ها', spaPath: '/reports', iconKey: 'chartBar' },
  { id: 'settings',  href: '#/settings',  label: 'تنظیمات و Backup', spaPath: '/settings', iconKey: 'cog' },
];

/** Renders an icon by key via the central AppIcons registry, falling back to
 * an empty string if icons.js failed to load (never throws, never blocks nav). */
function navIcon(iconKey, active){
  try {
    return (typeof AppIcons !== 'undefined' && AppIcons.render) ? AppIcons.render(iconKey, { active: !!active, size: 22 }) : '';
  } catch (e) { return ''; }
}

function renderSharedNav(activeId){
  const nav = document.getElementById('nav');
  if(!nav) return;
  // SPA shell uses floating bottom nav + More sheet only.
  // Do not render the legacy top text navigation into #nav.
  if(isSpaShell()){
    nav.innerHTML = '';
    nav.removeAttribute('aria-label');
    return;
  }
  nav.innerHTML = NAV_ITEMS.map(t => {
    const active = t.id === activeId ? ' active' : '';
    let href = t.spaPath ? '#' + t.spaPath : t.href;
    return `<a class="nav-link${active}" href="${href}" data-spa-path="${t.spaPath || ''}">${t.label}</a>`;
  }).join('');
  nav.setAttribute('aria-label', 'منوی بالای صفحه');
  nav.querySelectorAll('a[data-spa-path]').forEach(function (a) {
      const path = a.getAttribute('data-spa-path');
      if (!path) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof AppRouter !== 'undefined' && AppRouter.navigate) AppRouter.navigate(path);
        else location.hash = path;
      });
  });
}

function ensureBottomNavDOM(){
  if(!document.getElementById('bottom-nav')){
    const bar = document.createElement('nav');
    bar.id = 'bottom-nav';
    bar.className = 'bottom-nav';
    bar.setAttribute('aria-label', 'منوی پایین');
    document.body.appendChild(bar);
  }
  if(!document.getElementById('more-sheet-root')){
    const root = document.createElement('div');
    root.id = 'more-sheet-root';
    root.innerHTML = `
      <div class="more-overlay" id="more-overlay" hidden></div>
      <div class="more-sheet" id="more-sheet" hidden role="dialog" aria-modal="true" aria-label="منوی بیشتر">
        <div class="more-sheet-handle"></div>
        <div class="more-sheet-title">بیشتر</div>
        <div class="more-sheet-list" id="more-sheet-list"></div>
        <button type="button" class="btn secondary more-sheet-close" id="more-sheet-close">بستن</button>
      </div>`;
    document.body.appendChild(root);
    document.getElementById('more-overlay').addEventListener('click', closeMoreSheet);
    document.getElementById('more-sheet-close').addEventListener('click', closeMoreSheet);
    bindMoreSheetDragToDismiss();
  }
}

// Native-feel swipe-down-to-dismiss, started from the sheet's drag handle only
// (keeps list-item taps below untouched). Delegates to the shared gesture
// helper in js/ui.js (bindSheetDragToDismiss) so the More sheet and every
// generic openSheet() sheet share one drag algorithm instead of two.
function bindMoreSheetDragToDismiss(){
  const sheet = document.getElementById('more-sheet');
  const handle = sheet && sheet.querySelector('.more-sheet-handle');
  if(!sheet || !handle) return;
  if(typeof bindSheetDragToDismiss === 'function'){
    bindSheetDragToDismiss(sheet, handle, closeMoreSheet);
  }
}

function isMoreSectionActive(activeId){
  if(MORE_NAV_ITEMS.some(t => t.id === activeId)) return true;
  return activeId === 'watches';
}

function pinBottomNav(){
  const el = document.getElementById('bottom-nav');
  if(!el) return;
  try{
    if(window.visualViewport){
      const vv = window.visualViewport;
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Only apply inline positioning when keyboard is actually open
      if(keyboardHeight > 80){
        el.style.setProperty('bottom', keyboardHeight + 'px', 'important');
      } else {
        // Clear inline bottom so CSS safe-area rule takes over
        el.style.removeProperty('bottom');
      }
    }else{
      el.style.removeProperty('bottom');
    }
  }catch(e){
    /* ignore — bar still uses CSS bottom:0 */
  }
}

/* iOS 26-style tab-bar minimization: hide secondary labels while the user
   scrolls down, restore them on upward scroll. This is intentionally a
   navigation-only interaction; it never changes route state or page data. */
function bindBottomNavMinimizeOnScroll(){
  if(bindBottomNavMinimizeOnScroll._bound) return;
  bindBottomNavMinimizeOnScroll._bound = true;

  var lastY = window.scrollY || window.pageYOffset || 0;
  var progress = 0;
  var ticking = false;
  var travel = 52;
  var directionThreshold = 1;
  /* No automatic restore on scroll idle: the bar stays at its current
     scroll-linked progress until the user scrolls upward (or taps a tab). */

  function reduceMotion(){
    try{
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }catch(_e){ return false; }
  }

  function setProgress(next, immediate){
    progress = Math.max(0, Math.min(1, next));
    var bar = document.getElementById('bottom-nav');
    if(!bar) return;
    bar.style.setProperty('--bn-minimize-progress', progress.toFixed(3));
    bar.classList.toggle('is-minimized', progress >= .98);
    if(immediate || reduceMotion()) bar.style.setProperty('--bn-minimize-duration', '0ms');
    else bar.style.setProperty('--bn-minimize-duration', '180ms');
    requestAnimationFrame(function(){
      var current = document.getElementById('bottom-nav');
      if(current && typeof positionBnIndicator === 'function') positionBnIndicator(current, false);
    });
  }

  function apply(){
    ticking = false;
    var bar = document.getElementById('bottom-nav');
    if(!bar) return;
    var y = window.scrollY || window.pageYOffset || 0;
    var dy = y - lastY;

    if(y <= 8){
      setProgress(0, false);
    }else if(Math.abs(dy) >= directionThreshold){
      /* Continuous scroll-linked collapse: unlike a binary class toggle,
         every small scroll sample moves the bar toward/away from its
         minimized state. This mirrors iOS 26's fluid content-first motion. */
      setProgress(progress + (dy / travel), false);
    }
    lastY = y;
  }

  function schedule(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }

  function expandFromInteraction(){
    setProgress(0, false);
  }

  window.addEventListener('scroll', schedule, {passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('scroll', schedule, {passive:true});
  document.addEventListener('click', function(e){
    /* Tab taps are handled by their own per-item click listeners, which call
       e.preventDefault() and drive navigation. If this event has already
       been consumed by such a listener, we must NOT also run the generic
       un-minimize path here: it queues a non-animated positionBnIndicator()
       that would land the indicator on the destination tab before the
       animated tab-tap motion can run, leaving the real animation with
       distance = 0 (invisible). Clicks that reach a bottom-nav-item without
       having been preventDefault'd (non-SPA fallback or future items that
       don't handle their own click) still un-minimize as before. */
    if(e.defaultPrevented) return;
    var target = e.target && e.target.closest ? e.target.closest('#bottom-nav .bottom-nav-item') : null;
    if(target) expandFromInteraction();
  }, {passive:true});

  bindBottomNavMinimizeOnScroll.setProgress = setProgress;
}

function ensureBottomNavPinned(){
  if(ensureBottomNavPinned._bound) return;
  ensureBottomNavPinned._bound = true;
  let ticking = false;
  function schedule(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      pinBottomNav();
      /* Reposition indicator without animation on viewport changes */
      var bar = document.getElementById('bottom-nav');
      if(bar && typeof positionBnIndicator === 'function'){
        positionBnIndicator(bar, false);
      }
    });
  }
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('scroll', schedule, {passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', schedule, {passive:true});
    window.visualViewport.addEventListener('scroll', schedule, {passive:true});
  }
  window.addEventListener('pageshow', schedule, {passive:true});
  window.addEventListener('orientationchange', function(){
    setTimeout(schedule, 50);
  }, {passive:true});
}

/* Single persistent liquid/glass indicator for bottom nav.
   One element moves between tabs; not per-item backgrounds.

   Motion model: the indicator's center travels on a single, mildly
   underdamped spring (a small real positional rebound at arrival), while
   its width follows an explicit 7-stage envelope — anticipation squash,
   launch stretch, elongated travel, recovery, arrival compression, soft
   rebound, exact rest (see _bnDeformEnvelope) — biased toward whichever
   edge is leading in the direction of travel. Amplitude has a floor so
   even the shortest, most common hop (an adjacent tab) visibly deforms;
   distance mainly grows the duration and the sustained mid-travel level,
   not whether the deformation is visible at all.
   WAAPI (not CSS transitions) is used specifically so a move can be
   interrupted mid-flight: commitStyles() bakes the exact current
   mid-flight geometry into the inline style before the next move
   starts, so rapid repeated taps never snap back to a stale position. */
var _bnIndicatorState = { ready: false };

function ensureBnIndicator(bar){
  var ind = bar.querySelector('.bn-indicator');
  if(!ind){
    ind = document.createElement('span');
    ind.className = 'bn-indicator';
    ind.setAttribute('aria-hidden', 'true');
    /* Anchor scaling to the left edge so scaleX grows the box toward its
       destination rather than around its own center; the JS below always
       computes the left edge explicitly, which then works for motion in
       either direction. */
    ind.style.transformOrigin = '0% 50%';
    bar.insertBefore(ind, bar.firstChild);
  }
  return ind;
}

function _bnClearIndicatorMotionClasses(ind){
  ind.classList.remove('is-traveling', 'is-settling');
  if(ind._bnSettleTimer){
    clearTimeout(ind._bnSettleTimer);
    ind._bnSettleTimer = null;
  }
}

function _bnReduceMotion(){
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(_e){ return false; }
}

/* Damped-spring position curve at normalized time t in [0,1].
   zeta < 1 gives one controlled overshoot before settling; zeta >= 1 is
   a fast, monotonic (no-overshoot) approach. `delay` (0..~0.3) pushes
   the onset later, used for the trailing edge so it visibly lags the
   leading edge while the shape is in transit. */
function _bnSpring(t, zeta, delay){
  var tt = delay > 0 ? (t - delay) / (1 - delay) : t;
  if(tt <= 0) return 0;
  if(tt >= 1) tt = 1;
  var tau = tt * 6.5; /* enough decay for the curve to settle by tt=1 */
  if(zeta >= 1){
    var a = Math.sqrt(zeta*zeta - 1);
    return 1 - Math.exp(-zeta*tau) * (Math.cosh(a*tau) + (zeta/Math.max(a,1e-6))*Math.sinh(a*tau));
  }
  var wd = Math.sqrt(1 - zeta*zeta);
  return 1 - Math.exp(-zeta*tau) * (Math.cos(wd*tau) + (zeta/wd)*Math.sin(wd*tau));
}

/* Eases one segment of the deformation envelope between two control
   points with a half-cosine, which has zero slope at both t0 and t1.
   Chaining several of these back to back (see _bnDeformEnvelope) means
   the whole multi-hump curve has zero velocity at every control point —
   i.e. no jerk anywhere — without needing a physically-simulated spring
   for this part. */
function _bnDeformSeg(t, t0, v0, t1, v1){
  if(t <= t0) return v0;
  if(t >= t1) return v1;
  var f = (t - t0) / (t1 - t0);
  var e = (1 - Math.cos(Math.PI * f)) / 2;
  return v0 + (v1 - v0) * e;
}

/* The indicator's width-multiplier over the whole move, as seven explicit,
   named stages rather than an emergent side-effect of two similar spring
   curves (which is what made the previous version's deformation too small
   to actually see on device):
     0.00–0.10  m0 (true current width ratio) → anticipation: a small squash
     0.10–0.24  launch: rapid stretch toward its peak
     0.24–0.52  elongated travel: holds near peak stretch
     0.52–0.76  recovery: eases back toward normal width
     0.76–0.90  arrival compression: squashes narrow as it reaches target
     0.90–0.97  rebound: a short, soft overshoot past normal
     0.97–1.00  settle: eases to exactly 1 (REST)
   `m0` anchors the very start of the curve to the indicator's actual
   current width relative to the new target — not always 1 — so
   interrupting an in-flight move never pops to a different width on the
   first frame of the new one; a fresh tap from rest already has m0=1, so
   this doesn't change that case. `squash`/`peak`/`compress`/`rebound` are
   amplitudes (fractions), each with a floor so the shortest, most common
   hop (adjacent tab) still visibly deforms — only the sustained
   mid-travel level and duration grow with distance, not whether the
   deformation is visible at all. */
function _bnDeformEnvelope(t, m0, squash, peak, compress, rebound){
  if(t <= 0.10) return _bnDeformSeg(t, 0.00, m0,             0.10, 1 - squash);
  if(t <= 0.24) return _bnDeformSeg(t, 0.10, 1 - squash,      0.24, 1 + peak);
  if(t <= 0.52) return _bnDeformSeg(t, 0.24, 1 + peak,        0.52, 1 + peak * 0.82);
  if(t <= 0.76) return _bnDeformSeg(t, 0.52, 1 + peak * 0.82, 0.76, 1);
  if(t <= 0.90) return _bnDeformSeg(t, 0.76, 1,               0.90, 1 - compress);
  if(t <= 0.97) return _bnDeformSeg(t, 0.90, 1 - compress,    0.97, 1 + rebound);
  return _bnDeformSeg(t, 0.97, 1 + rebound, 1.00, 1);
}

/* Builds one indicator move as an explicit WAAPI keyframe list, from its
   true current on-screen edges (left0/right0/top0 — which may already be
   mid-deformation if this interrupts a prior move) to the destination
   tab's geometry. Center position travels on a single, mildly underdamped
   spring (a small, real positional rebound at arrival); width is driven
   by the named-phase envelope above and biased toward whichever edge is
   leading in the direction of travel, so the shape visibly reaches out on
   launch and visibly gives on arrival, instead of pulsing symmetrically.
   Farther moves get a longer duration and a larger deformation, but even
   the shortest adjacent-tab hop always has the full 7-stage motion. */
function _bnBuildMove(left0, right0, top0, left1, right1, top1, barWidth){
  var movingRight = (left1 + right1) >= (left0 + right0);
  var centerDist = Math.abs(((left1+right1)/2) - ((left0+right0)/2));
  var distanceRatio = Math.max(0, Math.min(1, centerDist / Math.max(1, barWidth * 0.82)));

  var squash   = 0.035 + 0.020 * distanceRatio; /* 3.5%→5.5% pre-launch anticipation dip */
  var peak     = 0.16  + 0.20  * distanceRatio; /* 16%→36% elongation while traveling — floored so short hops still visibly stretch */
  var compress = 0.055 + 0.035 * distanceRatio; /* 5.5%→9% squash on arrival */
  var rebound  = 0.030 + 0.020 * distanceRatio; /* 3%→5% soft overshoot before settling */
  var centerZeta = 0.85; /* mild, distance-independent underdamp: a small real positional rebound */
  var durationMs = Math.round(270 + 190 * distanceRatio); /* 270ms adjacent → ~460ms far — enough real
     milliseconds for the 7 named stages to each get a few frames; this is not a blanket slowdown of
     the old linear slide, the shape of the motion is what changed. */

  var cx0 = (left0 + right0) / 2, cx1 = (left1 + right1) / 2;
  var w1 = Math.max(1, right1 - left1);
  var w0 = Math.max(1, right0 - left0);
  var m0 = w0 / w1; /* true current width ratio — anchors t=0 so an interrupted move never pops */
  var leadShare = 0.62, lagShare = 0.38; /* leading edge (direction of travel) carries more of the deformation */
  var N = 24;
  var frames = [];
  for(var i = 0; i <= N; i++){
    var t = i / N;
    var first = (i === 0);
    var last = (i === N);

    var cp = last ? 1 : _bnSpring(t, centerZeta, 0);
    var cx = cx0 + (cx1 - cx0) * cp;

    var m = last ? 1 : _bnDeformEnvelope(t, m0, squash, peak, compress, rebound);
    var width = w1 * m;
    var extra = width - w1;

    var leftT, rightT;
    if(movingRight){
      rightT = cx + w1/2 + extra * leadShare;
      leftT  = cx - w1/2 - extra * lagShare;
    } else {
      leftT  = cx - w1/2 - extra * leadShare;
      rightT = cx + w1/2 + extra * lagShare;
    }
    if(first){ leftT = left0; rightT = right0; }
    if(last){ leftT = left1; rightT = right1; }
    if(rightT - leftT < w1 * 0.6){
      var mid = (leftT + rightT) / 2;
      leftT = mid - (w1*0.6)/2;
      rightT = mid + (w1*0.6)/2;
    }

    var topT = first ? top0 : (last ? top1 : top0 + (top1 - top0) * _bnSpring(t, 0.95, 0));

    /* Squash-and-stretch: a wide frame reads a touch shorter, a compressed
       frame a touch taller, so the elongation looks physical rather than
       like a plain width resize. Amplitude is deliberately small relative
       to the width change so it reads as material, not rubber. */
    var scaleY = last ? 1 : (1 - 0.30 * (m - 1));
    var scaleX = (rightT - leftT) / w1;

    frames.push({
      transform: 'translate3d(' + leftT.toFixed(2) + 'px,' + topT.toFixed(2) + 'px,0) scaleX(' + scaleX.toFixed(4) + ') scaleY(' + scaleY.toFixed(4) + ')',
      offset: t
    });
  }
  return { frames: frames, durationMs: durationMs };
}

function positionBnIndicator(bar, animate){
  if(!bar) return;
  var ind = ensureBnIndicator(bar);

  /* A non-animated reposition request — which comes from the scroll /
     resize / visualViewport listeners in bindBottomNavMinimizeOnScroll
     and ensureBottomNavPinned, including the window.scrollTo(0, saved)
     that router.resolve() runs on every route change — must NOT
     interrupt an in-flight tab-tap animation. The tab tap is the user's
     current intent; those incidental events would otherwise commitStyles
     + cancel the running WAAPI animation on its first or second frame,
     then snap the indicator to its destination, which reads on iPhone
     as a plain slide instead of the intended spring/morph travel.
     A real tab tap still comes through here with animate === true, and
     that path keeps the existing commitStyles + cancel interruption so
     rapid repeated taps start from the true current mid-flight geometry. */
  if(!animate && ind._bnAnim){
    return;
  }

  var active = bar.querySelector('.bottom-nav-item.active');
  if(!active){
    ind.style.opacity = '0';
    return;
  }

  var barRect = bar.getBoundingClientRect();
  var itemRect = active.getBoundingClientRect();
  /* iOS 26 selection reads as a compact Liquid Glass surface around the
     selected tab group — not a full-width pill and not a decorative blob. */
  /* The iOS 26 selected control nearly fills its tab item; the glass is
     the selected item surface, not a small decorative badge inside it. */
  var w = Math.max(50, Math.round(itemRect.width - 2));
  /* Indicator is intentionally a little shorter than the tab item itself,
     so it reads as a short, wide capsule inset within the tab rather than
     filling it edge to edge; border-radius:999px in CSS auto-clamps to
     h/2, so the ends are always a true semicircle at whatever height this
     computes. The floor of 44 prevents the shape from collapsing once the
     tab item itself has shrunk to its minimized size. Width calculation is
     unchanged, so the indicator stays aligned with the tab's horizontal
     center in every state. */
  var h = Math.max(44, Math.round(itemRect.height - 8));
  var left = itemRect.left - barRect.left + (itemRect.width - w) / 2;
  var top = itemRect.top - barRect.top + (itemRect.height - h) / 2;
  var reduceMotion = _bnReduceMotion();

  /* Any in-flight move is interrupted here, every time this runs — a tab
     tap, a scroll-driven reposition, a resize. Committing the animation's
     current mid-flight computed style into the inline style before
     cancelling means whatever runs next starts from exactly where the
     shape visually is, never from a stale remembered target. */
  if(ind._bnAnim){
    try{
      var st = ind._bnAnim.playState;
      if(st === 'running' || st === 'paused') ind._bnAnim.commitStyles();
    }catch(_e){}
    try{ ind._bnAnim.cancel(); }catch(_e2){}
    ind._bnAnim = null;
    _bnClearIndicatorMotionClasses(ind);
  }

  var canAnimate = animate && _bnIndicatorState.ready && !reduceMotion && typeof ind.animate === 'function';

  if(!canAnimate){
    ind.style.width = w + 'px';
    ind.style.height = h + 'px';
    ind.style.opacity = '1';
    ind.style.transform = 'translate3d(' + left + 'px,' + top + 'px,0) scaleX(1) scaleY(1)';
    _bnIndicatorState.ready = true;
    return;
  }

  /* True current geometry (post-commit above), not a remembered "last
     settled" position — this is what makes interruption seamless even if
     the shape was still mid-stretch. */
  var curRect = ind.getBoundingClientRect();
  var left0 = curRect.left - barRect.left;
  var top0 = curRect.top - barRect.top;
  var right0 = left0 + curRect.width;

  if(Math.abs(left0 - left) < 1 && Math.abs(top0 - top) < 1){
    /* Already there — repeated tap on the current tab, or a no-op
       reposition. No motion needed. */
    ind.style.width = w + 'px';
    ind.style.height = h + 'px';
    _bnClearIndicatorMotionClasses(ind);
    return;
  }

  ind.style.width = w + 'px';
  ind.style.height = h + 'px';
  ind.style.opacity = '1';

  var move = _bnBuildMove(left0, right0, top0, left, left + w, top, barRect.width);
  var anim = ind.animate(move.frames, {
    duration: move.durationMs,
    easing: 'linear', /* the spring shape is already baked into the sampled keyframes */
    fill: 'forwards'
  });
  ind._bnAnim = anim;
  _bnClearIndicatorMotionClasses(ind);
  ind.classList.add('is-traveling');
  anim.onfinish = function(){
    try{ anim.commitStyles(); }catch(_e){}
    try{ anim.cancel(); }catch(_e2){}
    if(ind._bnAnim === anim) ind._bnAnim = null;
    /* Very soft settle beat after arrival, then back to rest. Short enough
       to read as a rebound, not a lingering highlight. */
    ind.classList.remove('is-traveling');
    ind.classList.add('is-settling');
    if(ind._bnSettleTimer) clearTimeout(ind._bnSettleTimer);
    ind._bnSettleTimer = setTimeout(function(){
      ind.classList.remove('is-settling');
      ind._bnSettleTimer = null;
    }, 150);
  };
  anim.oncancel = function(){
    if(ind._bnAnim === anim) ind._bnAnim = null;
    ind.classList.remove('is-traveling');
  };
  _bnIndicatorState.ready = true;
}
function renderBottomNav(activeId){
  ensureBottomNavDOM();
  const bar = document.getElementById('bottom-nav');
  if(!bar) return;
  const moreActive = isMoreSectionActive(activeId);
  const spa = isSpaShell();

  /* Preserve single indicator across re-renders */
  var prevInd = bar.querySelector('.bn-indicator');
  bar.innerHTML = BOTTOM_NAV_ITEMS.map(t => {
    let active = false;
    if(t.id === 'more') active = moreActive;
    else active = t.id === activeId;
    const cls = 'bottom-nav-item' + (active ? ' active' : '');
    const ico = navIcon(t.iconKey, active);
    if(t.id === 'more'){
      return `<button type="button" class="${cls}" data-bottom-more="1" aria-label="بیشتر">
        <span class="bn-ico">${ico}</span>
        <span class="bn-label">${t.label}</span>
      </button>`;
    }
    let href = t.href;
    if (spa && t.spaPath) href = '#' + t.spaPath;
    return `<a class="${cls}" href="${href}" data-spa-path="${t.spaPath || ''}">
      <span class="bn-ico">${ico}</span>
      <span class="bn-label">${t.label}</span>
    </a>`;
  }).join('');
  if(prevInd){
    bar.insertBefore(prevInd, bar.firstChild);
  } else {
    ensureBnIndicator(bar);
  }

  if (spa) {
    bar.querySelectorAll('a[data-spa-path]').forEach(function (a) {
      const path = a.getAttribute('data-spa-path');
      if (!path) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof AppRouter !== 'undefined' && AppRouter.navigate) AppRouter.navigate(path);
        else location.hash = path;
      });
    });
  }

  const moreBtn = bar.querySelector('[data-bottom-more]');
  if(moreBtn){
    moreBtn.addEventListener('click', function(e){
      e.preventDefault();
      openMoreSheet(activeId);
    });
  }

  fillMoreSheetList(activeId);

  ensureBottomNavPinned();
  bindBottomNavMinimizeOnScroll();
  pinBottomNav();

  /* Position jelly indicator after layout. Animate only when tab actually changes. */
  var shouldAnimate = _bnIndicatorState.ready;
  requestAnimationFrame(function(){
    positionBnIndicator(bar, shouldAnimate);
  });
}

function fillMoreSheetList(activeId){
  const list = document.getElementById('more-sheet-list');
  if(!list) return;
  const spa = isSpaShell();
  list.innerHTML = MORE_NAV_ITEMS.map(t => {
    const isActive = t.id === activeId;
    let href = t.href;
    if (spa && t.spaPath) href = '#' + t.spaPath;
    const ico = navIcon(t.iconKey, isActive);
    return `<a class="more-sheet-item${isActive ? ' active' : ''}" href="${href}" data-spa-path="${t.spaPath || ''}">
      <span class="more-sheet-item-ico">${ico}</span>
      <span class="more-sheet-item-label">${t.label}</span>
      <svg class="more-sheet-item-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </a>`;
  }).join('');
  if (spa) {
    list.querySelectorAll('a[data-spa-path]').forEach(function (a) {
      const path = a.getAttribute('data-spa-path');
      if (!path) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        closeMoreSheet();
        if (typeof AppRouter !== 'undefined' && AppRouter.navigate) AppRouter.navigate(path);
        else location.hash = path;
      });
    });
  }
}

let _moreSheetHideTimer = null;

function openMoreSheet(activeId){
  ensureBottomNavDOM();
  const overlay = document.getElementById('more-overlay');
  const sheet = document.getElementById('more-sheet');
  if(!overlay || !sheet) return;
  // Cancel any pending hide-after-transition timer from a just-closed sheet —
  // otherwise a rapid close→reopen (tap close, immediately tap "بیشتر" again)
  // leaves that timer alive, and it later fires `hidden = true` on the sheet
  // we just reopened, making it silently disappear a moment after opening.
  if(_moreSheetHideTimer){ clearTimeout(_moreSheetHideTimer); _moreSheetHideTimer = null; }
  fillMoreSheetList(activeId);
  overlay.hidden = false;
  sheet.hidden = false;
  requestAnimationFrame(() => {
    overlay.classList.add('show');
    sheet.classList.add('show');
  });
  document.body.classList.add('more-open');
  try{ window.__scrollLock && window.__scrollLock.lock(); }catch(_e){}
}

function closeMoreSheet(){
  const overlay = document.getElementById('more-overlay');
  const sheet = document.getElementById('more-sheet');
  if(overlay){ overlay.classList.remove('show'); }
  if(sheet){ sheet.classList.remove('show'); }
  document.body.classList.remove('more-open');
  try{ window.__scrollLock && window.__scrollLock.unlock(); }catch(_e){}
  if(_moreSheetHideTimer){ clearTimeout(_moreSheetHideTimer); }
  _moreSheetHideTimer = setTimeout(() => {
    _moreSheetHideTimer = null;
    if(overlay) overlay.hidden = true;
    if(sheet) sheet.hidden = true;
  }, 200);
}

function isBackRoute(path){
  return ['/customer','/invoice','/supplier','/prospect','/evaluation','/prospect-routes','/locations','/watch'].indexOf(path) !== -1;
}

function routeBackTarget(path, params){
  params = params || {};
  switch(path){
    case '/customer':
      return {path:'/customers'};
    case '/invoice': {
      /* If the invoice belongs to a customer, return to that customer rather
         than blindly returning to the invoice list. Otherwise use the list. */
      try{
        const id = params.id;
        const invs = (typeof data !== 'undefined' && Array.isArray(data.invoices)) ? data.invoices : [];
        const inv = invs.find(function(x){ return String(x.id) === String(id); });
        if(inv && inv.customerId != null) return {path:'/customer', params:{id:String(inv.customerId)}};
      }catch(_e){}
      return {path:'/invoices'};
    }
    case '/supplier':
      return {path:'/suppliers'};
    case '/prospect':
      return {path:'/prospects'};
    case '/evaluation':
      return params.id != null ? {path:'/prospect', params:{id:String(params.id)}} : {path:'/prospects'};
    case '/prospect-routes':
      return {path:'/prospects'};
    case '/locations':
      return {path:'/settings'};
    case '/watch':
      return {path:'/watches'};
    default:
      return {path:'/dashboard'};
  }
}

function goAppBack(e){
  if(e && typeof e.preventDefault === 'function') e.preventDefault();
  try{
    const cur = (typeof AppRouter !== 'undefined' && AppRouter.getCurrent) ? AppRouter.getCurrent() : null;
    const path = cur && cur.path ? cur.path : '/dashboard';
    if(!isBackRoute(path)) return;
    const target = routeBackTarget(path, cur.params || {});
    if(typeof AppRouter !== 'undefined' && AppRouter.navigate){
      AppRouter.navigate(target.path, target.params || null);
      return;
    }
    location.hash = '#' + target.path;
  }catch(_e){
    try{
      if(typeof AppRouter !== 'undefined' && AppRouter.navigate) AppRouter.navigate('/dashboard');
    }catch(__e){}
  }
}

function setHeaderTitle(text, opts){
  const header = document.querySelector('header');
  if(!header) return;
  const h1 = header.querySelector('h1');
  if(h1 && text) h1.textContent = text;
  header.classList.toggle('header-root', !!(opts && opts.isRoot));
  bindHeaderScrollCollapse();
  // Sync condensed state immediately (covers restored scroll position on
  // back-navigation) instead of waiting for the next scroll event, so a
  // page opened already-scrolled doesn't flash a large title first.
  updateHeaderCondensedState();
}

/* Continuous scroll-linked collapse (fixes the earlier snap/lag): progress
   is a plain 0..1 number derived straight from window.scrollY and written
   to a CSS custom property every frame — no class toggle, no CSS
   transition anywhere in this chain, so there is nothing that keeps
   animating after the finger/scroll stops or that fights a direction
   change mid-scroll. COLLAPSE_RANGE is the scroll distance (px) over
   which the large title fully collapses into the compact title. */
var HEADER_COLLAPSE_RANGE = 48;
function updateHeaderCondensedState(){
  const header = document.querySelector('header');
  if(!header) return;
  const y = window.scrollY || window.pageYOffset || 0;
  const progress = Math.max(0, Math.min(1, y / HEADER_COLLAPSE_RANGE));
  header.style.setProperty('--header-progress', String(progress));
}

/* iOS Large Title collapse: the header starts large (Phase 6). As the page
   scrolls, it condenses into a small persistent title bar — the same visual
   language as UINavigationBar's largeTitleDisplayMode, approximated with a
   scroll-driven class toggle since Web/PWA has no native large-title API. */
function bindHeaderScrollCollapse(){
  if(bindHeaderScrollCollapse._bound) return;
  bindHeaderScrollCollapse._bound = true;
  let ticking = false;
  window.addEventListener('scroll', function(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      updateHeaderCondensedState();
      ticking = false;
    });
  }, {passive:true});
}

function ensureHeaderDate(){
  const el = document.getElementById('header-date');
  if(!el) return;
  try{
    const iso = (typeof todayISO === 'function') ? todayISO() : null;
    if(!iso || typeof isoToJalali !== 'function'){
      el.textContent = '';
      return;
    }
    const j = isoToJalali(iso);
    if(!j){ el.textContent = ''; return; }
    const jy = j[0], jm = j[1], jd = j[2];
    const monthName = (typeof SHAMSI_MONTH_NAMES !== 'undefined' && SHAMSI_MONTH_NAMES[jm - 1])
      ? SHAMSI_MONTH_NAMES[jm - 1]
      : String(jm);
    const FA_WEEKDAYS = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
    const now = new Date();
    const weekday = FA_WEEKDAYS[now.getDay()] || '';
    const dayStr = (typeof enToFaDigits === 'function') ? enToFaDigits(String(jd)) : String(jd);
    const yearStr = (typeof enToFaDigits === 'function') ? enToFaDigits(String(jy)) : String(jy);
    el.textContent = weekday
      ? (weekday + '، ' + dayStr + ' ' + monthName + ' ' + yearStr)
      : (dayStr + ' ' + monthName + ' ' + yearStr);
  }catch(e){
    el.textContent = '';
  }
}

function ensureAppBackButton(activeId, routePath){
  const header = document.querySelector('header');
  if(!header) return;

  ensureHeaderDate();

  /* Some legacy/detail views still call this helper with only activeId.
     Resolve the actual SPA route before deciding whether Back belongs here;
     otherwise a later route-local call could accidentally remove the button
     that the router just created. */
  if(!routePath){
    try{
      const cur = (typeof AppRouter !== 'undefined' && AppRouter.getCurrent)
        ? AppRouter.getCurrent() : null;
      routePath = cur && cur.path ? cur.path : '';
    }catch(_e){ routePath = ''; }
  }

  const existing = header.querySelector('.app-back');
  // isDash was previously also true whenever location.pathname contained
  // "index.html" or <body> carried the legacy "page-dashboard" class — both
  // are relics of the old multi-page-HTML architecture and are constant in
  // this single-shell SPA (this file is always served as /index.html and
  // <body class="page-dashboard"> in index.html is never changed at
  // runtime), so isDash was always true and the header back button never
  // rendered on any route. activeId is the one signal the router actually
  // updates per navigation, so it's the only correct check here.
  const isDash = !activeId || activeId === 'dashboard';
  const showBack = !isDash && isBackRoute(routePath || '');

  if(!showBack){
    if(existing) existing.remove();
    header.classList.remove('has-back');
    return;
  }

  if(existing){
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'app-back';
  btn.setAttribute('aria-label', 'بازگشت');
  btn.innerHTML = '<span class="app-back-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5-7 7 7 7"/></svg></span><span class="app-back-txt">بازگشت</span>';
  btn.addEventListener('click', goAppBack);
  header.insertBefore(btn, header.firstChild);
  header.classList.add('has-back');
}

/* ---------------------------------------------------------------------
   Pull-to-refresh (Phase 10). Re-reads IndexedDB into the in-memory
   `data` object (loadData() — a pure read, never mutates anything) and
   asks the currently-mounted view to redraw itself via the existing
   ViewHost.setRefresh()/refreshCurrent() registry that all 21 views
   already use for their own "data changed, redraw" path — this gesture
   doesn't invent a new refresh mechanism, it just triggers the one that
   was already there. Falls back to a full route re-resolve only if a
   view hasn't registered a refresh handler.
   Gated to start only when the page is scrolled to the very top and the
   touch didn't begin inside a sheet/overlay/header, so it can never
   fight the sheet drag-to-dismiss gesture or the header's own scroll
   listener.
   --------------------------------------------------------------------- */
function ensurePullToRefreshDOM(){
  if(document.getElementById('ptr-indicator')) return;
  const el = document.createElement('div');
  el.id = 'ptr-indicator';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="ptr-spinner"></span>';
  document.body.appendChild(el);
}

function bindPullToRefresh(){
  if(bindPullToRefresh._bound) return;
  bindPullToRefresh._bound = true;
  ensurePullToRefreshDOM();
  const el = document.getElementById('ptr-indicator');
  if(!el) return;
  const THRESHOLD = 64;
  let startY = 0, pulling = false, dragging = false, refreshing = false;

  function isBlocked(target){
    return !!(target && target.closest && target.closest('.overlay, .more-sheet, .more-overlay, .shamsi-sheet-overlay, #modalRoot, header'));
  }

  window.addEventListener('touchstart', function(e){
    if(refreshing){ pulling = false; return; }
    const y = window.scrollY || window.pageYOffset || 0;
    if(y > 0 || isBlocked(e.target)){ pulling = false; return; }
    pulling = true;
    dragging = false;
    startY = e.touches[0].clientY;
  }, {passive:true});

  window.addEventListener('touchmove', function(e){
    if(!pulling || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if(dy <= 0){
      if(dragging){ dragging = false; el.style.transform = ''; el.classList.remove('show','ptr-ready'); }
      return;
    }
    dragging = true;
    const pull = Math.min(90, Math.pow(dy, 0.72) * 3); // rubber-band resistance
    el.style.transform = 'translateY(' + pull + 'px) rotate(' + Math.min(220, pull * 2.4) + 'deg)';
    el.classList.add('show');
    el.classList.toggle('ptr-ready', pull >= THRESHOLD * 0.85);
  }, {passive:true});

  window.addEventListener('touchend', function(){
    if(!pulling) return;
    pulling = false;
    if(!dragging) return;
    dragging = false;
    const ready = el.classList.contains('ptr-ready');
    if(ready){
      el.style.transform = 'translateY(0)';
      doRefresh();
    } else {
      el.style.transform = 'translateY(-40px)';
      el.classList.remove('show','ptr-ready');
    }
  });

  async function doRefresh(){
    refreshing = true;
    el.classList.add('show', 'ptr-spinning');
    el.classList.remove('ptr-ready');
    const minVisible = new Promise(function(res){ setTimeout(res, 420); });
    try{
      if(typeof loadData === 'function') await loadData();
      const refreshed = (typeof ViewHost !== 'undefined' && ViewHost.refreshCurrent) ? ViewHost.refreshCurrent() : false;
      if(!refreshed && typeof AppRouter !== 'undefined' && AppRouter.resolve) AppRouter.resolve();
    }catch(err){
      console.error('[pull-to-refresh] reload failed', err);
      if(typeof showToast === 'function') showToast('بروزرسانی ناموفق بود');
    }
    await minVisible;
    el.classList.remove('show', 'ptr-spinning');
    el.style.transform = 'translateY(-40px)';
    refreshing = false;
  }
}

function getQueryParam(name){
  try{
    return new URLSearchParams(window.location.search).get(name);
  }catch(e){
    return null;
  }
}

async function bootPage(activeId, afterLoad){
  try{
    /* PIN gate (minimal): unlock before any CRM render. Does not touch data/FIFO. */
    try{
      var pinConfigured = false;
      try{ pinConfigured = !!(localStorage.getItem('baqeri_pin_lock_v1')); }catch(_e){}
      if(pinConfigured){
        if(!window.pinLock || typeof window.pinLock.ensureUnlocked !== 'function'){
          document.body.innerHTML = '<div style="padding:24px;text-align:center;font-family:sans-serif;direction:rtl;">قفل PIN فعال است اما ماژول قفل بارگذاری نشد. صفحه را دوباره باز کنید.</div>';
          return;
        }
        await window.pinLock.ensureUnlocked();
      } else if(window.pinLock && typeof window.pinLock.ensureUnlocked === 'function'){
        await window.pinLock.ensureUnlocked();
      }
    }catch(pinErr){
      console.error('pin lock gate failed', pinErr);
      document.body.innerHTML = '<div style="padding:24px;text-align:center;font-family:sans-serif;direction:rtl;">خطا در قفل PIN. صفحه را دوباره باز کنید.</div>';
      return;
    }
    
    // iOS Foundation: Setup Keyboard Guard
    setupVisualViewportKeyboardGuard();

    await loadData();
    renderSharedNav(activeId);
    renderBottomNav(activeId);
    ensureAppBackButton(activeId);
    if(typeof afterLoad === 'function'){
      await afterLoad();
    }
  }catch(e){
    console.error('bootPage failed', e);
    if(typeof showToast === 'function'){
      showToast('خطا در بارگذاری اطلاعات');
    }
    const main = document.getElementById('main');
    if(main){
      main.innerHTML = `<div class="empty" role="alert">خطا در بارگذاری اطلاعات. صفحه را دوباره باز کنید.</div>`;
    }
  }
}

function pageShellNote(title, detail){
  return `
    <h2 class="section-title">${title}</h2>
    <div class="page-skeleton-note">
      ${detail || 'این صفحه در مرحله ۱ فقط اسکلت معماری است. امکانات کامل در مراحل بعد منتقل می‌شوند.'}
    </div>
  `;
}

function waitForCrmDataLoad() {
  return new Promise(function (resolve) {
    var retrying = false;
    function paint() {
      var main = document.getElementById('main');
      if (!main) {
        resolve();
        return;
      }
      main.innerHTML =
        '<div class="empty" style="padding:28px 16px;text-align:center;direction:rtl;">' +
        '<div style="font-size:1.05rem;font-weight:500;margin-bottom:8px;">خطا در بارگذاری اطلاعات</div>' +
        '<div style="opacity:.85;margin-bottom:16px;line-height:1.6;">داده‌های CRM خوانده نشد. برنامه با حالت خالی باز نمی‌شود تا از نمایش نادرست جلوگیری شود.</div>' +
        '<button type="button" class="btn" id="crm-load-retry">تلاش مجدد</button>' +
        '</div>';
      var btn = document.getElementById('crm-load-retry');
      if (!btn) return;
      btn.addEventListener('click', function onRetry() {
        if (retrying) return;
        retrying = true;
        btn.disabled = true;
        btn.textContent = 'در حال تلاش…';
        Promise.resolve()
          .then(function () {
            return loadData();
          })
          .then(function () {
            retrying = false;
            resolve();
          })
          .catch(function (err) {
            console.error('loadData retry failed', err);
            retrying = false;
            paint();
          });
      });
    }
    paint();
  });
}

async function bootSpaShell() {
  try {
    try {
      var pinConfigured = false;
      try {
        pinConfigured = !!(localStorage.getItem('baqeri_pin_lock_v1'));
      } catch (_e) {}
      if (pinConfigured) {
        if (!window.pinLock || typeof window.pinLock.ensureUnlocked !== 'function') {
          document.body.innerHTML =
            '<div style="padding:24px;text-align:center;font-family:sans-serif;direction:rtl;">قفل PIN فعال است اما ماژول قفل بارگذاری نشد. صفحه را دوباره باز کنید.</div>';
          return;
        }
        await window.pinLock.ensureUnlocked();
      } else if (window.pinLock && typeof window.pinLock.ensureUnlocked === 'function') {
        await window.pinLock.ensureUnlocked();
      }
    } catch (pinErr) {
      console.error('pin lock gate failed', pinErr);
      document.body.innerHTML =
        '<div style="padding:24px;text-align:center;font-family:sans-serif;direction:rtl;">خطا در قفل PIN. صفحه را دوباره باز کنید.</div>';
      return;
    }

    // iOS Foundation: Setup Keyboard Guard
    setupVisualViewportKeyboardGuard();

    try {
      await loadData();
      if (typeof hydrateMonthlySalesTarget === 'function') await hydrateMonthlySalesTarget();
    } catch (loadErr) {
      console.error('bootSpaShell loadData failed', loadErr);
      await waitForCrmDataLoad();
    }

    if (typeof loadProspectData === 'function') {
      try {
        await loadProspectData();
      } catch (pe) {
        console.warn('loadProspectData failed (CRM continues)', pe);
      }
    }

    renderSharedNav('dashboard');
    renderBottomNav('dashboard');
    ensureAppBackButton('dashboard');

    if (typeof AppRouter === 'undefined' || !AppRouter.registerRoute) {
      console.error('AppRouter missing');
      const main = document.getElementById('main');
      if (main) main.innerHTML = '<div class="empty">Router بارگذاری نشد.</div>';
      return;
    }

    function spaActiveIdFromPath(path) {
      if (path === '/' || path === '/dashboard') return 'dashboard';
      if (path === '/products') return 'products';
      if (path === '/inventory') return 'inventory';
      if (path === '/reports') return 'reports';
      if (path === '/customers' || path === '/customer') return 'customers';
      if (path === '/payments') return 'payments';
      if (path === '/invoices' || path === '/invoice') return 'invoices';
      if (path === '/suppliers' || path === '/supplier') return 'suppliers';
      if (path === '/visits') return 'visits';
      if (path === '/prospects' || path === '/prospect' || path === '/prospect-routes' || path === '/evaluation') return 'prospects';
      if (path === '/watches' || path === '/watch') return 'watches';
      if (path === '/checks') return 'checks';
      if (path === '/game') return 'game';
      if (path === '/settings') return 'settings';
      return 'dashboard';
    }

    /* Per-route nav titles — iOS large-title convention: the tab bar labels
       already used for BOTTOM_NAV_ITEMS/MORE_NAV_ITEMS are reused for list
       pages so there is exactly one Persian label per section, and detail
       routes (customer/invoice/supplier/prospect/watch) get an honest
       generic detail title since the router has no record loaded yet to
       name it more specifically — a real per-record title (e.g. the
       customer's name) needs to be set by that view itself once it has
       loaded its data; see setHeaderTitle() below, callable from any view.
       Principle: this map holds each screen's own page title, never the
       business/brand name ("حبوبات و خشکبار باقری") — that's identity, not
       a page title, so it must not stand in for Dashboard's title or any
       other route here, even though Dashboard is the app's root/home tab. */
    const PAGE_TITLES = {
      '/': 'داشبورد',
      '/dashboard': 'داشبورد',
      '/products': 'اجناس',
      '/inventory': 'انبار',
      '/reports': 'گزارش‌ها',
      '/customers': 'مشتریان',
      '/customer': 'جزئیات مشتری',
      '/payments': 'پرداخت‌ها',
      '/invoices': 'فاکتورها',
      '/invoice': 'فاکتور',
      '/suppliers': 'تأمین‌کنندگان',
      '/supplier': 'جزئیات تأمین‌کننده',
      '/visits': 'ویزیت مشتریان',
      '/prospects': 'ارزیابی مغازه‌ها',
      '/prospect': 'جزئیات مغازه',
      '/prospect-routes': 'مسیرهای ویزیت',
      '/evaluation': 'ارزیابی مغازه',
      '/checks': 'چک‌ها',
      '/game': 'مرکز بازی فروش',
      '/settings': 'تنظیمات و Backup',
      '/locations': 'مناطق و مسیرها',
      '/watches': 'واچ‌ها',
      '/watch': 'جزئیات واچ'
    };

    function makeViewHandler(View, activeId, path) {
      return function (params) {
        renderSharedNav(activeId);
        renderBottomNav(activeId);
        ensureAppBackButton(activeId, path);
        if (typeof setHeaderTitle === 'function') {
          setHeaderTitle(PAGE_TITLES[path] || '', { isRoot: activeId === 'dashboard' && (path === '/' || path === '/dashboard') });
        }
        const root = document.getElementById('main');
        if (!root || !View || typeof View.mount !== 'function') return function () {};
        return View.mount(root, params || {});
      };
    }

    AppRouter.registerRoute('/', makeViewHandler(typeof DashboardView !== 'undefined' ? DashboardView : null, 'dashboard', '/'));
    AppRouter.registerRoute('/dashboard', makeViewHandler(typeof DashboardView !== 'undefined' ? DashboardView : null, 'dashboard', '/dashboard'));
    AppRouter.registerRoute('/products', makeViewHandler(typeof ProductsView !== 'undefined' ? ProductsView : null, 'products', '/products'));
    AppRouter.registerRoute('/inventory', makeViewHandler(typeof InventoryView !== 'undefined' ? InventoryView : null, 'inventory', '/inventory'));
    AppRouter.registerRoute('/reports', makeViewHandler(typeof ReportsView !== 'undefined' ? ReportsView : null, 'reports', '/reports'));
    AppRouter.registerRoute('/customers', makeViewHandler(typeof CustomersView !== 'undefined' ? CustomersView : null, 'customers', '/customers'));
    AppRouter.registerRoute('/customer', makeViewHandler(typeof CustomerView !== 'undefined' ? CustomerView : null, 'customers', '/customer'));
    AppRouter.registerRoute('/payments', makeViewHandler(typeof PaymentsView !== 'undefined' ? PaymentsView : null, 'payments', '/payments'));
    AppRouter.registerRoute('/invoices', makeViewHandler(typeof InvoicesView !== 'undefined' ? InvoicesView : null, 'invoices', '/invoices'));
    AppRouter.registerRoute('/invoice', makeViewHandler(typeof InvoiceView !== 'undefined' ? InvoiceView : null, 'invoices', '/invoice'));
    AppRouter.registerRoute('/suppliers', makeViewHandler(typeof SuppliersView !== 'undefined' ? SuppliersView : null, 'suppliers', '/suppliers'));
    AppRouter.registerRoute('/supplier', makeViewHandler(typeof SupplierView !== 'undefined' ? SupplierView : null, 'suppliers', '/supplier'));
    AppRouter.registerRoute('/visits', makeViewHandler(typeof VisitsView !== 'undefined' ? VisitsView : null, 'visits', '/visits'));
    AppRouter.registerRoute('/prospects', makeViewHandler(typeof ProspectsView !== 'undefined' ? ProspectsView : null, 'prospects', '/prospects'));
    AppRouter.registerRoute('/prospect', makeViewHandler(typeof ProspectView !== 'undefined' ? ProspectView : null, 'prospects', '/prospect'));
    AppRouter.registerRoute('/prospect-routes', makeViewHandler(typeof LocationsView !== 'undefined' ? LocationsView : null, 'settings', '/prospect-routes'));
    AppRouter.registerRoute('/evaluation', makeViewHandler(typeof EvaluationView !== 'undefined' ? EvaluationView : null, 'prospects', '/evaluation'));
    AppRouter.registerRoute('/checks', makeViewHandler(typeof ChecksView !== 'undefined' ? ChecksView : null, 'checks', '/checks'));
    AppRouter.registerRoute('/game', makeViewHandler(typeof GameCenterView !== 'undefined' ? GameCenterView : null, 'game', '/game'));
    AppRouter.registerRoute('/settings', makeViewHandler(typeof SettingsView !== 'undefined' ? SettingsView : null, 'settings', '/settings'));
    AppRouter.registerRoute('/locations', makeViewHandler(typeof LocationsView !== 'undefined' ? LocationsView : null, 'settings', '/locations'));
    AppRouter.registerRoute('/watches', makeViewHandler(typeof WatchesView !== 'undefined' ? WatchesView : null, 'watches', '/watches'));
    AppRouter.registerRoute('/watch', makeViewHandler(typeof WatchDetailView !== 'undefined' ? WatchDetailView : null, 'watches', '/watch'));
    AppRouter.start();
    bindPullToRefresh();
  } catch (e) {
    console.error('bootSpaShell failed', e);
    if (typeof showToast === 'function') showToast('خطا در بارگذاری اطلاعات');
    const main = document.getElementById('main');
    if (main) {
      main.innerHTML = '<div class="empty" role="alert">خطا در بارگذاری اطلاعات. صفحه را دوباره باز کنید.</div>';
    }
  }
}

/* Setup Visual Viewport Keyboard Guard (iOS) */
function setupVisualViewportKeyboardGuard() {
  if (setupVisualViewportKeyboardGuard._bound) return;
  setupVisualViewportKeyboardGuard._bound = true;

  function update() {
    try {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        const isOpen = keyboardHeight > 80;

        document.body.classList.toggle('keyboard-open', isOpen);
        document.body.style.setProperty('--keyboard-height', keyboardHeight + 'px');
        document.body.style.setProperty('--vv-height', Math.round(vv.height) + 'px');
        if (typeof pinBottomNav === 'function') pinBottomNav();
      }
    } catch (e) {}
  }

  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update, { passive: true });
    window.visualViewport.addEventListener('scroll', update, { passive: true });
  }
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || !t.tagName) return;
    var tag = t.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) {
      setTimeout(update, 50);
      setTimeout(update, 300);
    }
  }, true);
  document.addEventListener('focusout', function () {
    setTimeout(update, 50);
    setTimeout(update, 300);
  }, true);
  update();
}
