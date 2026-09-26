# 🌿 FLARENO FAMILY

**Atur Hari Ini, Tenang untuk Esok.**

FLARENO FAMILY adalah aplikasi web pengatur keuangan keluarga yang bisa langsung dipakai sehari-hari. Aplikasi ini **100% static** (HTML, CSS, JavaScript murni) — tidak butuh server, database, atau backend apa pun — sehingga bisa langsung dijalankan lewat **GitHub Pages** dan diinstal sebagai **PWA** di HP.

Semua data (transaksi, tagihan, anggaran, tabungan, cicilan) disimpan di perangkat pengguna sendiri menggunakan **IndexedDB**, jadi tetap ada walau browser ditutup atau halaman di-refresh.

---

## ✨ Fitur Utama

- **Uang Aman Hari Ini** — batas pengeluaran harian yang dihitung otomatis dari saldo, tagihan wajib yang belum dibayar, dan sisa hari sampai gajian. Angka ini berubah real-time setiap kali ada transaksi baru.
- **Status keuangan otomatis**: 🟢 Aman, 🟡 Perlu Diperhatikan, 🔴 Pengeluaran Terlalu Tinggi.
- **Transaksi**: tambah/edit/hapus/cari/filter untuk Pemasukan, Pengeluaran, Transfer, Tabungan, dan Cicilan, lengkap dengan "Transaksi Cepat / Gunakan Lagi".
- **Statistik**: grafik pengeluaran 7 hari (Chart.js), donut chart kategori, ringkasan bulanan, dan detail statistik (rata-rata harian, kategori terbesar, hari paling boros, perbandingan bulan lalu).
- **Anggaran per kategori** dengan progress bar otomatis dari transaksi nyata.
- **Tagihan** dengan status Sudah/Belum/Terlambat — tagihan yang belum dibayar otomatis mengurangi Saldo Aman.
- **Target Tabungan** dan **Cicilan** dengan progress tracking.
- **Kalender Keuangan** — klik tanggal untuk melihat transaksi hari itu.
- **Proyeksi Sampai Gajian** berdasarkan rata-rata pengeluaran harian.
- **"Kalau Saya Belanja?"** — simulasi dampak sebuah rencana pengeluaran sebelum benar-benar disimpan.
- **FLARENO Insight** — catatan otomatis berdasarkan data transaksi sungguhan.
- **Sinkronisasi Keluarga (real-time, opsional)** — hubungkan HP suami, istri, dan anak ke satu data yang sama, otomatis update di semua perangkat (pakai Firebase gratis).
- **Splash Screen** & **Onboarding Carousel** bergambar menggunakan aset brand resmi FLARENO FAMILY.
- **Latar Aplikasi** bisa dipilih di Pengaturan (Default, Pagi Desa, Kota Senja, Gelombang, Daun Lembut, Malam) menggunakan ilustrasi brand.
- **Backup & Restore**: Export JSON, Import JSON, Export CSV.
- **Dark Mode** dan tampilan **mobile-first** dengan bottom navigation ala aplikasi native.
- **Progressive Web App (PWA)** — bisa di-*Add to Home Screen* di Android/iPhone.

---

## 📁 Struktur Folder

```
flareno-family/
│
├── index.html            → kerangka aplikasi (SPA, hash-routing)
├── manifest.json         → konfigurasi PWA
├── sw.js                 → service worker (cache offline)
│
├── css/
│   └── style.css         → seluruh styling (light & dark mode)
│
├── js/
│   ├── storage.js        → lapisan IndexedDB + localStorage
│   ├── finance.js        → rumus inti (Uang Aman Hari Ini, proyeksi, simulasi)
│   ├── statistics.js     → agregasi statistik & data grafik
│   ├── ui.js             → rendering semua halaman & komponen
│   └── app.js            → bootstrap, router, data demo, PWA
│
└── assets/
    ├── logo.svg
    ├── logo.png
    ├── icons/            → ikon PWA (192, 512, maskable, apple-touch) dari aset "Logo Icon/App Icon"
    └── branding/         → logo horizontal/putih/hitam, splash-bg, onboarding 1-4, 5 pilihan background
```

