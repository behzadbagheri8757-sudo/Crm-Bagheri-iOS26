/* js/views/checks.js — SPA Checks view (Phase 9).
   Extracted from checks.html. Reuses check status helpers, openAddCheck,
   openCustomerDetail, openInvoiceDetail as-is. No new financial logic.
*/
'use strict';

(function (global) {
  let chkQuery = '';
  let chkFilter = 'all'; // all | pending | cleared | bounced | dueSoon | overdue
  let chkSort = 'dueAsc'; // dueAsc | dueDesc | amountDesc | newest

  let searchHandler = null;
  let chipHandlers = [];
  let sortHandler = null;
  let fabHandler = null;
  function navigateToCustomer(cid) {
    AppRouter.navigate('/customer', { id: cid });
  }

  function navigateToInvoice(invId) {
    AppRouter.navigate('/invoice', { id: invId });
  }

  function checkStatusLabel(ch, isSupplier) {
    if (ch.status === 'bounced') return { label: 'برگشتی', cls: 'accent-rust', key: 'bounced' };
    if (ch.status === 'cleared') {
      return { label: isSupplier ? 'پرداخت‌شده' : 'وصول‌شده', cls: 'accent-olive', key: 'cleared' };
    }
    return { label: 'در جریان', cls: 'accent-amber', key: 'pending' };
  }

  /* تفاوت روز تقویمی تا سررسید (نسبت به نیمه‌شب امروز به وقت محلی).
     منفی = معوق، ۰ = امروز، مثبت = آینده، null = تاریخ نامعتبر/نامشخص.
     همهٔ برچسب‌ها و فیلترها از همین یک تابع استفاده می‌کنند تا با هم ناسازگار نشوند. */
  function dueDiffDays(ch) {
    if (!ch || !ch.dueDate) return null;
    const dueMs = new Date(String(ch.dueDate).slice(0, 10) + 'T00:00:00').getTime();
    if (!isFinite(dueMs)) return null;
    const todayMs = new Date(todayISO() + 'T00:00:00').getTime();
    return Math.round((dueMs - todayMs) / 86400000);
  }

  function isDueSoon(ch) {
    if (ch.status === 'cleared' || ch.status === 'bounced') return false;
    const diff = dueDiffDays(ch);
    return diff !== null && diff >= 0 && diff <= 3;
  }

  function isOverdue(ch) {
    if (ch.status === 'cleared' || ch.status === 'bounced') return false;
    const diff = dueDiffDays(ch);
    return diff !== null && diff < 0;
  }

  function checkSortTimestamp(ch) {
    if (!ch) return 0;
    const explicitDate = ch.date || ch.issueDate;
    if (explicitDate) {
      const parsed = new Date(String(explicitDate).slice(0, 10) + 'T00:00:00').getTime();
      if (isFinite(parsed)) return parsed;
    }
    // uid() is Date.now().toString(36) + a five-character random suffix.
    const id = String(ch.id || '');
    if (/^[a-z0-9]{10,}$/.test(id)) {
      const ts = parseInt(id.slice(0, -5), 36);
      if (isFinite(ts) && ts > 1000000000000) return ts;
    }
    return 0;
  }

  function renderCheckListOnly() {
    const listEl = document.getElementById('check-list');
    const sumEl = document.getElementById('check-summary');
    if (!listEl || !sumEl) return;

    let rows = (data.checks || []).slice().map(ch => {
      const cust = data.customers.find(c => c.id === ch.customerId);
      const inv = ch.invoiceId ? data.invoices.find(i => i.id === ch.invoiceId) : null;
      const st = checkStatusLabel(ch, false);
      return { ch, cust, inv, st, isSupplier: false,
        dueSoon: isDueSoon(ch), overdue: isOverdue(ch),
        partyName: cust ? cust.name : '—' };
    });
    (data.suppliers || []).forEach(sp => {
      (sp.payments || []).forEach((ch, idx) => {
        if (ch.method !== 'check') return;
        const st = checkStatusLabel(ch, true);
        rows.push({ ch, supplier: sp, supplierPaymentIndex: idx, st, isSupplier: true,
          dueSoon: isDueSoon(ch), overdue: isOverdue(ch), partyName: sp.name || '—' });
      });
    });

    const q = (chkQuery || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        (r.partyName || '').toLowerCase().includes(q) ||
        String(r.ch.bank || '').toLowerCase().includes(q) ||
        String(r.ch.checkNumber || '').toLowerCase().includes(q) ||
        String(r.ch.amount || '').includes(q) ||
        String(r.inv && r.inv.number || '').includes(q)
      );
    }

    if (chkFilter === 'pending') rows = rows.filter(r => r.st.key === 'pending');
    else if (chkFilter === 'cleared') rows = rows.filter(r => r.st.key === 'cleared');
    else if (chkFilter === 'bounced') rows = rows.filter(r => r.st.key === 'bounced');
    else if (chkFilter === 'dueSoon') rows = rows.filter(r => r.dueSoon);
    else if (chkFilter === 'overdue') rows = rows.filter(r => r.overdue);

    const amountOf = r => r.isSupplier ? (Number(r.ch.faceAmount != null ? r.ch.faceAmount : r.ch.amount) || 0) : (Number(r.ch.amount) || 0);
    if (chkSort === 'dueDesc') rows.sort((a,b) => (b.ch.dueDate || '').localeCompare(a.ch.dueDate || ''));
    else if (chkSort === 'amountDesc') rows.sort((a,b) => amountOf(b) - amountOf(a));
    else if (chkSort === 'newest') rows.sort((a,b) => checkSortTimestamp(b.ch) - checkSortTimestamp(a.ch) || String(b.ch.id || '').localeCompare(String(a.ch.id || '')));
    else rows.sort((a,b) => (a.ch.dueDate || '').localeCompare(b.ch.dueDate || ''));

    const totalAll = rows.reduce((s,r) => s + amountOf(r), 0);
    const pendingSum = rows.filter(r => r.st.key === 'pending').reduce((s,r) => s + amountOf(r), 0);
    sumEl.innerHTML = `
      <div class="card"><div class="label">تعداد چک (فیلتر)</div><div class="value">${enToFaDigits(String(rows.length))}</div></div>
      <div class="card"><div class="label">جمع مبلغ اسمی چک‌ها (شامل برگشتی)</div><div class="value">${toman(totalAll)} ت</div></div>
      <div class="card wide"><div class="label">جمع در جریان (در فیلتر فعلی)</div><div class="value accent-amber">${toman(pendingSum)} ت</div></div>
    `;

    if (!rows.length) {
      listEl.innerHTML = `<div class="empty">${((data.checks || []).length || (data.suppliers || []).some(sp => (sp.payments || []).some(p => p.method === 'check'))) ? 'موردی پیدا نشد' : 'هنوز چکی ثبت نشده. با + ثبت کنید.'}</div>`;
      return;
    }

    listEl.innerHTML = rows.map(r => {
      const ch = r.ch;
      const partyHref = r.isSupplier
        ? '#/supplier?id=' + encodeURIComponent(r.supplier.id)
        : '#/customer?id=' + encodeURIComponent(ch.customerId);
      const invLink = ch.invoiceId
        ? ` · <a href="#/invoice?id=${encodeURIComponent(ch.invoiceId)}" class="tx-inline-link">فاکتور #${esc(String(r.inv ? r.inv.number : '—'))}</a>`
        : '';
      const dueCls = (r.dueSoon || r.overdue || r.st.key === 'bounced') ? 'accent-rust' : '';
      const statusCls = r.st.cls;
      const checkAmount = amountOf(r);
      const statusButton = r.isSupplier
        ? (r.st.key === 'bounced'
          ? '<span class="tx-row-meta accent-rust">برگشتی · اصلاح از صفحه تأمین‌کننده</span>'
          : '<button type="button" class="btn small secondary tx-status-btn ' + statusCls + '" data-toggle-sup-check="' + esc(r.supplier.id) + ':' + r.supplierPaymentIndex + '">' + r.st.label + '</button>')
        : '<button type="button" class="btn small secondary tx-status-btn ' + statusCls + '" data-toggle-check="' + esc(ch.id) + '">' + r.st.label + '</button>';
      return `<div class="ledger-row tx-row" style="cursor:default;align-items:flex-start;">
        <span class="name" style="flex:1;min-width:0;">
          <a href="${partyHref}" class="tx-row-title" style="text-decoration:none;color:inherit;">${esc(r.partyName)}</a>
          <span class="sub">${r.isSupplier ? 'چک پرداختی تأمین‌کننده' : 'چک دریافتی مشتری'}${ch.checkNumber ? ' · ش ' + esc(ch.checkNumber) : ''}${ch.bank ? ' · ' + esc(ch.bank) : ''}</span>
          <span class="sub">سررسید <span class="${dueCls}">${faDate(ch.dueDate)}</span>${invLink}</span>
          ${r.dueSoon && r.st.key === 'pending' ? '<span class="sub accent-rust">سررسید نزدیک</span>' : ''}
          ${r.overdue && r.st.key === 'pending' ? '<span class="sub accent-rust">سررسید گذشته</span>' : ''}
        </span>
        <span class="filler"></span>
        <span class="amount tx-row-amount">
          <span class="tx-row-total">${toman(checkAmount)} ت</span>
          ${statusButton}
        </span>
      </div>`;
    }).join('');
  }

  function openNewCheckPicker() {
    if (!data.customers.length) {
      openSheet(`<h3>مشتری ندارید</h3><div class="empty">اول از بخش مشتریان، یک مشتری ثبت کنید.</div>
        <div class="btn-row"><a class="btn secondary" href="#/customers">رفتن به مشتریان</a></div>`);
      return;
    }
    const opts = data.customers.filter(c => c.active !== false).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', 'fa'))
      .map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    openSheet(`
      <h3>ثبت چک</h3>
      <div class="field"><label>مشتری</label><select id="chk-pick-customer">${opts}</select></div>
      <div class="btn-row"><button class="btn" id="chk-pick-go">ادامه</button></div>
    `);
    document.getElementById('chk-pick-go').onclick = function () {
      const cid = document.getElementById('chk-pick-customer').value;
      closeModal();
      if (typeof openAddCheck === 'function') openAddCheck(cid);
    };
  }

  function drawChecksPage(root) {
    const chip = function (id, label) {
      return `<button type="button" class="chip ${chkFilter === id ? 'active' : ''}" data-cf="${id}">${label}</button>`;
    };
    root.innerHTML = `
      <div class="field"><input id="check-search" placeholder="جستجوی مشتری، شماره چک، مبلغ..." value="${esc(chkQuery)}" autocomplete="off"></div>
      <div class="chip-row" id="check-chips">
        ${chip('all','همه')}
        ${chip('pending','در جریان')}
        ${chip('cleared','وصول‌شده / پرداخت‌شده')}
        ${chip('bounced','برگشتی')}
        ${chip('dueSoon','سررسید نزدیک')}
        ${chip('overdue','چک سررسیدگذشته')}
      </div>
      <div class="tx-toolbar">
        <label class="tx-toolbar-label" for="check-sort">مرتب‌سازی</label>
        <select id="check-sort" class="tx-toolbar-select">
          <option value="dueAsc" ${chkSort === 'dueAsc' ? 'selected' : ''}>نزدیک‌ترین سررسید</option>
          <option value="dueDesc" ${chkSort === 'dueDesc' ? 'selected' : ''}>دورترین سررسید</option>
          <option value="amountDesc" ${chkSort === 'amountDesc' ? 'selected' : ''}>بیشترین مبلغ</option>
          <option value="newest" ${chkSort === 'newest' ? 'selected' : ''}>جدیدترین ثبت</option>
        </select>
      </div>
      <div id="check-summary" class="cards" style="margin-bottom:12px;"></div>
      <p class="tx-hint">برای تغییر وضعیت وصول، روی دکمه وضعیت هر چک بزنید.</p>
      <div id="check-list" class="tx-list"></div>
    `;

    const searchEl = document.getElementById('check-search');
    searchHandler = function (e) {
      chkQuery = e.target.value;
      renderCheckListOnly();
    };
    searchEl.addEventListener('input', searchHandler);

    chipHandlers = [];
    document.querySelectorAll('#check-chips [data-cf]').forEach(function (btn) {
      const fn = function () {
        chkFilter = btn.getAttribute('data-cf');
        document.querySelectorAll('#check-chips [data-cf]').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-cf') === chkFilter);
        });
        renderCheckListOnly();
      };
      btn.addEventListener('click', fn);
      chipHandlers.push({ el: btn, fn: fn });
    });

    const sortEl = document.getElementById('check-sort');
    sortHandler = function (e) {
      chkSort = e.target.value;
      renderCheckListOnly();
    };
    sortEl.addEventListener('change', sortHandler);

    // Delegated event for status toggle (survives list re-render)
    const listEl = document.getElementById('check-list');
    listEl.addEventListener('click', async function (e) {
      const supplierBtn = e.target.closest('[data-toggle-sup-check]');
      const btn = e.target.closest('[data-toggle-check]');
      if (!btn && !supplierBtn) return;
      if (btn && btn.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (supplierBtn) {
        const parts = supplierBtn.getAttribute('data-toggle-sup-check').split(':');
        const sp = (data.suppliers || []).find(x => x.id === parts[0]);
        const idx = Number(parts[1]);
        const payment = sp && sp.payments && sp.payments[idx];
        if (!payment || payment.method !== 'check' || payment.status === 'bounced') return;
        const next = (payment.status || 'pending') === 'pending' ? 'cleared' : 'bounced';
        const face = Number(payment.faceAmount != null ? payment.faceAmount : payment.amount) || 0;
        const msg = next === 'cleared'
          ? 'این چک پرداخت‌شده ثبت شود؟ مانده تأمین‌کننده کاهش می‌یابد.'
          : 'این چک برگشتی ثبت شود؟ مبلغ پرداخت از حساب حذف و بدهی تأمین‌کننده افزایش می‌یابد.';
        if (!(await appConfirm(msg))) return;
        await withSubmitGuard(supplierBtn, async function(){
          const previousData = JSON.parse(JSON.stringify(data));
          payment.faceAmount = face; payment.status = next; payment.amount = next === 'bounced' ? 0 : face;
          try { await saveData(); }
          catch (err) { restoreDataInPlace(previousData); throw err; }
          showToast(next === 'cleared' ? 'چک پرداخت‌شده ثبت شد' : 'چک برگشتی ثبت شد');
          renderCheckListOnly();
        });
        return;
      }
      const id = btn.getAttribute('data-toggle-check');
      const chk = data.checks.find(x => x.id === id);
      if (!chk) return;
      if(!(await appConfirm(chk.status === 'cleared' ? 'وضعیت این چک به «در جریان» برگردد؟' : 'این چک به‌عنوان «وصول‌شده» ثبت شود؟'))) return;
      await withSubmitGuard(btn, async function(){
        const previousData = JSON.parse(JSON.stringify(data));
        chk.status = chk.status === 'cleared' ? 'pending' : 'cleared';
        try { await saveData(); }
        catch (err) { restoreDataInPlace(previousData); throw err; }
        showToast(chk.status === 'cleared' ? 'چک وصول شد' : 'چک به حالت در جریان برگشت');
        renderCheckListOnly();
      });
    });

    renderCheckListOnly();
  }

  function mount(root, params) {
    let refreshToken = null;
    if (!root) return function () {};

    const fab = document.getElementById('fab');
    if (fab) {
      fab.style.display = 'block';
      fabHandler = function () {
        openNewCheckPicker();
      };
      fab.onclick = fabHandler;
    }
    const nav = document.getElementById('nav');
    if (nav) nav.style.display = '';

    chkQuery = '';
    var validChkFilters = ['all', 'pending', 'cleared', 'bounced', 'dueSoon', 'overdue'];
    var incomingFilter = params && params.filter;
    chkFilter = (incomingFilter && validChkFilters.indexOf(incomingFilter) !== -1)
      ? incomingFilter
      : 'all';
    chkSort = 'dueAsc';
    drawChecksPage(root);

    refreshToken = ViewHost.setRefresh(renderCheckListOnly);
    return function unmount() {
      ViewHost.clearRefresh(refreshToken);
      refreshToken = null;
      if (searchHandler) {
        const se = document.getElementById('check-search');
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
        const so = document.getElementById('check-sort');
        if (so) so.removeEventListener('change', sortHandler);
      }
      sortHandler = null;

      if (fab) {
        fab.style.display = 'none';
        fab.onclick = null;
      }
      fabHandler = null;
      root.innerHTML = '';
    };
  }

  global.ChecksView = { mount: mount, unmount: function () {} };
})(typeof window !== 'undefined' ? window : this);