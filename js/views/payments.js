/* js/views/payments.js — SPA Payments view (Phase 5 + Phase 2 UI).
   Extracted from payments.html. Reuses paymentMethodLabel, customerTotals,
   openAddTransaction/openCustomerDetail as-is. No new financial logic.
*/
'use strict';

(function (global) {
  let payQuery = '';
  let payFilter = 'all';
  let paySort = 'newest';

  let searchHandler = null;
  let chipHandlers = [];
  let sortHandler = null;
  let fabHandler = null;
  function navigateToCustomer(cid) {
    AppRouter.navigate('/customer', { id: cid });
  }

  function paymentRows() {
    const rows = [];

    (data.payments || []).forEach(p => {
      const cust = data.customers.find(c => c.id === p.customerId);
      const inv = p.invoiceId
        ? data.invoices.find(i => i.id === p.invoiceId)
        : null;

      rows.push({
        kind: 'customer',
        id: p.id,
        date: p.date || '',
        amount: p.amount || 0,
        method: p.method || '',
        methodLabel: paymentMethodLabel(p.method),
        partyName: cust ? cust.name : '—',
        partyId: p.customerId,
        invoiceId: p.invoiceId || null,
        invoiceNumber: inv ? inv.number : null,
        note: p.note || '',
        raw: p,
      });
    });

    (data.suppliers || []).forEach(s => {
      (s.payments || []).forEach((p, idx) => {
        rows.push({
          kind: 'supplier',
          id: 'suppay-' + s.id + '-' + idx,
          date: p.date || '',
          amount: p.amount || 0,
          method: 'supplier',
          methodLabel: p.method === 'check'
            ? ('چک به تامین‌کننده · ' + (p.status === 'cleared' ? 'پرداخت‌شده' : (p.status === 'bounced' ? 'برگشتی' : 'در جریان')))
            : 'پرداخت نقدی به تامین‌کننده',
          partyName: s.name || '—',
          partyId: s.id,
          invoiceId: null,
          invoiceNumber: null,
          note: p.note || p.desc || '',
          raw: p,
        });
      });
    });

    return rows;
  }

  function renderPaymentListOnly() {
    const listEl = document.getElementById('payment-list');
    const sumEl = document.getElementById('payment-summary');

    if (!listEl || !sumEl) return;

    let rows = paymentRows();

    const q = (payQuery || '').trim().toLowerCase();

    if (q) {
      rows = rows.filter(r =>
        (r.partyName || '').toLowerCase().includes(q) ||
        (r.methodLabel || '').toLowerCase().includes(q) ||
        (r.note || '').toLowerCase().includes(q) ||
        String(r.amount).includes(q) ||
        String(r.invoiceNumber || '').includes(q)
      );
    }

    if (payFilter === 'supplier') {
      rows = rows.filter(r => r.kind === 'supplier');
    } else if (payFilter !== 'all') {
      rows = rows.filter(r => r.method === payFilter);
    }

    if (paySort === 'oldest') {
      rows.sort(
        (a, b) =>
          (a.date || '').localeCompare(b.date || '') ||
          a.amount - b.amount
      );
    } else if (paySort === 'amountDesc') {
      rows.sort((a, b) => b.amount - a.amount);
    } else if (paySort === 'amountAsc') {
      rows.sort((a, b) => a.amount - b.amount);
    } else {
      rows.sort(
        (a, b) =>
          (b.date || '').localeCompare(a.date || '') ||
          b.amount - a.amount
      );
    }

    const totalAmount = rows.reduce(
      (s, r) => s + (r.amount || 0),
      0
    );

    sumEl.innerHTML = `<span class="lp-count">${enToFaDigits(String(rows.length))} پرداخت<span class="lp-sep" aria-hidden="true">·</span>${toman(totalAmount)} ت</span>`;

    if (!rows.length) {
      listEl.innerHTML = `
        <div class="empty">
          ${
            paymentRows().length
              ? 'موردی پیدا نشد'
              : 'هنوز پرداختی ثبت نشده. با + ثبت کنید.'
          }
        </div>
      `;
      return;
    }

    listEl.onclick = function (e) {
      const b = e.target && e.target.closest ? e.target.closest('[data-edit-payment]') : null;
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof openEditStandalonePayment === 'function') openEditStandalonePayment(b.getAttribute('data-edit-cid'), b.getAttribute('data-edit-payment'));
    };
    listEl.innerHTML = rows
      .map(r => {
        const href =
          r.kind === 'supplier'
            ? '#/supplier?id=' +
              encodeURIComponent(r.partyId)
            : r.invoiceId
            ? '#/invoice?id=' +
              encodeURIComponent(r.invoiceId)
            : '#/customer?id=' +
              encodeURIComponent(r.partyId);

        const invBit = r.invoiceNumber != null
          ? ' · فاکتور #' + r.invoiceNumber
          : '';
        const noteBit = r.note
          ? '<span class="sub tx-row-ctx">' + esc(r.note) + '</span>'
          : '';

        /* Independent customer payments (not invoice-linked, not returns) get an edit affordance
           that opens the existing edit sheet; the row itself keeps its navigation. */
        const editable = r.kind === 'customer' && !r.invoiceId && ['cash','card','transfer','discount'].includes(r.method);
        const editBtn = editable
          ? `<button type="button" class="tx-row-edit" data-edit-payment="${esc(r.id)}" data-edit-cid="${esc(r.partyId)}">ویرایش</button>`
          : '';
        return `
          <a
            class="ledger-row tx-row"
            href="${href}"
            style="text-decoration:none;color:inherit;"
          >
            <span class="name">
              <span class="tx-row-title">${esc(r.partyName)}</span>
              <span class="sub">${esc(r.methodLabel)} · ${faDate(r.date)}${esc(invBit)}</span>
              ${noteBit}
            </span>

            <span class="filler"></span>

            <span class="amount tx-row-amount">
              <span class="tx-row-total">${toman(r.amount)} ت</span>
              ${editBtn}
            </span>
          </a>
        `;
      })
      .join('');
  }

  function openNewPaymentPicker() {
    if (!data.customers.length) {
      openSheet(`
        <h3>مشتری ندارید</h3>
        <div class="empty">
          اول از بخش مشتریان، یک مشتری ثبت کنید.
        </div>
        <div class="btn-row">
          <a class="btn secondary" href="#/customers">
            رفتن به مشتریان
          </a>
        </div>
      `);
      return;
    }

    const opts = data.customers
      .filter(c => c.active !== false)
      .slice()
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'fa')
      )
      .map(
        c =>
          `<option value="${esc(c.id)}">${esc(c.name)}</option>`
      )
      .join('');

    openSheet(`
      <h3>ثبت پرداخت / دریافت</h3>

      <div class="field">
        <label>مشتری</label>
        <select id="pay-pick-customer">
          ${opts}
        </select>
      </div>

      <div
        class="empty"
        style="padding:0 0 8px;text-align:right;font-size:.78rem;"
      >
        پرداخت به تامین‌کننده از صفحه همان تامین‌کننده ثبت می‌شود.
      </div>

      <div class="btn-row">
        <button class="btn" id="pay-pick-go">
          ادامه
        </button>
      </div>
    `);

    document.getElementById('pay-pick-go').onclick = () => {
      const cid =
        document.getElementById('pay-pick-customer').value;

      closeModal();

      if (typeof openAddTransaction === 'function') {
        openAddTransaction(cid);
      }
    };
  }

  // فیلترهای ثانویه (برگشت / تخفیف / تامین‌کننده) داخل برگهٔ فیلتر هستند، نه سگمنت.
  const PAY_EXTRA = [
    { id: 'return', label: 'برگشت' },
    { id: 'discount', label: 'تخفیف' },
    { id: 'supplier', label: 'تامین‌کننده' }
  ];
  function payExtraActive() { return PAY_EXTRA.some(function (x) { return x.id === payFilter; }); }

  function openPayFilterSheet() {
    const rowsHtml = [{ id: 'all', label: 'همه' }].concat(PAY_EXTRA).map(function (x) {
      const sel = payFilter === x.id;
      return '<button type="button" class="pl-sheet-item' + (sel ? ' is-selected' : '') + '" data-pay-pick="' + x.id + '">' +
        '<span>' + x.label + '</span><span class="pl-sheet-check" aria-hidden="true">' + (sel ? '✓' : '') + '</span></button>';
    }).join('');
    openSheet('<h3 class="pl-sheet-title">فیلتر پرداخت</h3><div class="pl-sheet-list">' + rowsHtml + '</div>');
    document.querySelectorAll('[data-pay-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        payFilter = b.getAttribute('data-pay-pick');
        closeModal();
        document.querySelectorAll('#payment-chips [data-pf]').forEach(function (c) {
          c.classList.toggle('active', c.getAttribute('data-pf') === payFilter);
        });
        const fb = document.getElementById('payment-filter-btn');
        if (fb) fb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>' + (payExtraActive() ? '<span class="lp-badge">۱</span>' : '');
        renderPaymentListOnly();
      });
    });
  }

  function drawPaymentsPage(root) {
    const chip = function (id, label) {
      return `
        <button
          type="button"
          class="chip ${payFilter === id ? 'active' : ''}"
          data-pf="${id}"
        >
          ${label}
        </button>
      `;
    };

    root.innerHTML = `
      <div class="lp-search-row">
        <div class="field lp-search">
          <input
            id="payment-search"
            placeholder="جستجوی مشتری، تامین‌کننده، مبلغ، توضیح..."
            value="${esc(payQuery)}"
            autocomplete="off"
          >
        </div>
        <button type="button" class="lp-filter-btn" id="payment-filter-btn" aria-label="فیلترهای بیشتر">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          ${payExtraActive() ? '<span class="lp-badge">۱</span>' : ''}
        </button>
      </div>

      <div class="chip-row segmented-control" id="payment-chips">
        ${chip('all', 'همه')}
        ${chip('cash', 'نقد')}
        ${chip('card', 'کارت')}
        ${chip('transfer', 'انتقال')}
      </div>

      <div class="lp-summary-row">
        <div id="payment-summary" class="lp-summary"></div>
        <div class="lp-sort">
          <label for="payment-sort">مرتب‌سازی</label>
          <select id="payment-sort">
            <option value="newest" ${paySort === 'newest' ? 'selected' : ''}>جدیدترین</option>
            <option value="oldest" ${paySort === 'oldest' ? 'selected' : ''}>قدیمی‌ترین</option>
            <option value="amountDesc" ${paySort === 'amountDesc' ? 'selected' : ''}>بیشترین مبلغ</option>
            <option value="amountAsc" ${paySort === 'amountAsc' ? 'selected' : ''}>کمترین مبلغ</option>
          </select>
        </div>
      </div>

      <div id="payment-list" class="tx-list"></div>
    `;

    const searchEl =
      document.getElementById('payment-search');

    searchHandler = function (e) {
      payQuery = e.target.value;
      renderPaymentListOnly();
    };

    searchEl.addEventListener(
      'input',
      searchHandler
    );

    const payFilterBtn = document.getElementById('payment-filter-btn');
    if (payFilterBtn) payFilterBtn.addEventListener('click', openPayFilterSheet);

    chipHandlers = [];

    document
      .querySelectorAll('#payment-chips [data-pf]')
      .forEach(function (btn) {
        const fn = function () {
          payFilter =
            btn.getAttribute('data-pf');

          document
            .querySelectorAll(
              '#payment-chips [data-pf]'
            )
            .forEach(function (b) {
              b.classList.toggle(
                'active',
                b.getAttribute('data-pf') === payFilter
              );
            });

          renderPaymentListOnly();
        };

        btn.addEventListener('click', fn);

        chipHandlers.push({
          el: btn,
          fn: fn,
        });
      });

    const sortEl =
      document.getElementById('payment-sort');

    sortHandler = function (e) {
      paySort = e.target.value;
      renderPaymentListOnly();
    };

    sortEl.addEventListener(
      'change',
      sortHandler
    );

    renderPaymentListOnly();
  }

  function mount(root, params) {
    let refreshToken = null;
    if (!root) return function () {};

    const fab =
      document.getElementById('fab');

    if (fab) {
      fab.style.display = 'block';

      fabHandler = function () {
        openNewPaymentPicker();
      };

      fab.onclick = fabHandler;
    }

    const nav =
      document.getElementById('nav');

    if (nav) {
      nav.style.display = '';
    }

    payQuery = '';
    payFilter = 'all';
    paySort = 'newest';

    drawPaymentsPage(root);

    refreshToken = ViewHost.setRefresh(renderPaymentListOnly);
    return function unmount() {
      ViewHost.clearRefresh(refreshToken);
      refreshToken = null;
      if (searchHandler) {
        const se =
          document.getElementById(
            'payment-search'
          );

        if (se) {
          se.removeEventListener(
            'input',
            searchHandler
          );
        }
      }

      searchHandler = null;

      chipHandlers.forEach(function (h) {
        try {
          h.el.removeEventListener(
            'click',
            h.fn
          );
        } catch (e) {}
      });

      chipHandlers = [];

      if (sortHandler) {
        const so =
          document.getElementById(
            'payment-sort'
          );

        if (so) {
          so.removeEventListener(
            'change',
            sortHandler
          );
        }
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

  global.PaymentsView = {
    mount: mount,
    unmount: function () {},
  };
})(typeof window !== 'undefined' ? window : this);