---

## 🚀 Cara Menjalankan Secara Lokal

Karena browser membatasi `fetch`/module dari `file://`, jalankan lewat server lokal sederhana:

```bash
# Python 3
cd flareno-family
python3 -m http.server 8080
# buka http://localhost:8080
```

atau dengan Node.js:

```bash
npx serve flareno-family
```

---

## ☁️ Cara Upload ke GitHub & Mengaktifkan GitHub Pages

1. Buat repository baru di GitHub, misalnya `flareno-family`.
2. Upload seluruh isi folder `flareno-family/` ke root repository tersebut (bukan di dalam subfolder tambahan).
   ```bash
   git init
   git add .
   git commit -m "Initial commit - FLARENO FAMILY"
   git branch -M main
   git remote add origin https://github.com/USERNAME/flareno-family.git
   git push -u origin main
   ```
3. Di GitHub, buka repository → **Settings** → **Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, aplikasi akan aktif di:
   ```
   https://USERNAME.github.io/flareno-family/
   ```

> Semua path pada aplikasi ini menggunakan **relative path** (`./css/...`, `./js/...`), sehingga aman dijalankan di subfolder repository seperti pola URL GitHub Pages di atas.

---

## 📲 Cara Install sebagai PWA (Add to Home Screen)

**Android (Chrome):**
1. Buka URL GitHub Pages aplikasi.
2. Ketuk menu (⋮) → **Add to Home screen** / **Install app**.

**iPhone (Safari):**
1. Buka URL GitHub Pages aplikasi.
2. Ketuk ikon **Share** (kotak dengan panah ke atas).
3. Pilih **Add to Home Screen**.

Setelah diinstal, FLARENO FAMILY akan muncul sebagai ikon aplikasi tersendiri dan terbuka tanpa address bar browser.

---

## 💾 Cara Backup dan Restore Data

Buka **Pengaturan** di dalam aplikasi:

- **Export JSON** — mengunduh seluruh data (transaksi, tagihan, anggaran, tabungan, cicilan, profil) sebagai satu file `.json`. Simpan file ini di tempat aman.
- **Import JSON** — memilih file backup `.json` untuk memulihkan data (menimpa data yang ada saat ini).
- **Export CSV** — mengunduh daftar transaksi dalam format `.csv` untuk dibuka di Excel/Google Sheets.
- **Reset Data Demo** — mengisi ulang aplikasi dengan data contoh yang realistis untuk keperluan coba-coba.

Karena data tersimpan di IndexedDB browser, **data tidak otomatis tersinkron antar perangkat** — gunakan Export/Import JSON untuk memindahkan data ke perangkat lain.

---

## 🧮 Cara Kerja Perhitungan "Uang Aman Hari Ini"

```
Saldo Aman   = Saldo Saat Ini − Total Tagihan yang Belum Dibayar
Batas Hari Ini = Saldo Aman ÷ Jumlah Hari Tersisa sampai Gajian
```

Setiap kali ada transaksi pengeluaran baru, Saldo dan Batas Hari Ini otomatis dihitung ulang — termasuk **Batas Besok**, yang mempertimbangkan sisa saldo aman dan berkurangnya satu hari menuju gajian.

---

## 👨‍👩‍👧 Sinkronisasi Multi-HP (Suami, Istri, Anak)

