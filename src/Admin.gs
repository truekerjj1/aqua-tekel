/**
 * Aqua Tekel — yönetici paneli API (sandbox)
 *
 * Yalnız patron (requirePatron). Bugünkü özet, son işlemler,
 * firma + tarih filtre, aylık grafikler.
 * Canlı muhasebe ID’si kullanılmaz.
 */

/**
 * Tarihi karşılaştırmak için yyyyMMdd sayı / string.
 * @param {*} val
 * @return {string} yyyy-MM-dd veya ''
 */
function parseDateKey_(val) {
  if (val == null || val === '') return '';
  // Sheets Date nesnesi
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, 'Europe/Istanbul', 'yyyy-MM-dd');
  }
  // Nadir: Excel/Sheets seri numarası
  if (typeof val === 'number' && isFinite(val) && val > 20000 && val < 80000) {
    var serial = new Date(Date.UTC(1899, 11, 30) + Math.round(val) * 86400000);
    return Utilities.formatDate(serial, 'UTC', 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  // dd.MM.yyyy | dd/MM/yyyy | dd-MM-yyyy
  var m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    var d = ('0' + m[1]).slice(-2);
    var mo = ('0' + m[2]).slice(-2);
    return m[3] + '-' + mo + '-' + d;
  }
  // yyyy-MM-dd veya ISO (2026-10-27T21:00:00.000Z) — İstanbul gününe çevir
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    if (s.length > 10) {
      var parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return Utilities.formatDate(parsed, 'Europe/Istanbul', 'yyyy-MM-dd');
      }
    }
    return s.substring(0, 10);
  }
  return '';
}

/**
 * Bugünün yyyy-MM-dd (İstanbul).
 * @return {string}
 */
function todayKey_() {
  return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
}

/**
 * Ay anahtarı yyyy-MM.
 * @param {*} val
 * @return {string}
 */
function monthKey_(val) {
  var k = parseDateKey_(val);
  return k ? k.substring(0, 7) : '';
}

/**
 * Tarih aralığında mı?
 * @param {*} tarih
 * @param {string} bas
 * @param {string} bit
 * @return {boolean}
 */
function inDateRange_(tarih, bas, bit) {
  var k = parseDateKey_(tarih);
  if (!k) return !bas && !bit;
  if (bas && k < bas) return false;
  if (bit && k > bit) return false;
  return true;
}

/**
 * Bugünkü özet (gelir, gider, fatura, ödeme).
 * google.script.run → getAdminTodaySummary
 * @return {Object}
 */
function getAdminTodaySummary() {
  var denied = denyUnlessManager();
  if (denied) {
    return {
      ok: false,
      message: denied.message,
      gelir: 0,
      gider: 0,
      fatura: 0,
      odeme: 0,
      faturaAdet: 0,
      odemeAdet: 0
    };
  }

  var today = todayKey_();
  var gelir = 0;
  var gider = 0;
  var fatura = 0;
  var odeme = 0;
  var faturaAdet = 0;
  var odemeAdet = 0;
  var i;

  var inc = listIncome({});
  if (inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      if (parseDateKey_(inc.rows[i].tarih) === today) {
        var gt = parseTutar(inc.rows[i].tutar);
        if (!isNaN(gt)) gelir += gt;
      }
    }
  }

  var exp = listExpense({});
  if (exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      if (parseDateKey_(exp.rows[i].tarih) === today) {
        var xt = parseTutar(exp.rows[i].tutar);
        if (!isNaN(xt)) gider += xt;
      }
    }
  }

  var inv = listInvoices({});
  if (inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      if (parseDateKey_(inv.rows[i].tarih) === today) {
        faturaAdet++;
        var ft = parseTutar(inv.rows[i].tutar);
        if (!isNaN(ft)) fatura += ft;
      }
    }
  }

  var pay = listPayments({});
  if (pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      if (parseDateKey_(pay.rows[i].tarih) === today) {
        odemeAdet++;
        var ot = parseTutar(pay.rows[i].tutar);
        if (!isNaN(ot)) odeme += ot;
      }
    }
  }

  return {
    ok: true,
    message: 'Tamam',
    tarih: formatDateTr(),
    gelir: gelir,
    gider: gider,
    fatura: fatura,
    odeme: odeme,
    faturaAdet: faturaAdet,
    odemeAdet: odemeAdet
  };
}

