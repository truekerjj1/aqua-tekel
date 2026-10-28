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
    return {
      baslangic: r.baslangic,
      bitis: r.bitis,
      baslangicTr: r.baslangicTr,
      bitisTr: r.bitisTr,
      weekLabel: r.weekLabel || (mode === 'current' ? 'bu hafta' : 'önceki hafta')
    };
  }
  return null;
}

/**
 * Filtre tokenını temizler: "Fatih Toprak (patron)" → "Fatih Toprak".
 * @param {*} s
 * @return {string}
 */
function normalizeUserFilterToken_(s) {
  var t = String(s == null ? '' : s).trim();
  if (!t) return '';
  t = t.replace(/\s*\((patron|personel|misafir)\)\s*$/i, '').trim();
  return t;
}

/**
 * yyyy-MM-dd → dd.MM.yyyy (istemciye Date nesnesi göndermemek için).
 * @param {*} val
 * @return {string}
 */
function dateToTr_(val) {
  var k = parseDateKey_(val);
  if (!k) {
    if (val == null || val === '') return '';
    return String(val);
  }
  var p = k.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

/**
 * Satırı JSON-güvenli düz nesneye çevirir (Date → dd.MM.yyyy).
 * @param {Object} r
 * @param {string} tip
 * @return {Object}
 */
function serializeAdminRow_(r, tip) {
  r = r || {};
  var out = {
    tip: tip || '',
    row: r.row,
    tarih: dateToTr_(r.tarih),
    tutar: r.tutar,
    kullanici: r.kullanici || '',
    onayDurum: r.onayDurum || ''
  };
  if (tip === 'fatura') {
    out.faturaNo = r.faturaNo || '';
    out.tedarikci = r.tedarikci || '';
    out.ozet = (r.faturaNo || '') + ' · ' + (r.tedarikci || '');
  } else if (tip === 'odeme') {
    out.tedarikci = r.tedarikci || '';
    out.yontem = r.yontem || '';
    out.ozet = (r.tedarikci || '') + (r.yontem ? ' · ' + r.yontem : '');
  } else if (tip === 'gelir') {
    out.aciklama = r.aciklama || '';
    out.ozet = r.aciklama || '';
  } else if (tip === 'gider') {
    out.aciklama = r.aciklama || '';
    out.kategori = r.kategori || '';
    out.ozet = (r.aciklama || '') + (r.kategori ? ' · ' + r.kategori : '');
  }
  return out;
}

/**
 * Kullanıcı adı / id eşleşmesi (rol etiketi ve kısmi ad).
 * @param {*} kullanici — kayıtta yazan ad veya id
 * @param {string} filtreAd
 * @param {string=} filtreId
 * @return {boolean}
 */
function matchKullaniciFilter_(kullanici, filtreAd, filtreId) {
  var fAd = normalizeKeyPart(normalizeUserFilterToken_(filtreAd));
  var fId = normalizeKeyPart(filtreId);
  if (!fAd && !fId) return true;
  var k = normalizeKeyPart(kullanici);
  if (!k) return false;
  if (fId && (k === fId || k.indexOf(fId) === 0)) return true;
  if (!fAd) return false;
  if (k === fAd) return true;
  // "Sercan" → "Sercan Toprak" veya kayıt id'si
  if (k.indexOf(fAd) === 0 || k.indexOf(fAd + ' ') >= 0) return true;
  if (fAd.indexOf(k) === 0 || fAd.indexOf(k + ' ') >= 0) return true;
  return false;
}

/**
 * Filtre aralığını çözer: weekPreset varsa tarih alanlarını ezer.
 * @param {Object} filtre
 * @return {{bas: string, bit: string, basTr: string, bitTr: string, weekPreset: string, weekLabel: string}}
 */
function resolveAdminFilterRange_(filtre) {
  filtre = filtre || {};
  var weekPreset = String(filtre.weekPreset || filtre.hafta || '').trim();
  var preset = adminWeekPresetRange_(weekPreset);
  var bas = '';
  var bit = '';
  var basTr = '';
  var bitTr = '';
  var weekLabel = '';
  if (preset) {
    bas = preset.baslangic;
    bit = preset.bitis;
    basTr = preset.baslangicTr || dateToTr_(bas);
    bitTr = preset.bitisTr || dateToTr_(bit);
    weekLabel = preset.weekLabel || '';
  } else {
    if (filtre.baslangic) bas = parseDateKey_(filtre.baslangic) || '';
    if (filtre.bitis) bit = parseDateKey_(filtre.bitis) || '';
    basTr = bas ? dateToTr_(bas) : '';
    bitTr = bit ? dateToTr_(bit) : '';
  }
  return {
    bas: bas,
    bit: bit,
    basTr: basTr,
    bitTr: bitTr,
    weekPreset: weekPreset,
    weekLabel: weekLabel
  };
}

function getAdminFilteredReport(filtre) {
  try {
    var denied = denyUnlessManager();
    if (denied) {
      return {
        ok: false,
        message: denied.message,
        faturalar: [],
        gelirler: [],
        giderler: [],
        odemeler: [],
        userTotals: [],
        ozet: null
      };
    }
    filtre = filtre || {};
    var ted = String(filtre.tedarikci || '').trim();
    var kullanici = normalizeUserFilterToken_(filtre.kullanici);
    var kullaniciId = String(filtre.kullaniciId || filtre.userId || '').trim();
    var range = resolveAdminFilterRange_(filtre);
    var bas = range.bas;
    var bit = range.bit;

    var faturalar = [];
    var odemeler = [];
    var gelirler = [];
    var giderler = [];
    var gelirToplam = 0;
    var giderToplam = 0;
    var byUser = {};
    var i;

    function bumpUser(ad, tip, tutar) {
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

    var inv = listInvoices(ted ? { tedarikci: ted } : {});
    if (inv && inv.ok) {
      for (i = 0; i < inv.rows.length; i++) {
        if (!inDateRange_(inv.rows[i].tarih, bas, bit)) continue;
        if (!matchKullaniciFilter_(inv.rows[i].kullanici, kullanici, kullaniciId)) continue;
        faturalar.push(serializeAdminRow_(inv.rows[i], 'fatura'));
      }
    }

    var pay = listPayments(ted ? { tedarikci: ted } : {});
    if (pay && pay.ok) {
      for (i = 0; i < pay.rows.length; i++) {
        if (!inDateRange_(pay.rows[i].tarih, bas, bit)) continue;
        if (!matchKullaniciFilter_(pay.rows[i].kullanici, kullanici, kullaniciId)) continue;
        odemeler.push(serializeAdminRow_(pay.rows[i], 'odeme'));
      }
    }

    var inc = listIncome({});
    if (inc && inc.ok) {
      for (i = 0; i < inc.rows.length; i++) {
        if (!inDateRange_(inc.rows[i].tarih, bas, bit)) continue;
        if (!matchKullaniciFilter_(inc.rows[i].kullanici, kullanici, kullaniciId)) continue;
        gelirler.push(serializeAdminRow_(inc.rows[i], 'gelir'));
        var gt = parseTutar(inc.rows[i].tutar);
        if (!isNaN(gt)) {
          gelirToplam += gt;
          bumpUser(inc.rows[i].kullanici, 'gelir', gt);
        }
      }
    }

    var exp = listExpense({});
    if (exp && exp.ok) {
      for (i = 0; i < exp.rows.length; i++) {
        if (!inDateRange_(exp.rows[i].tarih, bas, bit)) continue;
        if (!matchKullaniciFilter_(exp.rows[i].kullanici, kullanici, kullaniciId)) continue;
        giderler.push(serializeAdminRow_(exp.rows[i], 'gider'));
        var xt = parseTutar(exp.rows[i].tutar);
        if (!isNaN(xt)) {
          giderToplam += xt;
          bumpUser(exp.rows[i].kullanici, 'gider', xt);
        }
      }
    }

    var userTotals = Object.keys(byUser).map(function (k) {
      return byUser[k];
    });
    userTotals.sort(function (a, b) {
      return b.gider - a.gider;
    });

    var label = kullanici || kullaniciId;
    var aralik =
      range.basTr && range.bitTr
        ? range.basTr + ' – ' + range.bitTr
        : 'seçilen aralık';
    var ozetMetin = '';
    if (label) {
      ozetMetin =
        label +
        ' bu aralıkta (' +
        aralik +
        ') ' +
        formatTutarTr(giderToplam) +
        ' ₺ gider' +
        (gelirToplam ? ' · ' + formatTutarTr(gelirToplam) + ' ₺ gelir' : '');
    } else if (range.basTr || range.bitTr || range.weekLabel) {
      ozetMetin =
        'Aralık ' +
        aralik +
        (range.weekLabel ? ' (' + range.weekLabel + ')' : '') +
        ': ' +
        formatTutarTr(giderToplam) +
        ' ₺ gider · ' +
        formatTutarTr(gelirToplam) +
        ' ₺ gelir';
    }

    return {
      ok: true,
      message: ozetMetin || 'Tamam',
      filtre: {
        tedarikci: ted,
        kullanici: kullanici,
        kullaniciId: kullaniciId,
        baslangic: bas,
        bitis: bit,
        baslangicTr: range.basTr,
        bitisTr: range.bitTr,
        weekPreset: range.weekPreset,
        weekLabel: range.weekLabel
      },
      ozet: {
        kullanici: label,
        gelirToplam: gelirToplam,
        giderToplam: giderToplam,
        gelirAdet: gelirler.length,
        giderAdet: giderler.length,
        metin: ozetMetin,
        aralik: aralik
      },
      userTotals: userTotals,
      faturalar: faturalar,
      odemeler: odemeler,
      gelirler: gelirler,
      giderler: giderler
    };
  } catch (e) {
    return {
      ok: false,
      message:
        'Filtre sırasında hata: ' +
        (e && e.message ? e.message : String(e || 'bilinmeyen')),
      faturalar: [],
      gelirler: [],
      giderler: [],
      odemeler: [],
      userTotals: [],
      ozet: null
    };
  }
}

/**
 * Kullanıcı bazlı gelir/gider toplamları (tarih aralığı veya hafta ön ayarı).
 * google.script.run → getAdminUserTotals
 * @param {Object=} filtre — {kullanici, kullaniciId, baslangic, bitis, weekPreset}
 * @return {Object}
 */
function getAdminUserTotals(filtre) {
  try {
    var denied = denyUnlessManager();
    if (denied) {
      return { ok: false, message: denied.message, rows: [], ozet: null };
    }
    // Tek kaynak: filtered report (eşleşme + aralık tutarlı)
    var rep = getAdminFilteredReport(filtre || {});
    if (!rep || !rep.ok) {
      return {
        ok: false,
        message: (rep && rep.message) || 'Toplam alınamadı.',
        rows: [],
        ozet: null
      };
    }
    return {
      ok: true,
      message: (rep.ozet && rep.ozet.metin) || 'Tamam',
      filtre: rep.filtre,
      rows: rep.userTotals || [],
      ozet: rep.ozet
    };
  } catch (e) {
    return {
      ok: false,
      message: 'Toplam sırasında hata: ' + (e && e.message ? e.message : String(e)),
      rows: [],
      ozet: null
    };
  }
}

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
