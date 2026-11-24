/* js/ui-location-sheet.js — برگهٔ «موقعیت» مشترک (مشتریان و مغازه‌های بالقوه).
   ترتیب انتخاب: منطقه ← مسیر ← محله. هر سطح یک ردیف «کل …» برای انتخاب کل همان
   سطح دارد. نتیجه با onApply({regionId, routeId, neighborhoodId, unassigned}) برمی‌گردد.
   صفحه‌ها فقط state خودشان را نگه می‌دارند و این ماژول فقط برگه را نشان می‌دهد. */
(function (global) {
  'use strict';

  function h(x) { return typeof esc === 'function' ? esc(String(x == null ? '' : x)) : String(x); }

  function label(f) {
    if (!f) return 'همه';
    if (f.unassigned) return 'بدون موقعیت';
    if (f.neighborhoodId) { const n = getNeighborhood(f.neighborhoodId); if (n) return n.name; }
    if (f.routeId) { const r = getRoute(f.routeId); if (r) return r.name; }
    if (f.regionId) { const g = getRegion(f.regionId); if (g) return g.name; }
    return 'همه';
  }

  function row(text, attrs, chevron) {
    return '<button type="button" class="pl-sheet-item" ' + attrs + '><span>' + h(text) + '</span>' +
      '<span class="pl-sheet-check" aria-hidden="true">' + (chevron ? '›' : '') + '</span></button>';
  }

  function startView(cur) {
    if (cur && (cur.neighborhoodId || cur.routeId)) {
      const rid = cur.routeId || (getNeighborhood(cur.neighborhoodId) || {}).routeId;
      const r = getRoute(rid);
      return { level: 'route', regionId: r ? r.regionId : '', routeId: rid };
    }
    if (cur && cur.regionId) return { level: 'region', regionId: cur.regionId, routeId: '' };
    return { level: 'root', regionId: '', routeId: '' };
  }

  function render(view, opts) {
    let title = 'موقعیت';
    let back = '';
    let rows = '';
    if (view.level === 'root') {
      rows = row('همه', 'data-apply="all"', false) +
        row('بدون موقعیت', 'data-apply="unassigned"', false) +
        listRegions().map(function (g) { return row(g.name, 'data-drill-region="' + h(g.id) + '"', true); }).join('');
    } else if (view.level === 'region') {
      const g = getRegion(view.regionId);
      title = g ? g.name : 'منطقه';
      back = '<button type="button" class="pl-sheet-back" data-back="1">‹ موقعیت</button>';
      rows = row('کل ' + title, 'data-apply-region="' + h(view.regionId) + '"', false) +
        listRoutes(view.regionId).map(function (r) {
          return listNeighborhoods(r.id).length
            ? row(r.name, 'data-drill-route="' + h(r.id) + '"', true)
            : row(r.name, 'data-apply-route="' + h(r.id) + '"', false);
        }).join('');
    } else {
      const r = getRoute(view.routeId);
      const g = r ? getRegion(r.regionId) : null;
      title = r ? r.name : 'مسیر';
      back = '<button type="button" class="pl-sheet-back" data-back="1">‹ ' + h(g ? g.name : 'منطقه') + '</button>';
      rows = row('کل ' + title, 'data-apply-route="' + h(view.routeId) + '"', false) +
        listNeighborhoods(view.routeId).map(function (n) { return row(n.name, 'data-apply-neigh="' + h(n.id) + '"', false); }).join('');
    }
    openSheet(
      back +
      '<h3 class="pl-sheet-title">' + h(title) + '</h3>' +
      '<div class="pl-sheet-list">' + rows + '</div>' +
      '<button type="button" class="pl-sheet-manage" data-manage="1">مدیریت موقعیت‌ها</button>'
    );
    bind(view, opts);
  }

  function bind(view, opts) {
    const on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.addEventListener('click', fn); }); };
    const apply = function (f) { closeModal(); opts.onApply(Object.assign({ regionId: '', routeId: '', neighborhoodId: '', unassigned: false }, f)); };

    on('[data-back]', function () {
      if (view.level === 'route') {
        const r = getRoute(view.routeId);
        render({ level: 'region', regionId: r ? r.regionId : '', routeId: '' }, opts);
      } else {
        render({ level: 'root', regionId: '', routeId: '' }, opts);
      }
    });
    on('[data-drill-region]', function (e) {
      render({ level: 'region', regionId: e.currentTarget.getAttribute('data-drill-region'), routeId: '' }, opts);
    });
    on('[data-drill-route]', function (e) {
      render({ level: 'route', regionId: view.regionId, routeId: e.currentTarget.getAttribute('data-drill-route') }, opts);
    });
    on('[data-apply]', function (e) {
      const k = e.currentTarget.getAttribute('data-apply');
      apply(k === 'unassigned' ? { unassigned: true } : {});
    });
    on('[data-apply-region]', function (e) { apply({ regionId: e.currentTarget.getAttribute('data-apply-region') }); });
    on('[data-apply-route]', function (e) {
      const id = e.currentTarget.getAttribute('data-apply-route');
      const r = getRoute(id);
      apply({ regionId: r ? r.regionId : '', routeId: id });
    });
    on('[data-apply-neigh]', function (e) {
      const id = e.currentTarget.getAttribute('data-apply-neigh');
      const n = getNeighborhood(id);
      const r = n ? getRoute(n.routeId) : null;
      apply({ regionId: r ? r.regionId : '', routeId: n ? n.routeId : '', neighborhoodId: id });
    });
    on('[data-manage]', function () { closeModal(); AppRouter.navigate('/locations'); });
  }

  global.LocationSheet = {
    label: label,
    open: function (opts) { render(startView(opts.current), opts); }
  };
})(window);