/**
 * Tüm kullanıcıların son işlemleri (birleşik).
 * @param {Object=} opts — {limit}
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function getAdminRecentActivity(opts) {
  var denied = denyUnlessManager();
  if (denied) {
    return { ok: false, message: denied.message, rows: [] };
  }
  opts = opts || {};
  var limit = Number(opts.limit) || 40;
  return { ok: true, message: 'Tamam', rows: collectActivity_(null, limit) };
}

/**
 * Profil: kendi son işlemleri.
 * google.script.run → getMyRecentActivity
 * @param {Object=} opts
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function getMyRecentActivity(opts) {
  if (!requirePersonelOrPatron()) {
    return {
      ok: false,
      message: 'Profil için giriş yapın.',
      rows: []
    };
  }
  opts = opts || {};
  var limit = Number(opts.limit) || 25;
  var me = currentActorLabel_();
  var meId = currentActorId_();
  return {
    ok: true,
    message: 'Tamam',
    rows: collectActivity_({ ad: me, id: meId }, limit)
  };
}

/**
 * @param {{ad: string, id: string}|null} userFilter
 * @param {number} limit
 * @return {Array<Object>}
 */
function collectActivity_(userFilter, limit) {
  var items = [];
  var i;

  function matchUser(kullanici) {
    if (!userFilter) return true;
    var k = normalizeKeyPart(kullanici);
    return k === normalizeKeyPart(userFilter.ad) ||
      k === normalizeKeyPart(userFilter.id);
  }

  var inc = listIncome({});
  if (inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      var g = inc.rows[i];
      if (!matchUser(g.kullanici)) continue;
      items.push({
        tip: 'gelir',
        tarih: g.tarih,
        tarihKey: parseDateKey_(g.tarih),
        tutar: g.tutar,
        ozet: g.aciklama || '',
        kullanici: g.kullanici || '',
        onayDurum: ''
      });
    }
  }

  var exp = listExpense({});
  if (exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      var x = exp.rows[i];
      if (!matchUser(x.kullanici)) continue;
      items.push({
        tip: 'gider',
        tarih: x.tarih,
        tarihKey: parseDateKey_(x.tarih),
        tutar: x.tutar,
        ozet: (x.aciklama || '') + (x.kategori ? ' · ' + x.kategori : ''),
        kullanici: x.kullanici || '',
        onayDurum: ''
      });
    }
  }

  var inv = listInvoices({});
  if (inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      var f = inv.rows[i];
      if (!matchUser(f.kullanici)) continue;
      items.push({
        tip: 'fatura',
        tarih: f.tarih,
        tarihKey: parseDateKey_(f.tarih),
        tutar: f.tutar,
        ozet: (f.faturaNo || '') + ' · ' + (f.tedarikci || ''),
        kullanici: f.kullanici || '',
        onayDurum: f.onayDurum || ''
      });
    }
  }

  var pay = listPayments({});
  if (pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      var o = pay.rows[i];
      if (!matchUser(o.kullanici)) continue;
      items.push({
        tip: 'odeme',
        tarih: o.tarih,
        tarihKey: parseDateKey_(o.tarih),
        tutar: o.tutar,
        ozet: (o.tedarikci || '') + (o.yontem ? ' · ' + o.yontem : ''),
        kullanici: o.kullanici || '',
        onayDurum: o.onayDurum || ''
      });
    }
  }

  items.sort(function (a, b) {
    if (a.tarihKey < b.tarihKey) return 1;
    if (a.tarihKey > b.tarihKey) return -1;
    return 0;
  });

  if (limit > 0 && items.length > limit) {
    items = items.slice(0, limit);
  }
  return items;
}

/**
 * Firma + iki tarih arası fatura / gelir / gider takibi.
 * @param {Object} filtre — {tedarikci, baslangic, bitis}
 * @return {Object}
 */
/**
 * Hafta ön ayarı → baslangic/bitis (İstanbul).
 * @param {string} preset — previous | current | '' 
 * @return {{baslangic: string, bitis: string}|null}
 */
function adminWeekPresetRange_(preset) {
  var p = String(preset || '').trim().toLowerCase();
  if (!p) return null;
  if (typeof resolveWeekRange_ === 'function') {
    var mode = p === 'current' || p === 'bu' || p === 'bu_hafta' ? 'current' : 'previous';
    var r = resolveWeekRange_(mode, new Date());
    return { baslangic: r.baslangic, bitis: r.bitis };
  }
  return null;
}

/**
 * Kullanıcı adı eşleşmesi (ad veya id).
 * @param {*} kullanici
 * @param {string} filtreAd
 * @return {boolean}
 */