Secara default, data FLARENO FAMILY tersimpan **lokal** di tiap HP (IndexedDB) dan tidak otomatis terhubung ke HP lain. Untuk membuat **satu data keuangan yang dipakai bersama** oleh seluruh anggota keluarga secara **real-time**, aktifkan Sinkronisasi Keluarga (gratis, pakai [Firebase](https://firebase.google.com) — database cloud dari Google, tetap tanpa perlu menghosting server sendiri).

### Langkah 1 — Buat Project Firebase (gratis, sekali saja)

1. Buka [console.firebase.google.com](https://console.firebase.google.com), login pakai akun Google.
2. Klik **Add project** → beri nama bebas, misalnya `flareno-family` → lanjutkan (Google Analytics boleh dimatikan).
3. Setelah project dibuat, klik ikon **Web (`</>`)** untuk mendaftarkan aplikasi web → beri nama apa saja → **Register app**.
4. Firebase akan menampilkan kode `firebaseConfig` seperti ini — **salin seluruh objek ini**:
   ```js
   {
     apiKey: "AIza...",
     authDomain: "flareno-family.firebaseapp.com",
     projectId: "flareno-family",
     storageBucket: "flareno-family.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

### Langkah 2 — Aktifkan Firestore Database

1. Di menu kiri Firebase Console, buka **Build → Firestore Database** → **Create database**.
2. Pilih **Start in test mode** dulu (akan diperketat di langkah berikutnya) → pilih lokasi server (misalnya `asia-southeast2`) → **Enable**.
3. Buka tab **Rules**, ganti isinya menjadi:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /families/{familyCode} {
         allow read, write: if true;
       }
     }
   }
   ```
   → **Publish**.

   ⚠️ **Catatan keamanan**: aturan ini membuat siapa pun yang tahu **Kode Keluarga** Anda bisa membaca/mengubah data tersebut (tanpa login). Ini cukup aman untuk pemakaian pribadi selama Kode Keluarga **unik dan tidak disebar ke publik** (contoh: `keluarga-rahayu-x7q2`, bukan `keluarga1`). Jangan pernah membagikan Kode Keluarga di tempat umum.

### Langkah 3 — Hubungkan di Aplikasi (dilakukan di SEMUA HP)

1. Buka FLARENO FAMILY → **Pengaturan** → **Sinkronisasi Keluarga**.
2. Tempelkan objek `firebaseConfig` dari Langkah 1 ke kolom **Konfigurasi Firebase**.
3. Isi **Kode Keluarga** — bebas, asal **sama persis** di semua HP (misalnya `keluarga-rahayu-x7q2`).
4. Tekan **Hubungkan Sekarang**.
   - HP **pertama** yang connect akan menjadikan data lokalnya sebagai data awal keluarga.
   - HP **berikutnya** (istri/anak) akan diberi pilihan: **pakai data cloud** (data keluarga yang sudah ada) atau **pakai data sendiri** (menimpa cloud) — biasanya pilih **Pakai Data Cloud**.
5. Selesai! Sejak saat itu, setiap transaksi/tagihan/anggaran baru di satu HP akan **otomatis muncul** di HP anggota keluarga lain dalam hitungan detik, selama semuanya terhubung internet.

### Catatan

- Tanpa internet, aplikasi tetap berjalan penuh secara lokal (offline-first); begitu online kembali, data akan otomatis terkirim/tersinkron.
- Untuk memutus sinkronisasi di satu HP (kembali ke data lokal saja), buka **Pengaturan → Sinkronisasi Keluarga → Putuskan Sinkronisasi**.
- Firebase gratis (Spark Plan) sudah lebih dari cukup untuk pemakaian satu keluarga.

---

## 🛠️ Teknologi

- HTML5, CSS3, JavaScript (Vanilla, tanpa framework/build step)
- [Chart.js](https://www.chartjs.org/) via CDN — grafik garis & donut
- [Firebase Firestore](https://firebase.google.com/) via CDN — sinkronisasi real-time lintas HP (**opsional**, aplikasi tetap jalan penuh tanpa ini)
- IndexedDB — penyimpanan data utama (offline-first)
- localStorage — preferensi tema
- Service Worker — cache offline & PWA

Tidak ada Node.js backend, PHP, Python backend, database eksternal, atau API berbayar yang dibutuhkan untuk menjalankan aplikasi ini.

---

**FLARENO FAMILY** — Atur Hari Ini, Tenang untuk Esok. 🌿
