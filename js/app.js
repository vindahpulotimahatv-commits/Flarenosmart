/* FLARENO FAMILY — app.js
   Bootstrap aplikasi: routing hash, load data, bind navigasi, PWA install, service worker.
*/

const BG_THEMES = [
  { key: 'default', label: 'Default', img: null },
  { key: 'sunrise', label: 'Pagi Desa', img: './assets/branding/bg-alt-sunrise.jpg' },
  { key: 'sunset-city', label: 'Kota Senja', img: './assets/branding/bg-alt-sunset-city.jpg' },
  { key: 'wave', label: 'Gelombang', img: './assets/branding/bg-alt-wave.jpg' },
  { key: 'leaves', label: 'Daun Lembut', img: './assets/branding/bg-alt-leaves.jpg' },
  { key: 'night', label: 'Malam', img: './assets/branding/bg-alt-night.jpg' }
];

const App = (() => {
  const state = {
    settings: null,
    transactions: [],
    bills: [],
    budgets: [],
    savings: [],
    installments: []
  };

  const routes = {
    '/dashboard': UI.renderDashboard,
    '/transaksi': UI.renderTransaksi,
    '/statistik': UI.renderStatistik,
    '/anggaran': UI.renderAnggaran,
    '/tagihan': UI.renderTagihan,
    '/tabungan': UI.renderTabungan,
    '/cicilan': UI.renderCicilan,
    '/kalender': UI.renderKalender,
    '/proyeksi': UI.renderProyeksi,
    '/simulasi': UI.renderSimulasi,
    '/pengaturan': UI.renderPengaturan
  };

  async function reloadData() {
    state.settings = await getSettings();
    state.transactions = await Store.getAll('transactions');
    state.bills = await Store.getAll('bills');
    state.budgets = await Store.getAll('budgets');
    state.savings = await Store.getAll('savings');
    state.installments = await Store.getAll('installments');
  }

  function currentPath() {
    const hash = location.hash || '#/dashboard';
    return hash.replace('#', '') || '/dashboard';
  }

  function updateBottomNav(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  function setBottomNavVisible(visible) {
    document.getElementById('bottom-nav').style.display = visible ? '' : 'none';
  }

  function render() {
    const path = currentPath();
    applyBackground(state.settings.bgTheme);
    if (!state.settings.onboarded && path !== '/onboarding') {
      UI.renderOnboarding();
      updateBottomNav('');
      setBottomNavVisible(false);
      return;
    }
    if (path === '/onboarding') {
      UI.renderOnboarding();
      updateBottomNav('');
      setBottomNavVisible(false);
      window.scrollTo(0, 0);
      return;
    }
    const fn = routes[path];
    updateBottomNav(path);
    setBottomNavVisible(true);
    if (fn) {
      fn(state);
    } else {
      UI.renderDashboard(state);
    }
    window.scrollTo(0, 0);
  }

  async function reloadAndRender() {
    await reloadData();
    render();
    if (Sync.isEnabled()) {
      exportAllData().then(payload => Sync.pushData(payload));
    }
  }

  async function handleRemoteData(data) {
    await importAllData(data);
    await reloadData();
    render();
    UI.toast('🔄 Data diperbarui dari anggota keluarga lain');
  }

  async function initSyncIfEnabled() {
    if (!Sync.isEnabled()) return;
    const cfg = Sync.getSyncConfig();
    try {
      const initial = await Sync.connect(cfg.familyCode, handleRemoteData);
      if (initial) {
        await importAllData(initial);
        await reloadData();
      }
    } catch (err) {
      console.error('Gagal konek sync:', err);
      UI.toast('Gagal terhubung ke sinkronisasi keluarga. Cek koneksi/konfigurasi.', 'error');
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function applyBackground(key) {
    const theme = BG_THEMES.find(t => t.key === key) || BG_THEMES[0];
    const bg = document.getElementById('app-bg');
    if (!bg) return;
    if (theme.img) {
      bg.style.backgroundImage = `url('${theme.img}')`;
      bg.classList.add('has-image');
    } else {
      bg.style.backgroundImage = '';
      bg.classList.remove('has-image');
    }
  }

  async function seedDemoData(reset = false) {
    if (reset) await clearAllData();
    const today = new Date();
    const cats = ['Makanan', 'Rumah', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan'];
    const amounts = [35000, 50000, 125000, 20000, 75000, 40000, 60000, 15000, 90000, 30000];

    await saveSettings({
      onboarded: true,
      namaKeluarga: 'Keluarga Demo',
      saldoAwal: 2750000,
      incomeMonthly: 9500000,
      paydayDay: (today.getDate() + 12) > 28 ? 5 : today.getDate() + 12,
      demoMode: true
    });

    // Pemasukan bulan ini
    const monthStr = today.toISOString().slice(0, 7);
    await Store.add('transactions', { type: 'in', category: 'Gaji', amount: 9500000, date: `${monthStr}-01`, note: 'Gaji bulanan' });

    // 14 hari transaksi pengeluaran realistis
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const numTx = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numTx; j++) {
        const cat = cats[Math.floor(Math.random() * cats.length)];
        const amt = amounts[Math.floor(Math.random() * amounts.length)];
        await Store.add('transactions', { type: 'out', category: cat, amount: amt, date: dateStr, note: '' });
      }
    }
    await Store.add('transactions', { type: 'saving', category: 'Tabungan', amount: 1000000, date: `${monthStr}-05`, note: 'Nabung rutin' });

    await Store.add('bills', { name: 'Listrik', amount: 350000, dueDate: addDays(today, 10), status: 'belum' });
    await Store.add('bills', { name: 'Internet', amount: 300000, dueDate: addDays(today, 3), status: 'belum' });
    await Store.add('bills', { name: 'Cicilan Motor', amount: 750000, dueDate: addDays(today, 20), status: 'belum' });

    await Store.add('budgets', { category: 'Makanan', amount: 1500000 });
    await Store.add('budgets', { category: 'Transportasi', amount: 800000 });

    await Store.add('savings', { name: 'Dana Darurat', target: 10000000, current: 6500000 });
    await Store.add('savings', { name: 'Pendidikan', target: 15000000, current: 8000000 });
    await Store.add('savings', { name: 'Liburan', target: 5000000, current: 2500000 });

    await Store.add('installments', { name: 'Motor', amount: 750000, monthsLeft: 12, dueDate: addDays(today, 20) });
  }

  function addDays(base, n) {
    const d = new Date(base); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  async function connectFamilySync(code) {
    const initial = await Sync.connect(code, handleRemoteData);
    if (initial) {
      return { hasCloudData: true, data: initial };
    }
    const payload = await exportAllData();
    Sync.pushData(payload);
    return { hasCloudData: false };
  }

  async function useCloudData(data) {
    await importAllData(data);
    await reloadData();
    render();
  }

  async function usePushLocalData() {
    const payload = await exportAllData();
    Sync.pushData(payload);
  }

  function disconnectFamilySync() {
    Sync.disconnect();
  }

  function bindNav() {
    document.getElementById('bottom-nav').addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item');
      if (!item) return;
      if (item.dataset.path === '/lainnya') {
        e.preventDefault();
        openMoreMenu();
      }
    });
    window.addEventListener('hashchange', render);
  }

  function openMoreMenu() {
    UI.openModal(`
      <h3 class="modal-title">Lainnya</h3>
      <div class="more-menu">
        <a href="#/tagihan" class="more-item">🧾 Tagihan</a>
        <a href="#/tabungan" class="more-item">🎯 Target Tabungan</a>
        <a href="#/cicilan" class="more-item">💳 Cicilan</a>
        <a href="#/kalender" class="more-item">📅 Kalender</a>
        <a href="#/proyeksi" class="more-item">📈 Proyeksi Gajian</a>
        <a href="#/simulasi" class="more-item">🧮 Kalau Saya Belanja?</a>
        <a href="#/pengaturan" class="more-item">⚙️ Pengaturan</a>
      </div>`);
    document.querySelectorAll('.more-item').forEach(a => a.addEventListener('click', UI.closeModal));
  }

  function bindHeaderThemeToggle() {
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'btn-theme') {
        const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
        await saveSettings({ theme: newTheme });
        setThemePref(newTheme);
        applyTheme(newTheme);
        await reloadAndRender();
      }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  function setupInstallPrompt() {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('install-btn');
      if (btn) btn.style.display = 'inline-flex';
    });
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'install-btn' && deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    });
  }

  async function init() {
    applyTheme(getThemePref());
    await reloadData();
    if (state.settings.theme !== getThemePref()) {
      // sinkronkan localStorage <-> IndexedDB pada kunjungan pertama
      await saveSettings({ theme: getThemePref() });
    }
    bindNav();
    bindHeaderThemeToggle();
    registerServiceWorker();
    setupInstallPrompt();
    await initSyncIfEnabled();
    render();
    hideSplash();
  }

  function hideSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 450);
    }, 650);
  }

  return { state, reloadAndRender, applyTheme, applyBackground, BG_THEMES, seedDemoData, init, connectFamilySync, useCloudData, usePushLocalData, disconnectFamilySync };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
