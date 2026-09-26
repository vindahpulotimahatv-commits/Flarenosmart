/* FLARENO FAMILY — finance.js
   Semua rumus inti aplikasi. Fungsi murni (pure function): menerima data, mengembalikan angka.
   Tidak ada NaN, tidak ada pembagian dengan nol, tidak ada undefined yang lolos ke UI.
*/

const Finance = (() => {

  function toNumber(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function daysUntilPayday(paydayDay, from = new Date()) {
    paydayDay = Math.min(Math.max(parseInt(paydayDay) || 1, 1), 28);
    const now = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    let target = new Date(now.getFullYear(), now.getMonth(), paydayDay);
    if (target <= now) {
      target = new Date(now.getFullYear(), now.getMonth() + 1, paydayDay);
    }
    const diffMs = target - now;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 1); // minimal 1 supaya tidak pernah dibagi nol
  }

  function sumBy(transactions, predicate) {
    return transactions.filter(predicate).reduce((acc, t) => acc + toNumber(t.amount), 0);
  }

  function computeSaldo(settings, transactions) {
    const saldoAwal = toNumber(settings.saldoAwal);
    const masuk = sumBy(transactions, t => t.type === 'in');
    const keluar = sumBy(transactions, t => t.type === 'out');
    const tabungan = sumBy(transactions, t => t.type === 'saving');
    const cicilan = sumBy(transactions, t => t.type === 'installment');
    return saldoAwal + masuk - keluar - tabungan - cicilan;
  }

  function computeTagihanWajib(bills) {
    return sumBy(bills, b => b.status !== 'lunas');
  }

  /**
   * Menghitung seluruh angka dashboard "UANG AMAN HARI INI".
   */
  function computeDashboard(settings, transactions, bills) {
    const saldo = computeSaldo(settings, transactions);
    const tagihanWajib = computeTagihanWajib(bills);
    const saldoAman = saldo - tagihanWajib;
    const hariTersisa = daysUntilPayday(settings.paydayDay);
    const batasHariIni = hariTersisa > 0 ? saldoAman / hariTersisa : 0;

    const today = todayStr();
    const pengeluaranHariIni = sumBy(transactions, t => t.type === 'out' && t.date === today);
    const sisaBatas = batasHariIni - pengeluaranHariIni;
    const persen = batasHariIni > 0 ? Math.round((pengeluaranHariIni / batasHariIni) * 100) : (pengeluaranHariIni > 0 ? 100 : 0);

    let status = 'aman';
    if (batasHariIni <= 0 && pengeluaranHariIni <= 0) {
      status = 'aman';
    } else if (pengeluaranHariIni > batasHariIni) {
      status = 'bahaya';
    } else if (pengeluaranHariIni > batasHariIni * 0.8) {
      status = 'perhatian';
    }

    const hariTersisaBesok = Math.max(hariTersisa - 1, 1);
    const batasBesok = hariTersisaBesok > 0 ? (saldoAman - pengeluaranHariIni) / hariTersisaBesok : 0;

    return {
      saldo,
      tagihanWajib,
      saldoAman,
      hariTersisa,
      batasHariIni,
      pengeluaranHariIni,
      sisaBatas,
      persen: Math.max(0, persen),
      status,
      batasBesok
    };
  }

  /**
   * Simulasi "Kalau Saya Belanja?" — tidak mengubah data, murni proyeksi.
   */
  function simulasiBelanja(settings, transactions, bills, nominal) {
    nominal = toNumber(nominal);
    const before = computeDashboard(settings, transactions, bills);
    const fakeTx = transactions.concat([{ type: 'out', amount: nominal, date: todayStr(), category: 'Simulasi' }]);
    const after = computeDashboard(settings, fakeTx, bills);
    return {
      saldoSebelum: before.saldo,
      saldoSesudah: after.saldo,
      batasSebelum: before.batasHariIni,
      batasSesudah: after.batasBesok,
      perubahanPerHari: after.batasBesok - before.batasBesok
    };
  }

  /**
   * Proyeksi saldo sampai hari gajian berikutnya berdasarkan rata-rata pengeluaran harian bulan berjalan.
   */
  function proyeksiSampaiGajian(settings, transactions, bills) {
    const dash = computeDashboard(settings, transactions, bills);
    const now = new Date();
    const monthTx = transactions.filter(t => sameMonth(t.date, now));
    const daysPassed = now.getDate();
    const totalOutBulanIni = sumBy(monthTx, t => t.type === 'out');
    const rataRataHarian = daysPassed > 0 ? totalOutBulanIni / daysPassed : 0;
    const estimasiPengeluaranTersisa = rataRataHarian * dash.hariTersisa;
    const estimasiSaldoGajian = dash.saldo - estimasiPengeluaranTersisa - dash.tagihanWajib;
    return {
      saldoSekarang: dash.saldo,
      hariTersisa: dash.hariTersisa,
      rataRataHarian,
      estimasiSaldoGajian
    };
  }

  function sameMonth(dateStr, ref) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }

  return {
    toNumber, todayStr, daysUntilPayday, sumBy,
    computeSaldo, computeTagihanWajib, computeDashboard,
    simulasiBelanja, proyeksiSampaiGajian, sameMonth
  };
})();