function matchKullaniciFilter_(kullanici, filtreAd) {
  if (!filtreAd) return true;
  var k = normalizeKeyPart(kullanici);
  var f = normalizeKeyPart(filtreAd);
  if (!f) return true;
  if (k === f) return true;
  // "Sercan" kısmi eşleşme: ad "Sercan Toprak"
  if (k.indexOf(f) === 0 || k.indexOf(f + ' ') >= 0) return true;
  return false;
}

function getAdminFilteredReport(filtre) {
  var denied = denyUnlessManager();
  if (denied) {
    return {
      ok: false,
      message: denied.message,
      faturalar: [],
      gelirler: [],
      giderler: [],
      odemeler: [],
      ozet: null
    };
  }
  filtre = filtre || {};
  var ted = String(filtre.tedarikci || '').trim();
  var kullanici = String(filtre.kullanici || '').trim();
  var bas = '';
  var bit = '';
  var preset = adminWeekPresetRange_(filtre.weekPreset || filtre.hafta);
  if (preset) {
    bas = preset.baslangic;
    bit = preset.bitis;
  }
  if (filtre.baslangic) bas = parseDateKey_(filtre.baslangic) || bas;
  if (filtre.bitis) bit = parseDateKey_(filtre.bitis) || bit;

  var faturalar = [];
  var odemeler = [];
  var gelirler = [];
  var giderler = [];
  var gelirToplam = 0;
  var giderToplam = 0;
  var i;

  var inv = listInvoices(ted ? { tedarikci: ted } : {});
  if (inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      if (!inDateRange_(inv.rows[i].tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(inv.rows[i].kullanici, kullanici)) continue;
      faturalar.push(inv.rows[i]);
    }
  }

  var pay = listPayments(ted ? { tedarikci: ted } : {});
  if (pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      if (!inDateRange_(pay.rows[i].tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(pay.rows[i].kullanici, kullanici)) continue;
      odemeler.push(pay.rows[i]);
    }
  }

  // Gelir/gider tedarikçiye bağlı değil — tarih + kullanıcı filtresi
  var inc = listIncome({});
  if (inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      if (!inDateRange_(inc.rows[i].tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(inc.rows[i].kullanici, kullanici)) continue;
      gelirler.push(inc.rows[i]);
      var gt = parseTutar(inc.rows[i].tutar);
      if (!isNaN(gt)) gelirToplam += gt;
    }
  }

  var exp = listExpense({});
  if (exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      if (!inDateRange_(exp.rows[i].tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(exp.rows[i].kullanici, kullanici)) continue;
      giderler.push(exp.rows[i]);
      var xt = parseTutar(exp.rows[i].tutar);
      if (!isNaN(xt)) giderToplam += xt;
    }
  }

  var ozetMetin = '';
  if (kullanici) {
    ozetMetin =
      kullanici +
      ' bu aralıkta ' +
      formatTutarTr(giderToplam) +
      ' ₺ gider' +
      (gelirToplam ? (' · ' + formatTutarTr(gelirToplam) + ' ₺ gelir') : '');
  }

  return {
    ok: true,
    message: ozetMetin || 'Tamam',
    filtre: {
      tedarikci: ted,
      kullanici: kullanici,
      baslangic: bas,
      bitis: bit,
      weekPreset: String(filtre.weekPreset || filtre.hafta || '')
    },
    ozet: {
      kullanici: kullanici,
      gelirToplam: gelirToplam,
      giderToplam: giderToplam,
      gelirAdet: gelirler.length,
      giderAdet: giderler.length,
      metin: ozetMetin
    },
    faturalar: faturalar,
    odemeler: odemeler,
    gelirler: gelirler,
    giderler: giderler
  };
}

/**
 * Kullanıcı bazlı gelir/gider toplamları (tarih aralığı veya hafta ön ayarı).
 * google.script.run → getAdminUserTotals
 * @param {Object=} filtre — {kullanici, baslangic, bitis, weekPreset}
 * @return {Object}
 */
