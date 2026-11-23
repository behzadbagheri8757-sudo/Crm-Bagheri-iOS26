/* js/views/prospects.js — SPA Prospects list view (Phase 8).
   Extracted from prospects.html. Reuses prospectState, PROSPECT_RANK_INFO,
   prospectComputeScore, prospectScoreToRank, prospectRouteName,
   prospectNeighborhoodName, prospectFaDate, queueProspectTargetMilestoneMessage,
   setProspectDailyTargetValue, ensureProspectDailyTarget.
   No new financial logic.
*/
'use strict';

(function (global) {
  let pQuery = '';
  let pFilter = 'all'; // all | active | converted | A+ | A | B
  let pSort = 'score_desc'; // score_desc | score_asc | name | newest | last_evaluation
  let pLocFilter = { regionId: '', routeId: '', neighborhoodId: '', unassigned: false };

  let searchHandler = null;
  let chipHandlers = [];
  let sortHandler = null;
  let listClickHandler = null;
  let fabHandler = null;
  let targetBtnHandler = null;
  function rankPill(rank) {
    // Shared helper (prospect-scoring.js): an incomplete V2 prospect has
    // rank === null and must render as "ناقص", never fall back to "D".
    return prospectRankBadgeHTML(rank);
  }

  function navigateToProspect(id) {
    AppRouter.navigate('/prospect', { id: id });
  }

  function navigateToEvaluation(shopId) {
    const params = shopId ? { shopId: shopId } : {};
    AppRouter.navigate('/evaluation', params);
  }

  function renderTargetCard() {
    const el = document.getElementById('prospect-target');
    if (!el) return;
    const dt = prospectState.dailyTarget || { target: 0, count: 0 };
    /* Presentation-only: iOS-like Hero Activity Card.
       Logic (target/count/percentage/remaining) and edit flow unchanged.
       Progress bar stays empty while count is 0 (is-idle). */
    if (!dt.target) {
      el.innerHTML = `<div class="prospect-daily-target is-unset">
        <div class="pdt-head">
          <span class="pdt-label">هدف ارزیابی امروز</span>
          <button type="button" class="pdt-edit" id="set-target-btn">تنظیم</button>
        </div>
        <div class="pdt-unset-msg">هنوز هدفی تنظیم نشده</div>
      </div>`;
    } else {
      const count = Number(dt.count) || 0;
      const target = Number(dt.target) || 0;
      const pctRaw = target > 0 ? (count / target) * 100 : 0;
      const pct = Math.min(100, Math.round(pctRaw * 10) / 10);
      const pctLabel = Math.min(100, Math.round(pctRaw));
      const idle = count <= 0;
      const barW = idle ? 0 : Math.min(100, Math.max(0, pct));
      const remaining = Math.max(0, target - count);
      el.innerHTML = `<div class="prospect-daily-target${idle ? ' is-idle' : ' is-active'}">
        <div class="pdt-head">
          <span class="pdt-label">هدف ارزیابی امروز</span>
          <span class="pdt-pct">${pctLabel}٪</span>
        </div>
        <div class="pdt-hero">
          <span class="pdt-count">${count}</span>
          <span class="pdt-caption">ارزیابی انجام شد</span>
          <span class="pdt-of">از ${target}</span>
        </div>
        <div class="pdt-bar-wrap"><div class="pdt-bar" role="progressbar" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${target}"><span style="width:${barW}%"></span></div></div>
        <div class="pdt-foot">
          <span class="pdt-remain">${remaining} ارزیابی باقی مانده</span>
          <button type="button" class="pdt-edit" id="set-target-btn">ویرایش</button>
        </div>
      </div>`;
    }
    const b = document.getElementById('set-target-btn');
    if (b) {
      targetBtnHandler = function () {
        openSheet(`
          <h3>هدف ارزیابی امروز</h3>
          <div class="field"><label for="prospect-target-input">تعداد هدف</label><input id="prospect-target-input" type="text" inputmode="numeric" value="${esc(String(dt.target || 20))}"></div>
          <div class="btn-row"><button type="button" class="btn" id="prospect-target-save">ذخیره</button></div>
        `);
        const input = document.getElementById('prospect-target-input');
        const save = document.getElementById('prospect-target-save');
        if(input) setTimeout(function(){ input.focus(); input.select(); }, 0);
        if(save) save.onclick = function(){
          const n = parseInt(faToEnDigits(input ? input.value : ''), 10);
          if(!n || n <= 0){ showToast('عدد معتبر وارد کن'); if(input){ input.setAttribute('aria-invalid','true'); input.focus(); } return; }
          save.disabled = true;
          setProspectDailyTargetValue(n).then(function(){
            closeModal();
            renderTargetCard();
            showToast('تارگت ذخیره شد');
          }).catch(function(err){
            console.error(err);
            save.disabled = false;
            showToast('ذخیره تارگت ناموفق بود');
          });
        };
      };
      b.onclick = targetBtnHandler;
    }
  }

  function renderProspectListOnly() {
    const list = document.getElementById('prospect-list');
    const sum = document.getElementById('prospect-summary');
    if (!list || !sum) return;
    let rows = prospectState.shops.slice();
    const q = (pQuery || '').trim().toLowerCase();
    if (q) rows = rows.filter(s => (s.name || '').toLowerCase().includes(q));
    if (pFilter === 'active') rows = rows.filter(s => s.status !== 'converted');
    else if (pFilter === 'converted') rows = rows.filter(s => s.status === 'converted');
    else if (['A+', 'A', 'B', 'C', 'D'].includes(pFilter)) rows = rows.filter(s => s.latestRank === pFilter);

    if (pLocFilter.unassigned) {
      rows = rows.filter(s => !s.locationId);
    } else if (pLocFilter.neighborhoodId) {
      rows = rows.filter(s => s.locationId === pLocFilter.neighborhoodId);
    } else if (pLocFilter.routeId) {
      const neighIds = listNeighborhoods(pLocFilter.routeId).map(n => n.id);
      rows = rows.filter(s => s.locationId === pLocFilter.routeId || (s.locationId && neighIds.indexOf(s.locationId) !== -1));
    } else if (pLocFilter.regionId) {
      const routeIds = listRoutes(pLocFilter.regionId).map(r => r.id);
      let neighIds = [];
      routeIds.forEach(rid => { neighIds = neighIds.concat(listNeighborhoods(rid).map(n => n.id)); });
      rows = rows.filter(s => s.locationId && (routeIds.indexOf(s.locationId) !== -1 || neighIds.indexOf(s.locationId) !== -1));
    }

    if (pSort === 'score_asc') rows.sort((a,b) => a.latestScore - b.latestScore);
    else if (pSort === 'name') rows.sort((a,b) => (a.name || '').localeCompare(b.name || '', 'fa'));
    else if (pSort === 'newest' || pSort === 'last_evaluation') rows.sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    else rows.sort((a,b) => b.latestScore - a.latestScore);

    sum.innerHTML = enToFaDigits(String(rows.length)) + ' از ' + enToFaDigits(String(prospectState.shops.length)) + ' مغازه';

    if (!rows.length) {
      list.innerHTML = `<div class="empty">${prospectState.shops.length ? 'موردی پیدا نشد' : 'هنوز مغازه‌ای ثبت نشده. با + یا «ثبت مغازه» شروع کنید.'}</div>`;
      return;
    }
    list.innerHTML = rows.map(s => {
      const converted = s.status === 'converted';
      return `
      <a class="ledger-row tx-row" data-open-prospect="${esc(s.id)}" style="text-decoration:none;color:inherit;">
        <span class="name">
          <span class="tx-row-title">${esc(s.name)}${converted ? ' <span class="badge pending" style="font-size:.7em;">تبدیل‌شده</span>' : ''}</span>
          <span class="sub">${esc(getLocationDisplayString(s.locationId))} · ${prospectFaDate(s.updatedAt)}</span>
        </span>
        <span class="filler"></span>
        <span class="amount tx-row-amount">
          <span class="tx-row-total">${s.latestScore}</span>
          <span class="tx-row-meta">${rankPill(s.latestRank)}</span>
        </span>
      </a>`;
    }).join('');
    // Click listener is bound once in drawProspectsPage (not on every list re-render).
  }

  function drawProspectsPage(root) {
    const chip = function (id, label) {
      return `<button type="button" class="chip ${pFilter === id ? 'active' : ''}" data-pf="${id}">${label}</button>`;
    };
    root.innerHTML = `
      <h2 class="section-title">مشتریان بالقوه</h2>
      <div class="field pl-search"><input id="prospect-search" placeholder="جستجوی نام مغازه..." value="${esc(pQuery)}" autocomplete="off"></div>
      <div id="prospect-target" class="cards" style="margin-bottom:12px;"></div>
      <div class="chip-row segmented-control" id="prospect-chips">
        ${chip('all','همه')}
        ${chip('active','فعال')}
        ${chip('converted','تبدیل‌شده')}
        ${chip('A+','رتبه A+')}
        ${chip('A','رتبه A')}
        ${chip('B','رتبه B')}
      </div>
      <div class="pl-toolbar">
        <button type="button" class="pl-cap" id="pl-loc-cap" aria-haspopup="dialog">
          <span class="pl-cap-title">موقعیت</span><span class="pl-cap-value" id="pl-loc-value"></span>
        </button>
        <div class="pl-sort">
          <label for="prospect-sort">مرتب‌سازی</label>
          <select id="prospect-sort">
            <option value="score_desc" ${pSort === 'score_desc' ? 'selected' : ''}>بیشترین امتیاز</option>
            <option value="score_asc" ${pSort === 'score_asc' ? 'selected' : ''}>کمترین امتیاز</option>
            <option value="name" ${pSort === 'name' ? 'selected' : ''}>نام</option>
            <option value="last_evaluation" ${pSort === 'last_evaluation' ? 'selected' : ''}>آخرین ارزیابی</option>
          </select>
        </div>
      </div>
      <div id="prospect-summary" class="pl-count"></div>
      <div id="prospect-list" class="tx-list"></div>
    `;

    const searchEl = document.getElementById('prospect-search');
    searchHandler = function (e) {
      pQuery = e.target.value;
      renderProspectListOnly();
    };
    searchEl.addEventListener('input', searchHandler);

    chipHandlers = [];
    document.querySelectorAll('#prospect-chips [data-pf]').forEach(function (btn) {
      const fn = function () {
        pFilter = btn.getAttribute('data-pf');
        document.querySelectorAll('#prospect-chips [data-pf]').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-pf') === pFilter);
        });
        renderProspectListOnly();
      };
      btn.addEventListener('click', fn);
      chipHandlers.push({ el: btn, fn: fn });
    });

    const sortEl = document.getElementById('prospect-sort');
    sortHandler = function (e) {
      pSort = e.target.value;
      renderProspectListOnly();
    };
    sortEl.addEventListener('change', sortHandler);

    const locCap = document.getElementById('pl-loc-cap');
    if (locCap) locCap.addEventListener('click', openProspectLocSheet);

    // Delegated list click — once per draw (same pattern as Customers/Checks)
    const listEl = document.getElementById('prospect-list');
    listClickHandler = function (e) {
      const row = e.target.closest('[data-open-prospect]');
      if (!row) return;
      e.preventDefault();
      navigateToProspect(row.getAttribute('data-open-prospect'));
    };
    if (listEl) listEl.addEventListener('click', listClickHandler);

    renderTargetCard();
    updateLocCapUI();
    renderProspectListOnly();
  }

  // ---- Location filter: ONE capsule that opens a drill-down sheet
  //      (منطقه › مسیر › محله). Replaces the three stacked selects.

  let locSheetView = { level: 'root', regionId: '', routeId: '' };

  function currentLocLabel() {
    if (pLocFilter.unassigned) return 'بدون موقعیت';
    if (pLocFilter.neighborhoodId) { const n = getNeighborhood(pLocFilter.neighborhoodId); if (n) return n.name; }
    if (pLocFilter.routeId) { const r = getRoute(pLocFilter.routeId); if (r) return r.name; }
    if (pLocFilter.regionId) { const g = getRegion(pLocFilter.regionId); if (g) return g.name; }
    return 'همه';
  }

  function updateLocCapUI() {
    const val = document.getElementById('pl-loc-value');
    if (val) val.textContent = currentLocLabel();
    const cap = document.getElementById('pl-loc-cap');
    if (cap) cap.classList.toggle('is-set', !!(pLocFilter.unassigned || pLocFilter.regionId || pLocFilter.routeId || pLocFilter.neighborhoodId));
  }

  function setLocFilter(next) {
    pLocFilter = Object.assign({ regionId: '', routeId: '', neighborhoodId: '', unassigned: false }, next);
    updateLocCapUI();
    renderProspectListOnly();
  }

  function locSheetRow(label, attrs, chevron) {
    return '<button type="button" class="pl-sheet-item" ' + attrs + '><span>' + esc(label) + '</span>' +
      '<span class="pl-sheet-check" aria-hidden="true">' + (chevron ? '›' : '') + '</span></button>';
  }

  function renderLocSheet() {
    const v = locSheetView;
    let title = 'موقعیت';
    let back = '';
    let rows = '';
    if (v.level === 'root') {
      rows = locSheetRow('همه مغازه‌ها', 'data-apply="all"', false) +
        locSheetRow('بدون موقعیت', 'data-apply="unassigned"', false) +
        listRegions().map(function (g) { return locSheetRow(g.name, 'data-drill-region="' + esc(g.id) + '"', true); }).join('');
    } else if (v.level === 'region') {
      const g = getRegion(v.regionId);
      title = g ? g.name : 'منطقه';
      back = '<button type="button" class="pl-sheet-back" data-back="1">‹ موقعیت‌ها</button>';
      rows = locSheetRow('کل ' + title, 'data-apply-region="' + esc(v.regionId) + '"', false) +
        listRoutes(v.regionId).map(function (r) {
          return listNeighborhoods(r.id).length
            ? locSheetRow(r.name, 'data-drill-route="' + esc(r.id) + '"', true)
            : locSheetRow(r.name, 'data-apply-route="' + esc(r.id) + '"', false);
        }).join('');
    } else {
      const r = getRoute(v.routeId);
      title = r ? r.name : 'مسیر';
      back = '<button type="button" class="pl-sheet-back" data-back="1">‹ ' + esc(r ? (getRegion(r.regionId) || {}).name || 'منطقه' : 'منطقه') + '</button>';
      rows = locSheetRow('کل ' + title, 'data-apply-route="' + esc(v.routeId) + '"', false) +
        listNeighborhoods(v.routeId).map(function (n) { return locSheetRow(n.name, 'data-apply-neigh="' + esc(n.id) + '"', false); }).join('');
    }
    openSheet(
      back +
      '<h3 class="pl-sheet-title">' + esc(title) + '</h3>' +
      '<div class="pl-sheet-list">' + rows + '</div>' +
      '<button type="button" class="pl-sheet-manage" data-manage-locations="1">مدیریت موقعیت‌ها</button>'
    );
    bindLocSheet();
  }

  function bindLocSheet() {
    const on = function (sel, fn) {
      document.querySelectorAll(sel).forEach(function (b) { b.addEventListener('click', fn); });
    };
    on('[data-back]', function () {
      locSheetView = locSheetView.level === 'route' ? { level: 'region', regionId: getRoute(locSheetView.routeId) ? getRoute(locSheetView.routeId).regionId : '', routeId: '' } : { level: 'root', regionId: '', routeId: '' };
      renderLocSheet();
    });
    on('[data-drill-region]', function (e) {
      locSheetView = { level: 'region', regionId: e.currentTarget.getAttribute('data-drill-region'), routeId: '' };
      renderLocSheet();
    });
    on('[data-drill-route]', function (e) {
      locSheetView = { level: 'route', regionId: locSheetView.regionId, routeId: e.currentTarget.getAttribute('data-drill-route') };
      renderLocSheet();
    });
    on('[data-apply]', function (e) {
      const k = e.currentTarget.getAttribute('data-apply');
      closeModal();
      setLocFilter(k === 'unassigned' ? { unassigned: true } : {});
    });
    on('[data-apply-region]', function (e) {
      const id = e.currentTarget.getAttribute('data-apply-region');
      closeModal();
      setLocFilter({ regionId: id });
    });
    on('[data-apply-route]', function (e) {
      const id = e.currentTarget.getAttribute('data-apply-route');
      const r = getRoute(id);
      closeModal();
      setLocFilter({ regionId: r ? r.regionId : '', routeId: id });
    });
    on('[data-apply-neigh]', function (e) {
      const id = e.currentTarget.getAttribute('data-apply-neigh');
      const n = getNeighborhood(id);
      const r = n ? getRoute(n.routeId) : null;
      closeModal();
      setLocFilter({ regionId: r ? r.regionId : '', routeId: n ? n.routeId : '', neighborhoodId: id });
    });
    on('[data-manage-locations]', function () {
      closeModal();
      AppRouter.navigate('/locations');
    });
  }

  function openProspectLocSheet() {
    // Start from the current selection's level so the user lands where they were.
    if (pLocFilter.neighborhoodId || pLocFilter.routeId) {
      const rid = pLocFilter.routeId || (getNeighborhood(pLocFilter.neighborhoodId) || {}).routeId;
      const r = getRoute(rid);
      locSheetView = { level: 'route', regionId: r ? r.regionId : '', routeId: rid };
    } else if (pLocFilter.regionId) {
      locSheetView = { level: 'region', regionId: pLocFilter.regionId, routeId: '' };
    } else {
      locSheetView = { level: 'root', regionId: '', routeId: '' };
    }
    renderLocSheet();
  }

  function mount(root, params) {
    let refreshToken = null;
    if (!root) return function () {};

    const fab = document.getElementById('fab');
    if (fab) {
      fab.style.display = 'block';
      fabHandler = function () {
        navigateToEvaluation(null);
      };
      fab.onclick = fabHandler;
    }
    const nav = document.getElementById('nav');
    if (nav) nav.style.display = '';

    pQuery = '';
    pFilter = 'all';
    pSort = 'score_desc';
    pLocFilter = { regionId: '', routeId: '', neighborhoodId: '', unassigned: false };
    drawProspectsPage(root);

    refreshToken = ViewHost.setRefresh(renderProspectListOnly);
    return function unmount() {
      ViewHost.clearRefresh(refreshToken);
      refreshToken = null;
      if (searchHandler) {
        const se = document.getElementById('prospect-search');
        if (se) se.removeEventListener('input', searchHandler);
      }
      searchHandler = null;

      chipHandlers.forEach(function (h) {
        try {
          h.el.removeEventListener('click', h.fn);
        } catch (e) {}
      });
      chipHandlers = [];

      if (sortHandler) {
        const so = document.getElementById('prospect-sort');
        if (so) so.removeEventListener('change', sortHandler);
      }
      sortHandler = null;

      if (listClickHandler) {
        const list = document.getElementById('prospect-list');
        if (list) list.removeEventListener('click', listClickHandler);
      }
      listClickHandler = null;

      if (fab) {
        fab.style.display = 'none';
        fab.onclick = null;
      }
      fabHandler = null;
      targetBtnHandler = null;
      root.innerHTML = '';
    };
  }

  global.ProspectsView = { mount: mount, unmount: function () {} };
})(typeof window !== 'undefined' ? window : this);