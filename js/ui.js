/* FLARENO FAMILY — ui.js
   Rendering seluruh halaman & komponen. Tidak menggunakan framework — DOM manual + template string.
*/

const CATEGORIES_OUT = ['Makanan', 'Rumah', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Lainnya'];
const CATEGORIES_IN = ['Rejeki Tak Terduga', 'Gaji', 'Bonus', 'Usaha Sampingan', 'Hadiah', 'Lainnya'];

const UI = (() => {
  const view = () => document.getElementById('app-view');
  const modalRoot = () => document.getElementById('modal-root');

  function rp(n) {
    n = Math.round(Finance.toNumber(n));
    const sign = n < 0 ? '-' : '';
    return `${sign}Rp${Math.abs(n).toLocaleString('id-ID')}`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function openModal(innerHtml) {
    modalRoot().innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-sheet" role="dialog" aria-modal="true">
          <div class="modal-handle"></div>
          ${innerHtml}
        </div>
      </div>`;
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
  }
  function closeModal() { modalRoot().innerHTML = ''; }

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toast-root').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
  }

  function statusMeta(status) {
    if (status === 'bahaya') return { label: 'PENGELUARAN TERLALU TINGGI', cls: 'status-bahaya', dot: '🔴' };
    if (status === 'perhatian') return { label: 'PERLU DIPERHATIKAN', cls: 'status-perhatian', dot: '🟡' };
    return { label: 'KEUANGAN MASIH AMAN', cls: 'status-aman', dot: '🟢' };
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard(state) {
    const dash = Finance.computeDashboard(state.settings, state.transactions, state.bills);
    const sm = statusMeta(dash.status);
    const recent = state.transactions.slice().sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
    const ins = Statistics.insights(state.settings, state.transactions, state.bills, dash);

    view().innerHTML = `
      <div class="page page-dashboard">
        ${headerBar(state)}
        <div class="card card-hero ${sm.cls}">
          <div class="hero-label">UANG AMAN HARI INI</div>
          <div class="hero-amount">${rp(dash.batasHariIni)}</div>
          <div class="hero-sub">Batas pengeluaran yang disarankan hari ini</div>
          <div class="hero-grid">
            <div><span class="hg-label">Saldo Aman</span><span class="hg-value">${rp(dash.saldoAman)}</span></div>
            <div><span class="hg-label">Gajian</span><span class="hg-value">${dash.hariTersisa} hari lagi</span></div>
            <div><span class="hg-label">Batas Besok</span><span class="hg-value">${rp(dash.batasBesok)}</span></div>
          </div>
          <div class="status-pill">${sm.dot} ${sm.label}</div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>HARI INI</span><span>${rp(dash.pengeluaranHariIni)} / ${rp(dash.batasHariIni)}</span></div>
          <div class="progress-track"><div class="progress-fill ${sm.cls}" style="width:${Math.min(dash.persen, 100)}%"></div></div>
          <div class="card-foot-row">
            <span>${dash.sisaBatas >= 0 ? `Sisa batas: ${rp(dash.sisaBatas)}` : `🔴 Over ${rp(Math.abs(dash.sisaBatas))}`}</span>
            <span>${dash.persen}%</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>RINGKASAN BULAN INI</span></div>
          ${monthSummaryGrid(Statistics.ringkasanBulan(state.transactions, Statistics.currentMonthKey()))}
        </div>

        <div class="card">
          <div class="card-title-row"><span>PENGELUARAN 7 HARI</span></div>
          <canvas id="chart-7hari" height="160"></canvas>
        </div>

        <div class="card">
          <div class="card-title-row"><span>KATEGORI PENGELUARAN</span><a href="#/statistik" class="link-sm">Detail</a></div>
          <div class="cat-list">${categoryListHtml(Statistics.kategoriBulanIni(state.transactions, Statistics.currentMonthKey()).items.slice(0, 5))}</div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>TRANSAKSI TERAKHIR</span><a href="#/transaksi" class="link-sm">Lihat Semua</a></div>
          <div class="tx-list">${recent.length ? recent.map(txRowHtml).join('') : emptyRow('Belum ada transaksi')}</div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>FLARENO INSIGHT</span></div>
          <div class="insight-list">${ins.length ? ins.map(i => `<div class="insight-item">${i.icon} ${escapeHtml(i.text)}</div>`).join('') : emptyRow('Belum ada insight')}</div>
        </div>

        <div style="height:90px"></div>
      </div>
      <div class="fab-group">
        <button class="fab fab-secondary" id="fab-add-rejeki">🎉 Rejeki</button>
        <button class="fab" id="fab-add-tx">＋ Pengeluaran</button>
      </div>
    `;

    document.getElementById('fab-add-tx').addEventListener('click', () => openTransactionForm(state, 'out'));
    document.getElementById('fab-add-rejeki').addEventListener('click', () => openTransactionForm(state, 'in', null, 'Rejeki Tak Terduga'));
    const d7 = Statistics.pengeluaran7Hari(state.transactions, dash.batasHariIni);
    renderLineChart('chart-7hari', d7.labels, d7.aktual, d7.batas);
  }

  function headerBar(state) {
    return `
      <div class="header-bar">
        <div>
          <img src="./assets/branding/logo-horizontal.png" alt="FLARENO FAMILY" class="header-logo header-logo-light">
          <img src="./assets/branding/logo-white.png" alt="FLARENO FAMILY" class="header-logo header-logo-dark">
        </div>
        <div class="header-icons">
          <button class="icon-btn" id="btn-theme" title="Tema">${state.settings.theme === 'dark' ? '☀️' : '🌙'}</button>
          <a class="icon-btn" href="#/pengaturan" title="Pengaturan">⚙️</a>
        </div>
      </div>`;
  }

  function monthSummaryGrid(ring) {
    return `
      <div class="summary-grid">
        <div class="summary-item"><div class="s-value">${rp(ring.pemasukan)}</div><div class="s-label">Pemasukan</div></div>
        <div class="summary-item"><div class="s-value">${rp(ring.pengeluaran)}</div><div class="s-label">Pengeluaran</div></div>
        <div class="summary-item"><div class="s-value">${rp(ring.tabungan)}</div><div class="s-label">Tabungan</div></div>
        <div class="summary-item"><div class="s-value">${rp(ring.saldo)}</div><div class="s-label">Saldo</div></div>
      </div>`;
  }

  function categoryListHtml(items) {
    if (!items.length) return emptyRow('Belum ada pengeluaran bulan ini');
    return items.map(it => `
      <div class="cat-row">
        <span class="cat-icon">${it.icon}</span>
        <span class="cat-name">${escapeHtml(it.category)}</span>
        <span class="cat-percent">${it.percent}%</span>
        <span class="cat-amount">${rp(it.amount)}</span>
      </div>`).join('');
  }

  function txTypeLabel(t) {
    return { in: 'Pemasukan', out: 'Pengeluaran', transfer: 'Transfer', saving: 'Tabungan', installment: 'Cicilan' }[t] || t;
  }
  function txTypeIcon(t) {
    return { in: '⬆️', out: Statistics.iconFor === undefined ? '⬇️' : '⬇️', transfer: '🔁', saving: '🐷', installment: '💳' }[t] || '•';
  }

  function iconForTx(t) {
    if (t.category === 'Rejeki Tak Terduga') return '🎉';
    return t.type === 'out' ? Statistics.iconFor(t.category) : txTypeIcon(t.type);
  }

  function txRowHtml(t) {
    const icon = iconForTx(t);
    const sign = (t.type === 'in') ? '+' : '-';
    const cls = (t.type === 'in') ? 'amount-in' : 'amount-out';
    return `
      <div class="tx-row" data-id="${t.id}">
        <span class="tx-icon">${icon}</span>
        <span class="tx-info">
          <span class="tx-cat">${escapeHtml(t.category || txTypeLabel(t.type))}</span>
          <span class="tx-date">${fmtDate(t.date)}${t.note ? ' · ' + escapeHtml(t.note) : ''}</span>
        </span>
        <span class="tx-amount ${cls}">${sign}${rp(t.amount)}</span>
      </div>`;
  }

  function emptyRow(text) {
    return `<div class="empty-row">${escapeHtml(text)}</div>`;
  }

  /* ================= TRANSAKSI ================= */
  let txFilter = { type: 'all', q: '' };

  function renderTransaksi(state) {
    let list = state.transactions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id - a.id));
    if (txFilter.type !== 'all') list = list.filter(t => t.type === txFilter.type);
    if (txFilter.q) {
      const q = txFilter.q.toLowerCase();
      list = list.filter(t => (t.category || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q));
    }
    const quick = state.transactions.filter(t => t.type === 'out').slice().sort((a, b) => b.id - a.id).slice(0, 4);

    view().innerHTML = `
      <div class="page">
        ${pageHeader('Transaksi')}
        <div class="card">
          <div class="card-title-row"><span>TRANSAKSI CEPAT</span></div>
          <div class="quick-tx-scroll">
            ${quick.length ? quick.map(t => `
              <div class="quick-tx-chip" data-quick='${escapeHtml(JSON.stringify({ category: t.category, amount: t.amount, type: t.type }))}'>
                <div>${Statistics.iconFor(t.category)} ${escapeHtml(t.category)}</div>
                <div class="qtx-amt">${rp(t.amount)}</div>
                <button class="btn-mini">Gunakan Lagi</button>
              </div>`).join('') : emptyRow('Belum ada transaksi pengeluaran')}
          </div>
        </div>

        <div class="filter-row">
          <select id="filter-type" class="select-input">
            <option value="all">Semua</option>
            <option value="in">Pemasukan</option>
            <option value="out">Pengeluaran</option>
            <option value="transfer">Transfer</option>
            <option value="saving">Tabungan</option>
            <option value="installment">Cicilan</option>
          </select>
          <input id="filter-q" class="text-input" placeholder="Cari kategori/catatan..." value="${escapeHtml(txFilter.q)}">
        </div>

        <div class="card">
          <div class="card-title-row"><span>SEMUA TRANSAKSI (${list.length})</span></div>
          <div class="tx-list tx-list-editable">${list.length ? list.map(t => txRowEditableHtml(t)).join('') : emptyRow('Tidak ada transaksi ditemukan')}</div>
        </div>
        <div style="height:90px"></div>
      </div>
      <button class="fab" id="fab-add-tx2">＋ Tambah Transaksi</button>
    `;

    document.getElementById('filter-type').value = txFilter.type;
    document.getElementById('filter-type').addEventListener('change', (e) => { txFilter.type = e.target.value; renderTransaksi(App.state); });
    document.getElementById('filter-q').addEventListener('input', (e) => { txFilter.q = e.target.value; renderTransaksi(App.state); });
    document.getElementById('fab-add-tx2').addEventListener('click', () => openTransactionForm(state, 'out'));

    view().querySelectorAll('.quick-tx-chip .btn-mini').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chip = e.target.closest('.quick-tx-chip');
        const data = JSON.parse(chip.dataset.quick);
        addTransaction(Object.assign({}, data, { date: Finance.todayStr(), note: '' })).then(() => {
          toast('Transaksi ditambahkan');
          App.reloadAndRender();
        });
      });
    });

    view().querySelectorAll('.tx-row-edit').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.id);
        const t = state.transactions.find(x => x.id === id);
        if (t) openTransactionForm(state, t.type, t);
      });
    });
  }

  function txRowEditableHtml(t) {
    const icon = iconForTx(t);
    const sign = (t.type === 'in') ? '+' : '-';
    const cls = (t.type === 'in') ? 'amount-in' : 'amount-out';
    return `
      <div class="tx-row tx-row-edit" data-id="${t.id}">
        <span class="tx-icon">${icon}</span>
        <span class="tx-info">
          <span class="tx-cat">${escapeHtml(t.category || txTypeLabel(t.type))}</span>
          <span class="tx-date">${fmtDate(t.date)}${t.note ? ' · ' + escapeHtml(t.note) : ''}</span>
        </span>
        <span class="tx-amount ${cls}">${sign}${rp(t.amount)}</span>
      </div>`;
  }

  function openTransactionForm(state, defaultType = 'out', existing = null, presetCategory = null) {
    const isRejeki = !existing && presetCategory === 'Rejeki Tak Terduga';
    openModal(`
      <h3 class="modal-title">${existing ? 'Edit Transaksi' : (isRejeki ? '🎉 Catat Rejeki Tak Terduga' : 'Tambah Transaksi')}</h3>
      ${isRejeki ? `<p class="muted">Dapat rejeki dadakan — THR, bonus, hadiah, atau uang tak terduga lainnya? Catat di sini biar Saldo Aman dan Uang Aman Hari Ini langsung ikut naik.</p>` : ''}
      <form id="tx-form" class="form">
        <label>Jenis</label>
        <select name="type" id="tx-type-select" class="select-input" ${isRejeki ? 'disabled' : ''}>
          <option value="out">Pengeluaran</option>
          <option value="in">Pemasukan</option>
          <option value="transfer">Transfer</option>
          <option value="saving">Tabungan</option>
          <option value="installment">Cicilan</option>
        </select>
        ${isRejeki ? `<input type="hidden" name="type" value="in">` : ''}
        <label>Kategori</label>
        <select name="category" id="tx-cat-select" class="select-input"></select>
        <label>Nominal (Rp)</label>
        <input name="amount" type="number" min="1" step="1" class="text-input" required autofocus value="${existing ? existing.amount : ''}">
        <label>Tanggal</label>
        <input name="date" type="date" class="text-input" required value="${existing ? existing.date : Finance.todayStr()}">
        <label>Catatan (opsional)</label>
        <input name="note" type="text" class="text-input" placeholder="${isRejeki ? 'Contoh: THR dari kantor' : ''}" value="${existing ? escapeHtml(existing.note || '') : ''}">
        <div class="modal-actions">
          ${existing ? `<button type="button" id="btn-delete-tx" class="btn btn-danger-ghost">Hapus</button>` : ''}
          <button type="button" class="btn btn-ghost" id="btn-cancel-tx">Batal</button>
          <button type="submit" class="btn btn-primary">${isRejeki ? 'Simpan Rejeki 🎉' : 'Simpan'}</button>
        </div>
      </form>
    `);

    function fillCategories(type) {
      const sel = document.getElementById('tx-cat-select');
      const list = type === 'in' ? CATEGORIES_IN : (type === 'out' ? CATEGORIES_OUT : ['Umum']);
      const selected = existing ? existing.category : presetCategory;
      sel.innerHTML = list.map(c => `<option value="${c}" ${selected === c ? 'selected' : ''}>${c}</option>`).join('');
    }
    const typeSelect = document.getElementById('tx-type-select');
    typeSelect.value = existing ? existing.type : defaultType;
    fillCategories(typeSelect.value);
    typeSelect.addEventListener('change', () => fillCategories(typeSelect.value));

    document.getElementById('btn-cancel-tx').addEventListener('click', closeModal);
    if (existing) {
      document.getElementById('btn-delete-tx').addEventListener('click', async () => {
        await Store.delete('transactions', existing.id);
        closeModal(); toast('Transaksi dihapus'); App.reloadAndRender();
      });
    }
    document.getElementById('tx-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = Finance.toNumber(fd.get('amount'));
      const date = fd.get('date');
      if (amount <= 0) { toast('Nominal harus lebih dari 0', 'error'); return; }
      if (!date) { toast('Tanggal wajib diisi', 'error'); return; }
      const obj = {
        type: fd.get('type'),
        category: fd.get('category') || 'Lainnya',
        amount, date,
        note: fd.get('note') || ''
      };
      if (existing) { obj.id = existing.id; await Store.put('transactions', obj); toast('Transaksi diperbarui'); }
      else {
        await addTransaction(obj);
        if (isRejeki) {
          const before = Finance.computeDashboard(state.settings, state.transactions, state.bills);
          const after = Finance.computeDashboard(state.settings, state.transactions.concat([obj]), state.bills);
          toast(`🎉 Rejeki ${rp(amount)} tercatat! Batas besok naik jadi ${rp(after.batasBesok)}`);
        } else {
          toast('Transaksi ditambahkan');
        }
      }
      closeModal();
      App.reloadAndRender();
    });
  }

  async function addTransaction(obj) {
    if (!obj.date) obj.date = Finance.todayStr();
    if (!(Finance.toNumber(obj.amount) > 0)) throw new Error('Nominal tidak valid');
    return Store.add('transactions', obj);
  }

  /* ================= STATISTIK ================= */
  function renderStatistik(state) {
    const key = Statistics.currentMonthKey();
    const st = Statistics.statistikLengkap(state.transactions, key);
    const kat = Statistics.kategoriBulanIni(state.transactions, key);
    const dash = Finance.computeDashboard(state.settings, state.transactions, state.bills);
    const d7 = Statistics.pengeluaran7Hari(state.transactions, dash.batasHariIni);
    const perbandingan = st.bulanLalu.pengeluaran > 0
      ? Math.round(((st.totalPengeluaran - st.bulanLalu.pengeluaran) / st.bulanLalu.pengeluaran) * 100)
      : null;

    view().innerHTML = `
      <div class="page">
        ${pageHeader('Statistik')}
        <div class="card">
          <div class="card-title-row"><span>RINGKASAN BULAN INI</span></div>
          ${monthSummaryGrid(Statistics.ringkasanBulan(state.transactions, key))}
        </div>

        <div class="card">
          <div class="card-title-row"><span>PENGELUARAN 7 HARI</span></div>
          <canvas id="chart-7hari-2" height="160"></canvas>
        </div>

        <div class="card">
          <div class="card-title-row"><span>KATEGORI PENGELUARAN</span></div>
          <canvas id="chart-donut" height="220"></canvas>
          <div class="cat-list">${categoryListHtml(kat.items)}</div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>DETAIL STATISTIK</span></div>
          <div class="stat-detail-list">
            ${statRow('Total Pemasukan', rp(st.totalPemasukan))}
            ${statRow('Total Pengeluaran', rp(st.totalPengeluaran))}
            ${statRow('Total Tabungan', rp(st.totalTabungan))}
            ${statRow('Rata-rata Pengeluaran/Hari', rp(st.rataRataHarian))}
            ${statRow('Pengeluaran Terbesar', st.pengeluaranTerbesar ? `${rp(st.pengeluaranTerbesar.amount)} (${escapeHtml(st.pengeluaranTerbesar.category)})` : '-')}
            ${statRow('Kategori Terbesar', st.kategoriTerbesar ? `${escapeHtml(st.kategoriTerbesar.category)} (${st.kategoriTerbesar.percent}%)` : '-')}
            ${statRow('Jumlah Transaksi', st.jumlahTransaksi)}
            ${statRow('Hari Paling Boros', st.hariPalingBoros ? `${fmtDate(st.hariPalingBoros)} — ${rp(st.nominalHariPalingBoros)}` : '-')}
            ${statRow('vs Bulan Lalu', perbandingan === null ? 'Belum ada data bulan lalu' : `${perbandingan > 0 ? '⬆️' : '⬇️'} ${Math.abs(perbandingan)}%`)}
          </div>
        </div>
        <div style="height:90px"></div>
      </div>`;

    renderLineChart('chart-7hari-2', d7.labels, d7.aktual, d7.batas);
    renderDonutChart('chart-donut', kat.items);
  }

  function statRow(label, value) {
    return `<div class="stat-row"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
  }

  /* ================= ANGGARAN ================= */
  function renderAnggaran(state) {
    const key = Statistics.currentMonthKey();
    const kat = Statistics.kategoriBulanIni(state.transactions, key);
    const spentMap = {};
    kat.items.forEach(i => spentMap[i.category] = i.amount);

    view().innerHTML = `
      <div class="page">
        ${pageHeader('Anggaran')}
        <div class="card">
          <div class="card-title-row"><span>ANGGARAN BULAN INI</span></div>
          <div class="budget-list">
            ${state.budgets.length ? state.budgets.map(b => budgetRowHtml(b, spentMap[b.category] || 0)).join('') : emptyRow('Belum ada anggaran. Tambahkan anggaran per kategori.')}
          </div>
        </div>
        <div style="height:90px"></div>
      </div>
      <button class="fab" id="fab-add-budget">＋ Tambah Anggaran</button>
    `;
    document.getElementById('fab-add-budget').addEventListener('click', () => openBudgetForm(state));
    view().querySelectorAll('.budget-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.id);
        const b = state.budgets.find(x => x.id === id);
        if (b) openBudgetForm(state, b);
      });
    });
  }

  function budgetRowHtml(b, spent) {
    const pct = b.amount > 0 ? Math.min(Math.round((spent / b.amount) * 100), 999) : 0;
    const cls = pct >= 100 ? 'status-bahaya' : (pct >= 80 ? 'status-perhatian' : 'status-aman');
    return `
      <div class="budget-row" data-id="${b.id}">
        <div class="card-title-row"><span>${Statistics.iconFor(b.category)} ${escapeHtml(b.category)}</span><span>${rp(b.amount)}</span></div>
        <div class="progress-track"><div class="progress-fill ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
        <div class="card-foot-row"><span>Terpakai ${rp(spent)}</span><span>${pct}%</span></div>
      </div>`;
  }

  function openBudgetForm(state, existing = null) {
    openModal(`
      <h3 class="modal-title">${existing ? 'Edit Anggaran' : 'Tambah Anggaran'}</h3>
      <form id="budget-form" class="form">
        <label>Kategori</label>
        <select name="category" class="select-input">${CATEGORIES_OUT.map(c => `<option ${existing && existing.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <label>Jumlah Anggaran (Rp)</label>
        <input name="amount" type="number" min="1" class="text-input" required value="${existing ? existing.amount : ''}">
        <div class="modal-actions">
          ${existing ? `<button type="button" id="btn-delete-budget" class="btn btn-danger-ghost">Hapus</button>` : ''}
          <button type="button" class="btn btn-ghost" id="btn-cancel-budget">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`);
    document.getElementById('btn-cancel-budget').addEventListener('click', closeModal);
    if (existing) document.getElementById('btn-delete-budget').addEventListener('click', async () => {
      await Store.delete('budgets', existing.id); closeModal(); toast('Anggaran dihapus'); App.reloadAndRender();
    });
    document.getElementById('budget-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = Finance.toNumber(fd.get('amount'));
      if (amount <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return; }
      const obj = { category: fd.get('category'), amount };
      if (existing) { obj.id = existing.id; await Store.put('budgets', obj); } else { await Store.add('budgets', obj); }
      closeModal(); toast('Anggaran disimpan'); App.reloadAndRender();
    });
  }

  /* ================= TAGIHAN ================= */
  function renderTagihan(state) {
    const bills = state.bills.slice().sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Tagihan')}
        <div class="card">
          <div class="card-title-row"><span>DAFTAR TAGIHAN</span></div>
          <div class="bill-list">${bills.length ? bills.map(billRowHtml).join('') : emptyRow('Belum ada tagihan')}</div>
        </div>
        <div style="height:90px"></div>
      </div>
      <button class="fab" id="fab-add-bill">＋ Tambah Tagihan</button>`;
    document.getElementById('fab-add-bill').addEventListener('click', () => openBillForm(state));
    view().querySelectorAll('.bill-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.bill-status-btn')) return;
        const id = Number(row.dataset.id);
        const b = state.bills.find(x => x.id === id);
        if (b) openBillForm(state, b);
      });
    });
    view().querySelectorAll('.bill-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(btn.closest('.bill-row').dataset.id);
        const b = state.bills.find(x => x.id === id);
        if (!b) return;
        b.status = b.status === 'lunas' ? 'belum' : 'lunas';
        await Store.put('bills', b);
        toast(b.status === 'lunas' ? 'Tagihan ditandai lunas' : 'Tagihan ditandai belum bayar');
        App.reloadAndRender();
      });
    });
  }

  function billStatusMeta(b) {
    const days = Statistics.daysUntilDate(b.dueDate);
    if (b.status === 'lunas') return { label: 'Sudah dibayar', cls: 'status-aman' };
    if (days < 0) return { label: 'Terlambat', cls: 'status-bahaya' };
    if (days <= 3) return { label: 'Segera jatuh tempo', cls: 'status-perhatian' };
    return { label: 'Belum dibayar', cls: 'status-neutral' };
  }

  function billRowHtml(b) {
    const sm = billStatusMeta(b);
    return `
      <div class="bill-row" data-id="${b.id}">
        <div class="card-title-row"><span>🧾 ${escapeHtml(b.name)}</span><span>${rp(b.amount)}</span></div>
        <div class="card-foot-row">
          <span>Jatuh tempo: ${fmtDate(b.dueDate)}</span>
          <button class="pill-btn bill-status-btn ${sm.cls}">${sm.label}</button>
        </div>
      </div>`;
  }

  function openBillForm(state, existing = null) {
    openModal(`
      <h3 class="modal-title">${existing ? 'Edit Tagihan' : 'Tambah Tagihan'}</h3>
      <form id="bill-form" class="form">
        <label>Nama Tagihan</label>
        <input name="name" class="text-input" required value="${existing ? escapeHtml(existing.name) : ''}">
        <label>Nominal (Rp)</label>
        <input name="amount" type="number" min="1" class="text-input" required value="${existing ? existing.amount : ''}">
        <label>Tanggal Jatuh Tempo</label>
        <input name="dueDate" type="date" class="text-input" required value="${existing ? existing.dueDate : ''}">
        <label>Status</label>
        <select name="status" class="select-input">
          <option value="belum" ${existing && existing.status === 'belum' ? 'selected' : ''}>Belum dibayar</option>
          <option value="lunas" ${existing && existing.status === 'lunas' ? 'selected' : ''}>Sudah dibayar</option>
        </select>
        <div class="modal-actions">
          ${existing ? `<button type="button" id="btn-delete-bill" class="btn btn-danger-ghost">Hapus</button>` : ''}
          <button type="button" class="btn btn-ghost" id="btn-cancel-bill">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`);
    document.getElementById('btn-cancel-bill').addEventListener('click', closeModal);
    if (existing) document.getElementById('btn-delete-bill').addEventListener('click', async () => {
      await Store.delete('bills', existing.id); closeModal(); toast('Tagihan dihapus'); App.reloadAndRender();
    });
    document.getElementById('bill-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = Finance.toNumber(fd.get('amount'));
      if (amount <= 0) { toast('Nominal harus lebih dari 0', 'error'); return; }
      if (!fd.get('dueDate')) { toast('Tanggal wajib diisi', 'error'); return; }
      const obj = { name: fd.get('name'), amount, dueDate: fd.get('dueDate'), status: fd.get('status') };
      if (existing) { obj.id = existing.id; await Store.put('bills', obj); } else { await Store.add('bills', obj); }
      closeModal(); toast('Tagihan disimpan'); App.reloadAndRender();
    });
  }

  /* ================= TABUNGAN ================= */
  function renderTabungan(state) {
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Target Tabungan')}
        <div class="card">
          <div class="savings-list">${state.savings.length ? state.savings.map(savingRowHtml).join('') : emptyRow('Belum ada target tabungan')}</div>
        </div>
        <div style="height:90px"></div>
      </div>
      <button class="fab" id="fab-add-saving">＋ Tambah Target</button>`;
    document.getElementById('fab-add-saving').addEventListener('click', () => openSavingForm(state));
    view().querySelectorAll('.saving-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.id);
        const s = state.savings.find(x => x.id === id);
        if (s) openSavingForm(state, s);
      });
    });
  }

  function savingRowHtml(s) {
    const pct = s.target > 0 ? Math.min(Math.round((s.current / s.target) * 100), 100) : 0;
    return `
      <div class="saving-row" data-id="${s.id}">
        <div class="card-title-row"><span>🎯 ${escapeHtml(s.name)}</span><span>${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill status-aman" style="width:${pct}%"></div></div>
        <div class="card-foot-row"><span>${rp(s.current)} / ${rp(s.target)}</span></div>
      </div>`;
  }

  function openSavingForm(state, existing = null) {
    openModal(`
      <h3 class="modal-title">${existing ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'}</h3>
      <form id="saving-form" class="form">
        <label>Nama Target</label>
        <input name="name" class="text-input" required value="${existing ? escapeHtml(existing.name) : ''}">
        <label>Target (Rp)</label>
        <input name="target" type="number" min="1" class="text-input" required value="${existing ? existing.target : ''}">
        <label>Terkumpul Saat Ini (Rp)</label>
        <input name="current" type="number" min="0" class="text-input" required value="${existing ? existing.current : 0}">
        <div class="modal-actions">
          ${existing ? `<button type="button" id="btn-delete-saving" class="btn btn-danger-ghost">Hapus</button>` : ''}
          <button type="button" class="btn btn-ghost" id="btn-cancel-saving">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`);
    document.getElementById('btn-cancel-saving').addEventListener('click', closeModal);
    if (existing) document.getElementById('btn-delete-saving').addEventListener('click', async () => {
      await Store.delete('savings', existing.id); closeModal(); toast('Target dihapus'); App.reloadAndRender();
    });
    document.getElementById('saving-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const target = Finance.toNumber(fd.get('target'));
      const current = Finance.toNumber(fd.get('current'));
      if (target <= 0) { toast('Target harus lebih dari 0', 'error'); return; }
      const obj = { name: fd.get('name'), target, current };
      if (existing) { obj.id = existing.id; await Store.put('savings', obj); } else { await Store.add('savings', obj); }
      closeModal(); toast('Target tabungan disimpan'); App.reloadAndRender();
    });
  }

  /* ================= CICILAN ================= */
  function renderCicilan(state) {
    const totalPerBulan = Finance.sumBy(state.installments, () => true);
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Cicilan')}
        <div class="card">
          <div class="card-title-row"><span>TOTAL CICILAN / BULAN</span><span>${rp(totalPerBulan)}</span></div>
        </div>
        <div class="card">
          <div class="installment-list">${state.installments.length ? state.installments.map(installmentRowHtml).join('') : emptyRow('Belum ada cicilan')}</div>
        </div>
        <div style="height:90px"></div>
      </div>
      <button class="fab" id="fab-add-inst">＋ Tambah Cicilan</button>`;
    document.getElementById('fab-add-inst').addEventListener('click', () => openInstallmentForm(state));
    view().querySelectorAll('.inst-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.id);
        const it = state.installments.find(x => x.id === id);
        if (it) openInstallmentForm(state, it);
      });
    });
  }

  function installmentRowHtml(it) {
    return `
      <div class="inst-row" data-id="${it.id}">
        <div class="card-title-row"><span>💳 ${escapeHtml(it.name)}</span><span>${rp(it.amount)}/bulan</span></div>
        <div class="card-foot-row"><span>Sisa ${it.monthsLeft} bulan</span><span>Jatuh tempo: ${fmtDate(it.dueDate)}</span></div>
      </div>`;
  }

  function openInstallmentForm(state, existing = null) {
    openModal(`
      <h3 class="modal-title">${existing ? 'Edit Cicilan' : 'Tambah Cicilan'}</h3>
      <form id="inst-form" class="form">
        <label>Nama Cicilan</label>
        <input name="name" class="text-input" required value="${existing ? escapeHtml(existing.name) : ''}">
        <label>Nominal per Bulan (Rp)</label>
        <input name="amount" type="number" min="1" class="text-input" required value="${existing ? existing.amount : ''}">
        <label>Sisa Bulan</label>
        <input name="monthsLeft" type="number" min="0" class="text-input" required value="${existing ? existing.monthsLeft : ''}">
        <label>Tanggal Jatuh Tempo Berikutnya</label>
        <input name="dueDate" type="date" class="text-input" required value="${existing ? existing.dueDate : ''}">
        <div class="modal-actions">
          ${existing ? `<button type="button" id="btn-delete-inst" class="btn btn-danger-ghost">Hapus</button>` : ''}
          <button type="button" class="btn btn-ghost" id="btn-cancel-inst">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </form>`);
    document.getElementById('btn-cancel-inst').addEventListener('click', closeModal);
    if (existing) document.getElementById('btn-delete-inst').addEventListener('click', async () => {
      await Store.delete('installments', existing.id); closeModal(); toast('Cicilan dihapus'); App.reloadAndRender();
    });
    document.getElementById('inst-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = Finance.toNumber(fd.get('amount'));
      if (amount <= 0) { toast('Nominal harus lebih dari 0', 'error'); return; }
      const obj = { name: fd.get('name'), amount, monthsLeft: Finance.toNumber(fd.get('monthsLeft')), dueDate: fd.get('dueDate') };
      if (existing) { obj.id = existing.id; await Store.put('installments', obj); } else { await Store.add('installments', obj); }
      closeModal(); toast('Cicilan disimpan'); App.reloadAndRender();
    });
  }

  /* ================= KALENDER ================= */
  let calState = { year: new Date().getFullYear(), month: new Date().getMonth() };
  function renderKalender(state) {
    const map = Statistics.kalenderBulan(state.transactions, calState.year, calState.month);
    const first = new Date(calState.year, calState.month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(calState.year, calState.month + 1, 0).getDate();
    const monthName = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    let cells = '';
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calState.year}-${String(calState.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const total = map[dateStr] || 0;
      const isToday = dateStr === Finance.todayStr();
      cells += `<div class="cal-cell ${total > 0 ? 'has-tx' : ''} ${isToday ? 'is-today' : ''}" data-date="${dateStr}">
        <div class="cal-day">${d}</div>
        ${total > 0 ? `<div class="cal-amt">${rp(total)}</div>` : ''}
      </div>`;
    }

    view().innerHTML = `
      <div class="page">
        ${pageHeader('Kalender Keuangan')}
        <div class="card">
          <div class="cal-nav">
            <button class="icon-btn" id="cal-prev">‹</button>
            <strong>${monthName}</strong>
            <button class="icon-btn" id="cal-next">›</button>
          </div>
          <div class="cal-grid cal-grid-head">
            ${['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
          </div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div id="cal-day-detail"></div>
        <div style="height:90px"></div>
      </div>`;

    document.getElementById('cal-prev').addEventListener('click', () => {
      calState.month--; if (calState.month < 0) { calState.month = 11; calState.year--; }
      renderKalender(state);
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      calState.month++; if (calState.month > 11) { calState.month = 0; calState.year++; }
      renderKalender(state);
    });
    view().querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        const txs = state.transactions.filter(t => t.date === date);
        document.getElementById('cal-day-detail').innerHTML = `
          <div class="card">
            <div class="card-title-row"><span>Transaksi ${fmtDate(date)}</span></div>
            <div class="tx-list">${txs.length ? txs.map(txRowHtml).join('') : emptyRow('Tidak ada transaksi')}</div>
          </div>`;
      });
    });
  }

  /* ================= PROYEKSI ================= */
  function renderProyeksi(state) {
    const p = Finance.proyeksiSampaiGajian(state.settings, state.transactions, state.bills);
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Proyeksi Sampai Gajian')}
        <div class="card card-hero status-aman">
          <div class="hero-label">ESTIMASI SALDO SAAT GAJIAN</div>
          <div class="hero-amount">${rp(p.estimasiSaldoGajian)}</div>
          <div class="hero-grid">
            <div><span class="hg-label">Saldo Sekarang</span><span class="hg-value">${rp(p.saldoSekarang)}</span></div>
            <div><span class="hg-label">Hari Tersisa</span><span class="hg-value">${p.hariTersisa} hari</span></div>
            <div><span class="hg-label">Rata-rata/Hari</span><span class="hg-value">${rp(p.rataRataHarian)}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title-row"><span>PROYEKSI SALDO HARIAN</span></div>
          <canvas id="chart-proyeksi" height="180"></canvas>
        </div>
        <div style="height:90px"></div>
      </div>`;

    const labels = []; const values = [];
    let running = p.saldoSekarang;
    for (let i = 0; i <= p.hariTersisa; i++) {
      labels.push(`H+${i}`);
      values.push(Math.round(running));
      running -= p.rataRataHarian;
    }
    renderLineChart('chart-proyeksi', labels, values, null, 'Estimasi Saldo');
  }

  /* ================= SIMULASI ================= */
  function renderSimulasi(state) {
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Kalau Saya Belanja?')}
        <div class="card">
          <p class="muted">Masukkan nominal rencana belanja untuk melihat dampaknya terhadap saldo dan batas harian — belum akan mengubah data apa pun.</p>
          <input id="sim-input" type="number" min="0" class="text-input" placeholder="Contoh: 500000">
          <button id="sim-btn" class="btn btn-primary" style="margin-top:12px;width:100%">Simulasikan</button>
        </div>
        <div id="sim-result"></div>
        <div style="height:90px"></div>
      </div>`;

    document.getElementById('sim-btn').addEventListener('click', () => {
      const nominal = Finance.toNumber(document.getElementById('sim-input').value);
      if (nominal <= 0) { toast('Masukkan nominal terlebih dahulu', 'error'); return; }
      const sim = Finance.simulasiBelanja(state.settings, state.transactions, state.bills, nominal);
      document.getElementById('sim-result').innerHTML = `
        <div class="card">
          <div class="card-title-row"><span>HASIL SIMULASI</span></div>
          ${statRow('Saldo Setelah Transaksi', rp(sim.saldoSesudah))}
          ${statRow('Batas Harian Baru (Besok)', rp(sim.batasSesudah))}
          ${statRow('Perubahan / Hari', `${sim.perubahanPerHari >= 0 ? '+' : ''}${rp(sim.perubahanPerHari)}`)}
          <button id="sim-save-btn" class="btn btn-primary" style="margin-top:12px;width:100%">Simpan Pengeluaran</button>
        </div>`;
      document.getElementById('sim-save-btn').addEventListener('click', async () => {
        await addTransaction({ type: 'out', category: 'Lainnya', amount: nominal, date: Finance.todayStr(), note: 'Dari simulasi' });
        toast('Pengeluaran disimpan');
        location.hash = '#/dashboard';
      });
    });
  }

  /* ================= PENGATURAN ================= */
  function renderPengaturan(state) {
    view().innerHTML = `
      <div class="page">
        ${pageHeader('Pengaturan')}
        <div class="card">
          <div class="card-title-row"><span>PROFIL KEUANGAN</span></div>
          <form id="settings-form" class="form">
            <label>Nama Keluarga</label>
            <input name="namaKeluarga" class="text-input" value="${escapeHtml(state.settings.namaKeluarga)}">
            <label>Saldo Saat Ini (Rp)</label>
            <input name="saldoAwal" type="number" class="text-input" value="${state.settings.saldoAwal}">
            <label>Pemasukan Bulanan (Rp)</label>
            <input name="incomeMonthly" type="number" class="text-input" value="${state.settings.incomeMonthly}">
            <label>Tanggal Gajian (1-28)</label>
            <input name="paydayDay" type="number" min="1" max="28" class="text-input" value="${state.settings.paydayDay}">
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">Simpan Profil</button>
          </form>
        </div>

        <div class="card">
          <div class="card-title-row"><span>TAMPILAN</span></div>
          <div class="row-between">
            <span>Mode Gelap</span>
            <label class="switch"><input type="checkbox" id="dark-toggle" ${state.settings.theme === 'dark' ? 'checked' : ''}><span class="slider"></span></label>
          </div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>LATAR APLIKASI</span></div>
          <div class="bgtheme-grid">
            ${BG_THEMES.map(t => t.img ? `
              <div class="bgtheme-item ${state.settings.bgTheme === t.key ? 'active' : ''}" data-key="${t.key}">
                <img src="${t.img}" alt="${escapeHtml(t.label)}">
                <div class="bgtheme-label">${escapeHtml(t.label)}</div>
              </div>` : `
              <div class="bgtheme-item bgtheme-default ${state.settings.bgTheme === t.key ? 'active' : ''}" data-key="${t.key}">Polos</div>`
            ).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>SINKRONISASI KELUARGA</span></div>
          <div id="sync-section">${renderSyncSection()}</div>
        </div>

        <div class="card">
          <div class="card-title-row"><span>DATA & BACKUP</span></div>
          <div class="muted" style="margin-bottom:10px">Backup terakhir: ${state.settings.lastBackup ? fmtDate(state.settings.lastBackup.slice(0, 10)) : 'Belum pernah'}</div>
          <div class="settings-btn-grid">
            <button class="btn btn-secondary" id="btn-export-json">Export JSON</button>
            <button class="btn btn-secondary" id="btn-import-json">Import JSON</button>
            <button class="btn btn-secondary" id="btn-export-csv">Export CSV</button>
            <button class="btn btn-secondary" id="btn-reset-demo">Reset Data Demo</button>
          </div>
          <input type="file" id="file-import" accept="application/json" style="display:none">
        </div>

        <div class="card">
          <div class="card-title-row"><span>ZONA BAHAYA</span></div>
          <button class="btn btn-danger" id="btn-clear-all" style="width:100%">Hapus Semua Data</button>
        </div>
        <div class="card muted" style="text-align:center">FLARENO FAMILY v1.0 · Atur Hari Ini, Tenang untuk Esok.</div>
        <div style="height:90px"></div>
      </div>`;

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await saveSettings({
        namaKeluarga: fd.get('namaKeluarga') || 'Keluarga Saya',
        saldoAwal: Finance.toNumber(fd.get('saldoAwal')),
        incomeMonthly: Finance.toNumber(fd.get('incomeMonthly')),
        paydayDay: Math.min(Math.max(Finance.toNumber(fd.get('paydayDay')) || 1, 1), 28)
      });
      toast('Profil disimpan'); App.reloadAndRender();
    });

    document.getElementById('dark-toggle').addEventListener('change', async (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      await saveSettings({ theme });
      setThemePref(theme);
      App.applyTheme(theme);
      App.reloadAndRender();
    });

    view().querySelectorAll('.bgtheme-item').forEach(item => {
      item.addEventListener('click', async () => {
        await saveSettings({ bgTheme: item.dataset.key });
        App.reloadAndRender();
      });
    });

    document.getElementById('btn-export-json').addEventListener('click', async () => {
      const data = await exportAllData();
      downloadFile(`flareno-backup-${Finance.todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json');
      await saveSettings({ lastBackup: new Date().toISOString() });
      toast('Data berhasil diexport');
    });
    document.getElementById('btn-export-csv').addEventListener('click', async () => {
      const csv = transactionsToCSV(state.transactions);
      downloadFile(`flareno-transaksi-${Finance.todayStr()}.csv`, csv, 'text/csv');
      toast('CSV berhasil diexport');
    });
    document.getElementById('btn-import-json').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          await importAllData(data);
          toast('Data berhasil di-restore');
          App.reloadAndRender();
        } catch (err) {
          toast('Gagal import: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });
    document.getElementById('btn-reset-demo').addEventListener('click', () => {
      confirmDialog('Reset ke data demo? Data saat ini akan diganti.', async () => {
        await App.seedDemoData(true);
        toast('Data demo dimuat ulang'); App.reloadAndRender();
      });
    });
    document.getElementById('btn-clear-all').addEventListener('click', () => {
      confirmDialog('Yakin hapus SEMUA data keuangan? Tindakan ini tidak dapat dibatalkan.', async () => {
        await clearAllData();
        toast('Semua data dihapus');
        location.hash = '#/onboarding';
        App.reloadAndRender();
      });
    });

    bindSyncSectionEvents();
  }

  function renderSyncSection() {
    const cfg = Sync.getSyncConfig();
    if (cfg && cfg.familyCode) {
      return `
        <div class="row-between"><span>🟢 Sinkron aktif</span></div>
        <div class="muted" style="margin:6px 0 14px">Username: <strong>${escapeHtml(cfg.familyCode)}</strong></div>
        <button class="btn btn-secondary" id="btn-resync" style="width:100%;margin-bottom:8px">Sinkron Ulang Sekarang</button>
        <button class="btn btn-danger-ghost" id="btn-disconnect-sync" style="width:100%">Putuskan Sinkronisasi</button>`;
    }
    return `
      <p class="muted">Hubungkan HP suami, istri, dan anak ke data yang sama secara real-time. Isi Username yang sama di semua HP.</p>
      <form id="sync-form" class="form">
        <label>Username (bebas, sama untuk semua HP)</label>
        <input name="familyCode" class="text-input" placeholder="keluarga-budi" required>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:10px">Hubungkan Sekarang</button>
      </form>
      <p class="muted" style="margin-top:10px;font-size:11.5px">Cara setup lengkap: lihat README.md bagian "Sinkronisasi Multi-HP".</p>`;
  }

  function bindSyncSectionEvents() {
    const form = document.getElementById('sync-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const code = fd.get('familyCode');
        if (!code || !code.trim()) { toast('Username wajib diisi', 'error'); return; }
        toast('Menghubungkan...');
        try {
          const result = await App.connectFamilySync(code);
          if (result.hasCloudData) {
            confirmSyncDataChoice(result.data);
          } else {
            toast('🎉 Tersambung! Data Anda dijadikan data awal keluarga.');
            App.reloadAndRender();
          }
        } catch (err) {
          toast('Gagal terhubung: ' + err.message, 'error');
        }
      });
    }
    const resyncBtn = document.getElementById('btn-resync');
    if (resyncBtn) resyncBtn.addEventListener('click', async () => {
      await App.usePushLocalData();
      toast('Data lokal dikirim ke cloud');
    });
    const disconnectBtn = document.getElementById('btn-disconnect-sync');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
      confirmDialog('Putuskan sinkronisasi? Aplikasi akan kembali memakai data lokal saja di HP ini.', async () => {
        App.disconnectFamilySync();
        toast('Sinkronisasi diputus');
        App.reloadAndRender();
      });
    });
  }

  function confirmSyncDataChoice(cloudData) {
    openModal(`
      <h3 class="modal-title">Data Keluarga Ditemukan</h3>
      <p class="muted">Sudah ada data keluarga tersimpan di cloud (kemungkinan dari HP anggota lain). Pilih data mana yang dipakai:</p>
      <div class="modal-actions" style="flex-direction:column;align-items:stretch;gap:8px">
        <button class="btn btn-primary" id="btn-use-cloud" style="width:100%">Pakai Data Cloud (punya keluarga)</button>
        <button class="btn btn-secondary" id="btn-use-local" style="width:100%">Pakai Data Saya (timpa cloud)</button>
      </div>`);
    document.getElementById('btn-use-cloud').addEventListener('click', async () => {
      await App.useCloudData(cloudData);
      closeModal(); toast('Data keluarga dimuat'); App.reloadAndRender();
    });
    document.getElementById('btn-use-local').addEventListener('click', async () => {
      await App.usePushLocalData();
      closeModal(); toast('Data Anda dijadikan data keluarga'); App.reloadAndRender();
    });
  }

  function confirmDialog(msg, onConfirm) {
    openModal(`
      <h3 class="modal-title">Konfirmasi</h3>
      <p class="muted">${escapeHtml(msg)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cd-cancel">Batal</button>
        <button class="btn btn-danger" id="cd-ok">Ya, Lanjutkan</button>
      </div>`);
    document.getElementById('cd-cancel').addEventListener('click', closeModal);
    document.getElementById('cd-ok').addEventListener('click', async () => { closeModal(); await onConfirm(); });
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ================= ONBOARDING ================= */
  let onbStep = 0; // 0 = single intro slide, 1 = form data
  const ONB_TOTAL_SLIDES = 1; // only one splash/bumper slide now

  function renderOnboarding() {
    if (onbStep < ONB_TOTAL_SLIDES) renderOnboardingIntro();
    else renderOnboardingForm();
  }

  function renderOnboardingIntro() {
    view().innerHTML = `
      <div class="page page-onboarding-intro">
        <img src="./assets/branding/onboarding-1.png" class="onb-slide-img" alt="FLARENO FINANCE">
        <button id="onb-next" class="btn btn-primary" style="width:100%">Mulai</button>
      </div>`;

    document.getElementById('onb-next').addEventListener('click', () => {
      onbStep = ONB_TOTAL_SLIDES;
      renderOnboarding();
    });
  }

  function renderOnboardingForm() {
    view().innerHTML = `
      <div class="page page-onboarding">
        <img src="./assets/branding/logo-horizontal.png" alt="FLARENO FAMILY" style="width:200px;display:block;margin:6px auto 4px">
        <div class="card">
          <p class="muted">Selamat datang! Isi data singkat berikut agar dashboard keuangan keluarga Anda langsung siap digunakan.</p>
          <form id="onboard-form" class="form">
            <label>Nama Keluarga</label>
            <input name="namaKeluarga" class="text-input" placeholder="Keluarga Budi" required>
            <label>Saldo Saat Ini (Rp)</label>
            <input name="saldoAwal" type="number" min="0" class="text-input" placeholder="4000000" required>
            <label>Pemasukan Bulanan (Rp)</label>
            <input name="incomeMonthly" type="number" min="0" class="text-input" placeholder="9500000" required>
            <label>Tanggal Gajian Setiap Bulan (1-28)</label>
            <input name="paydayDay" type="number" min="1" max="28" class="text-input" placeholder="25" required>
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:10px">Buat Keuangan Saya</button>
          </form>
          <button id="btn-use-demo" class="btn btn-ghost" style="width:100%;margin-top:8px">Coba dengan Data Demo</button>
          <button id="btn-back-intro" class="btn btn-ghost" style="width:100%">← Lihat Perkenalan Lagi</button>
        </div>
      </div>`;

    document.getElementById('btn-back-intro').addEventListener('click', () => { onbStep = 0; renderOnboarding(); });

    document.getElementById('onboard-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await saveSettings({
        onboarded: true,
        namaKeluarga: fd.get('namaKeluarga') || 'Keluarga Saya',
        saldoAwal: Finance.toNumber(fd.get('saldoAwal')),
        incomeMonthly: Finance.toNumber(fd.get('incomeMonthly')),
        paydayDay: Math.min(Math.max(Finance.toNumber(fd.get('paydayDay')) || 1, 1), 28)
      });
      location.hash = '#/dashboard';
      App.reloadAndRender();
    });
    document.getElementById('btn-use-demo').addEventListener('click', async () => {
      await App.seedDemoData(true);
      await saveSettings({ onboarded: true });
      location.hash = '#/dashboard';
      App.reloadAndRender();
    });
  }

  function pageHeader(title) {
    return `<div class="page-header"><a href="#/dashboard" class="back-btn">←</a><h2>${escapeHtml(title)}</h2></div>`;
  }

  /* ================= CHARTS ================= */
  const chartInstances = {};
  function renderLineChart(canvasId, labels, actual, limit, actualLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const datasets = [{
      label: actualLabel || 'Pengeluaran Aktual',
      data: actual,
      borderColor: '#1B5FBF',
      backgroundColor: 'rgba(27,95,191,0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3
    }];
    if (limit) {
      datasets.push({
        label: 'Batas Aman',
        data: limit,
        borderColor: '#2FAE60',
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0
      });
    }
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { display: !!limit, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: { ticks: { callback: v => 'Rp' + (v / 1000).toLocaleString('id-ID') + 'rb' } }
        }
      }
    });
  }

  function renderDonutChart(canvasId, items) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    if (!items.length) { canvas.style.display = 'none'; return; }
    canvas.style.display = 'block';
    const colors = ['#1B5FBF', '#2FAE60', '#F5B21B', '#E4572E', '#8E5CD9', '#00A8A3', '#7A7A7A'];
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: items.map(i => `${i.icon} ${i.category}`),
        datasets: [{ data: items.map(i => i.amount), backgroundColor: colors }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  return {
    rp, escapeHtml, fmtDate, openModal, closeModal, toast, statusMeta,
    renderDashboard, renderTransaksi, renderStatistik, renderAnggaran,
    renderTagihan, renderTabungan, renderCicilan, renderKalender,
    renderProyeksi, renderSimulasi, renderPengaturan, renderOnboarding,
    openTransactionForm, addTransaction
  };
})();
