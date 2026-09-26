/* FLARENO FAMILY — storage.js
   Lapisan penyimpanan data menggunakan IndexedDB (utama) + localStorage (preferensi ringan).
   Tidak ada backend/server — semua data tersimpan di browser pengguna.
*/

const DB_NAME = 'flareno_family_db';
const DB_VERSION = 1;
const STORES = ['transactions', 'bills', 'budgets', 'savings', 'installments', 'settings'];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('bills')) {
        db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('budgets')) {
        db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('savings')) {
        db.createObjectStore('savings', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('installments')) {
        db.createObjectStore('installments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

const Store = {
  add(storeName, obj) {
    return tx(storeName, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.add(obj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },
  put(storeName, obj) {
    return tx(storeName, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.put(obj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },
  get(storeName, key) {
    return tx(storeName, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },
  getAll(storeName) {
    return tx(storeName, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  },
  delete(storeName, key) {
    return tx(storeName, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  },
  clear(storeName) {
    return tx(storeName, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }
};

/* ---------- Settings (dokumen tunggal di store 'settings', key='profile') ---------- */
const DEFAULT_SETTINGS = {
  key: 'profile',
  onboarded: false,
  namaKeluarga: 'Keluarga Saya',
  saldoAwal: 0,
  incomeMonthly: 0,
  paydayDay: 25,
  theme: 'light',
  bgTheme: 'default',
  lastBackup: null,
  demoMode: false
};

async function getSettings() {
  const s = await Store.get('settings', 'profile');
  return s ? Object.assign({}, DEFAULT_SETTINGS, s) : Object.assign({}, DEFAULT_SETTINGS);
}

async function saveSettings(partial) {
  const current = await getSettings();
  const merged = Object.assign({}, current, partial, { key: 'profile' });
  await Store.put('settings', merged);
  return merged;
}

/* ---------- Local preferences (tema) ---------- */
function getThemePref() {
  return localStorage.getItem('flareno_theme') || 'light';
}
function setThemePref(theme) {
  localStorage.setItem('flareno_theme', theme);
}

/* ---------- Export / Import ---------- */
async function exportAllData() {
  const data = {};
  for (const s of STORES) {
    data[s] = await Store.getAll(s);
  }
  data._exportedAt = new Date().toISOString();
  data._app = 'FLARENO FAMILY';
  data._version = 1;
  return data;
}

async function importAllData(data) {
  if (!data || data._app !== 'FLARENO FAMILY') {
    throw new Error('File backup tidak valid.');
  }
  for (const s of STORES) {
    await Store.clear(s);
    if (Array.isArray(data[s])) {
      for (const item of data[s]) {
        await Store.put(s, item);
      }
    }
  }
  await saveSettings({ lastBackup: new Date().toISOString() });
}

function transactionsToCSV(transactions) {
  const header = ['id', 'type', 'category', 'amount', 'date', 'note'];
  const rows = transactions.map(t => header.map(h => {
    let v = t[h] == null ? '' : String(t[h]).replace(/"/g, '""');
    if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v}"`;
    return v;
  }).join(','));
  return [header.join(','), ...rows].join('\n');
}

async function clearAllData() {
  for (const s of STORES) await Store.clear(s);
}