function getAdminUserTotals(filtre) {
  var denied = denyUnlessManager();
  if (denied) {
    return { ok: false, message: denied.message, rows: [], ozet: null };
  }
  filtre = filtre || {};
  var kullanici = String(filtre.kullanici || '').trim();
  var bas = '';
  var bit = '';
  var preset = adminWeekPresetRange_(filtre.weekPreset || filtre.hafta);
  if (preset) {
    bas = preset.baslangic;
    bit = preset.bitis;
  }
  if (filtre.baslangic) bas = parseDateKey_(filtre.baslangic) || bas;
  if (filtre.bitis) bit = parseDateKey_(filtre.bitis) || bit;

  var byUser = {};
  function bump(ad, tip, tutar) {
    var name = String(ad || '—').trim() || '—';
    if (!byUser[name]) {
      byUser[name] = { ad: name, gelir: 0, gider: 0, gelirAdet: 0, giderAdet: 0 };
    }
    if (tip === 'gelir') {
      byUser[name].gelir += tutar;
      byUser[name].gelirAdet++;
    } else {
      byUser[name].gider += tutar;
      byUser[name].giderAdet++;
    }
  }

  var i;
  var inc = listIncome({});
  if (inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      var g = inc.rows[i];
      if (!inDateRange_(g.tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(g.kullanici, kullanici)) continue;
      var gt = parseTutar(g.tutar);
      if (!isNaN(gt)) bump(g.kullanici, 'gelir', gt);
    }
  }
  var exp = listExpense({});
  if (exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      var x = exp.rows[i];
      if (!inDateRange_(x.tarih, bas, bit)) continue;
      if (!matchKullaniciFilter_(x.kullanici, kullanici)) continue;
      var xt = parseTutar(x.tutar);
      if (!isNaN(xt)) bump(x.kullanici, 'gider', xt);
    }
  }

  var rows = Object.keys(byUser).map(function (k) { return byUser[k]; });
  rows.sort(function (a, b) { return b.gider - a.gider; });

  var ozet = null;
  if (kullanici && rows.length) {
    var r0 = rows[0];
    ozet = {
      kullanici: r0.ad,
      giderToplam: r0.gider,
      gelirToplam: r0.gelir,
      metin:
        r0.ad +
        ' bu aralıkta ' +
        formatTutarTr(r0.gider) +
        ' ₺ gider' +
        (r0.gelir ? (' · ' + formatTutarTr(r0.gelir) + ' ₺ gelir') : '')
    };
  } else if (kullanici) {
    ozet = {
      kullanici: kullanici,
      giderToplam: 0,
      gelirToplam: 0,
      metin: kullanici + ' bu aralıkta 0 ₺ gider'
    };
  }

  return {
    ok: true,
    message: (ozet && ozet.metin) || 'Tamam',
    filtre: { kullanici: kullanici, baslangic: bas, bitis: bit },
    rows: rows,
    ozet: ozet
  };
}

/**
 * Aylık fatura giriş + ödeme grafikleri için veri.
 * @return {{ok: boolean, message: string, labels: string[], fatura: number[], odeme: number[]}}
 */
function getAdminMonthlyCharts() {
  var denied = denyUnlessManager();
  if (denied) {
    return { ok: false, message: denied.message, labels: [], fatura: [], odeme: [] };
  }

  var mapF = {};
  var mapO = {};
  var i;

  var inv = listInvoices({});
  if (inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      var mk = monthKey_(inv.rows[i].tarih);
      if (!mk) continue;
      var ft = parseTutar(inv.rows[i].tutar);
      if (isNaN(ft)) continue;
      mapF[mk] = (mapF[mk] || 0) + ft;
    }
  }

  var pay = listPayments({});
  if (pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      var mk2 = monthKey_(pay.rows[i].tarih);
      if (!mk2) continue;
      // Grafikte tüm yöntemler (Vadeli dahil kayıt tutarı)
      var ot = parseTutar(pay.rows[i].tutar);
      if (isNaN(ot)) continue;
      mapO[mk2] = (mapO[mk2] || 0) + ot;
    }
  }

  var keys = {};
  Object.keys(mapF).forEach(function (k) { keys[k] = true; });
  Object.keys(mapO).forEach(function (k) { keys[k] = true; });
  var labels = Object.keys(keys).sort();
  // Son 6 ay
  if (labels.length > 6) {
    labels = labels.slice(labels.length - 6);
  }

  var fatura = [];
  var odeme = [];
  for (i = 0; i < labels.length; i++) {
    fatura.push(Math.round((mapF[labels[i]] || 0) * 100) / 100);
    odeme.push(Math.round((mapO[labels[i]] || 0) * 100) / 100);
  }

  return {
    ok: true,
    message: 'Tamam',
    labels: labels,
    fatura: fatura,
    odeme: odeme
  };
}

/**
 * Ödeme yöntemleri listesi (UI).
 * @return {{ok: boolean, methods: Array<string>}}
 */
function listPaymentMethods() {
  var cfg = getConfig();
  return {
    ok: true,
    methods: (cfg.ODEME_YONTEMLERI || ['Nakit', 'Kredi kartı', 'Vadeli']).slice()
  };
}
