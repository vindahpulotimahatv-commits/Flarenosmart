/* FLARENO FAMILY — statistics.js
   Agregasi data transaksi menjadi statistik & data siap-pakai untuk Chart.js.
   Semua angka dihitung dari transaksi sungguhan, tidak ada data buatan.
*/

const Statistics = (() => {
  const CATEGORY_ICON = {
    'Makanan': '🍚', 'Rumah': '🏠', 'Transportasi': '⛽', 'Belanja': '🛒',
    'Cicilan': '💳', 'Tagihan': '🧾', 'Kesehatan': '💊', 'Hiburan': '🎬',
    'Pendidikan': '📚', 'Tabungan': '🐷', 'Lainnya': '📦'
  };

  function iconFor(cat) { return CATEGORY_ICON[cat] || '📦'; }

  function monthKey(dateStr) {
    return (dateStr || '').slice(0, 7); // YYYY-MM
  }

  function currentMonthKey(ref = new Date()) {
    return ref.toISOString().slice(0, 7);
  }

  function prevMonthKey(ref = new Date()) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    return d.toISOString().slice(0, 7);
  }

  function ringkasanBulan(transactions, key) {
    const inMonth = transactions.filter(t => monthKey(t.date) === key);
    const pemasukan = Finance.sumBy(inMonth, t => t.type === 'in');
    const pengeluaran = Finance.sumBy(inMonth, t => t.type === 'out');
    const tabungan = Finance.sumBy(inMonth, t => t.type === 'saving');
    const cicilan = Finance.sumBy(inMonth, t => t.type === 'installment');
    const saldo = pemasukan - pengeluaran - tabungan - cicilan;
    return { pemasukan, pengeluaran, tabungan, cicilan, saldo, jumlahTransaksi: inMonth.length };
  }

  function last7Days(ref = new Date()) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  function pengeluaran7Hari(transactions, batasHarian, ref = new Date()) {
    const days = last7Days(ref);
    const labels = days.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('id-ID', { weekday: 'short' });
    });
    const aktual = days.map(d => Finance.sumBy(transactions, t => t.type === 'out' && t.date === d));
    const batas = days.map(() => Finance.toNumber(batasHarian));
    return { labels, aktual, batas, days };
  }

  function kategoriBulanIni(transactions, key) {
    const inMonth = transactions.filter(t => monthKey(t.date) === key && t.type === 'out');
    const totals = {};
    let total = 0;
    for (const t of inMonth) {
      const cat = t.category || 'Lainnya';
      totals[cat] = (totals[cat] || 0) + Finance.toNumber(t.amount);
      total += Finance.toNumber(t.amount);
    }
    const items = Object.keys(totals).map(cat => ({
      category: cat,
      amount: totals[cat],
      percent: total > 0 ? Math.round((totals[cat] / total) * 1000) / 10 : 0,
      icon: iconFor(cat)
    })).sort((a, b) => b.amount - a.amount);
    return { items, total };
  }

  function statistikLengkap(transactions, key) {
    const inMonth = transactions.filter(t => monthKey(t.date) === key);
    const ring = ringkasanBulan(transactions, key);
    const outTx = inMonth.filter(t => t.type === 'out');
    const daysInData = new Set(outTx.map(t => t.date));
    const rataRataHarian = daysInData.size > 0 ? ring.pengeluaran / daysInData.size : 0;

    let terbesar = null;
    for (const t of outTx) {
      if (!terbesar || Finance.toNumber(t.amount) > Finance.toNumber(terbesar.amount)) terbesar = t;
    }

    const kategori = kategoriBulanIni(transactions, key);
    const kategoriTerbesar = kategori.items[0] || null;

    const perHari = {};
    for (const t of outTx) {
      perHari[t.date] = (perHari[t.date] || 0) + Finance.toNumber(t.amount);
    }
    let hariPalingBoros = null, maxHari = -1;
    for (const d in perHari) {
      if (perHari[d] > maxHari) { maxHari = perHari[d]; hariPalingBoros = d; }
    }

    const ringBulanLalu = ringkasanBulan(transactions, prevMonthKey(new Date(key + '-02')));

    return {
      totalPemasukan: ring.pemasukan,
      totalPengeluaran: ring.pengeluaran,
      totalTabungan: ring.tabungan,
      rataRataHarian,
      pengeluaranTerbesar: terbesar,
      kategoriTerbesar,
      jumlahTransaksi: inMonth.length,
      hariPalingBoros,
      nominalHariPalingBoros: maxHari > 0 ? maxHari : 0,
      bulanLalu: ringBulanLalu
    };
  }

  function insights(settings, transactions, bills, dashboard) {
    const list = [];
    const key = currentMonthKey();
    const prevKey = prevMonthKey();
    const foodNow = Finance.sumBy(transactions.filter(t => monthKey(t.date) === key), t => t.type === 'out' && t.category === 'Makanan');
    const foodPrev = Finance.sumBy(transactions.filter(t => monthKey(t.date) === prevKey), t => t.type === 'out' && t.category === 'Makanan');
    if (foodPrev > 0 && foodNow > foodPrev * 1.1) {
      list.push({ icon: '💡', text: `Pengeluaran Makanan naik ${Math.round((foodNow / foodPrev - 1) * 100)}% dibanding bulan lalu.` });
    }

    if (dashboard.sisaBatas > 0) {
      list.push({ icon: '💡', text: `Hari ini masih tersedia Rp${formatRp(dashboard.sisaBatas)} dari batas aman.` });
    } else if (dashboard.pengeluaranHariIni > 0) {
      list.push({ icon: '💡', text: `Pengeluaran hari ini sudah melebihi batas aman sebesar Rp${formatRp(Math.abs(dashboard.sisaBatas))}.` });
    }

    list.push({ icon: '💡', text: `Besok, batas aman diperkirakan menjadi Rp${formatRp(dashboard.batasBesok)}.` });

    const today = Finance.todayStr();
    const rejekiHariIni = Finance.sumBy(transactions, t => t.type === 'in' && t.category === 'Rejeki Tak Terduga' && t.date === today);
    if (rejekiHariIni > 0) {
      list.push({ icon: '🎉', text: `Rejeki tak terduga Rp${formatRp(rejekiHariIni)} masuk hari ini — Saldo Aman ikut bertambah!` });
    }

    const soon = (bills || []).filter(b => b.status !== 'lunas' && daysUntilDate(b.dueDate) >= 0 && daysUntilDate(b.dueDate) <= 3);
    for (const b of soon) {
      const d = daysUntilDate(b.dueDate);
      list.push({ icon: '🔔', text: `Tagihan ${b.name} Rp${formatRp(b.amount)} jatuh tempo ${d === 0 ? 'hari ini' : `dalam ${d} hari`}.` });
    }

    return list;
  }

  function daysUntilDate(dateStr) {
    if (!dateStr) return 9999;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / (1000 * 60 * 60 * 24));
  }

  function formatRp(n) {
    n = Math.round(Finance.toNumber(n));
    return n.toLocaleString('id-ID');
  }

  function kalenderBulan(transactions, year, month) {
    // month: 0-11. Mengembalikan map tanggal -> total pengeluaran
    const map = {};
    for (const t of transactions) {
      if (!t.date) continue;
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month && t.type === 'out') {
        map[t.date] = (map[t.date] || 0) + Finance.toNumber(t.amount);
      }
    }
    return map;
  }

  return {
    iconFor, monthKey, currentMonthKey, prevMonthKey, ringkasanBulan,
    last7Days, pengeluaran7Hari, kategoriBulanIni, statistikLengkap,
    insights, daysUntilDate, formatRp, kalenderBulan
  };
})();
