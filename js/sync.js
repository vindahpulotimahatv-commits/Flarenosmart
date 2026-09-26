/* FLARENO FAMILY — sync.js
   Sinkronisasi real-time lintas perangkat (Suami/Istri/Anak) memakai Firebase Firestore.
   Bersifat OPSIONAL: jika tidak diaktifkan, aplikasi tetap 100% berjalan lokal (IndexedDB) seperti biasa.
   Tidak ada server yang perlu di-host sendiri — Firestore adalah database cloud gratis dari Google
   yang dipanggil langsung dari browser (tetap "static site", cocok untuk GitHub Pages).
*/

const Sync = (() => {
  let app = null;
  let db = null;
  let unsubscribe = null;
  let familyCode = null;

  function getSyncConfig() {
    try { return JSON.parse(localStorage.getItem('flareno_sync_config') || 'null'); }
    catch (e) { return null; }
  }
  function saveSyncConfig(cfg) {
    localStorage.setItem('flareno_sync_config', JSON.stringify(cfg));
  }
  function clearSyncConfig() {
    localStorage.removeItem('flareno_sync_config');
  }
  function isEnabled() {
    const cfg = getSyncConfig();
    return !!(cfg && cfg.firebaseConfig && cfg.familyCode);
  }

  function getDeviceId() {
    let id = localStorage.getItem('flareno_device_id');
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('flareno_device_id', id); }
    return id;
  }

  function ensureApp(firebaseConfig) {
    if (!app) {
      app = firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
    }
  }

  /**
   * Menghubungkan ke "ruang keluarga" (Firestore doc: families/{familyCode}).
   * Me-resolve promise dengan data awal yang sudah ada di cloud (atau null bila belum ada),
   * lalu TERUS mendengarkan perubahan berikutnya lewat onRemoteUpdate (real-time).
   */
  function connect(firebaseConfig, code, onRemoteUpdate) {
    familyCode = String(code || '').trim();
    ensureApp(firebaseConfig);
    saveSyncConfig({ firebaseConfig, familyCode });
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    return new Promise((resolve, reject) => {
      let first = true;
      unsubscribe = db.collection('families').doc(familyCode).onSnapshot(
        (snap) => {
          if (snap.metadata.hasPendingWrites) return; // abaikan echo dari tulisan sendiri
          const data = snap.exists ? snap.data() : null;
          if (first) { first = false; resolve(data); }
          else if (data) { onRemoteUpdate(data); }
        },
        (err) => { if (first) { first = false; reject(err); } }
      );
    });
  }

  let pushTimer = null;
  function pushData(payload) {
    if (!db || !familyCode) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      db.collection('families').doc(familyCode).set(Object.assign({}, payload, {
        _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        _device: getDeviceId()
      })).catch((err) => console.error('Sync push error:', err));
    }, 500); // debounce supaya tidak spam Firestore saat input cepat
  }

  function disconnect() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    clearSyncConfig();
    familyCode = null;
  }

  return { getSyncConfig, saveSyncConfig, isEnabled, connect, pushData, disconnect, getDeviceId };
})();
