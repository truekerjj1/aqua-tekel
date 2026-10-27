/**
 * Aqua Tekel — örnek test verisi (sandbox)
 *
 * Yalnızca aktif tabloya yazar (SpreadsheetApp.getActiveSpreadsheet).
 * Canlı muhasebe ID’si kullanılmaz. Menüden veya doğrudan çağrılabilir.
 */

/**
 * Test sayfalarına 2–3 örnek tedarikçi, fatura, ödeme, gelir, gider ekler;
 * ardından refreshSupplierBalances() çağırır.
 * @return {{ok: boolean, message: string, added: Object}}
 */

/**
 * Önceki takvim haftası içinde örnek gün (Pzt=0 … Paz=6) — İstanbul.
 * Haftalık özet testinin sıfır dönmemesi için sabit Ekim tarihleri yerine kullanılır.
 * @param {number} offsetDays
 * @return {string} dd.MM.yyyy
 */
function samplePreviousWeekDayTr_(offsetDays) {
  var key = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
  var parts = key.split('-');
  var noon = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 9, 0, 0));
  var dow = Number(Utilities.formatDate(noon, 'Europe/Istanbul', 'u'));
  var thisMon = new Date(noon.getTime() - (dow - 1) * 86400000);
  var prevMon = new Date(thisMon.getTime() - 7 * 86400000);
  var d = new Date(prevMon.getTime() + offsetDays * 86400000);
  return Utilities.formatDate(d, 'Europe/Istanbul', 'dd.MM.yyyy');
}

function loadSampleTestData() {
  // Web App oturumu varsa yalnız patron; menüden (oturum yok) tablo sahibi çalıştırır.
  // Canlı Sheets’e örnek veri yazılmaz — yalnız aktif test tablosu.
  try {
    if (typeof getSessionUser_ === 'function' && getSessionUser_()) {
      var deniedSample = denyUnlessManager();
      if (deniedSample) {
        return deniedSample;
      }
    }
  } catch (eAuth) {
    // Auth yoksa menü yolu devam
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var noSs =
      'Tablo bulunamadı. Bu script’i “Aqua TEKEL TEST PROJESİ” tablosundan ' +
      'Uzantılar → Apps Script ile açın. Canlı muhasebe tablosunu kullanmayın.';
    alertSample_(noSs);
    return { ok: false, message: noSs, added: {} };
  }

  var cfg = getConfig();
  ensureSampleSheets_(ss, cfg);

  var added = {
    tedarikci: 0,
    fatura: 0,
    odeme: 0,
    gelir: 0,
    gider: 0,
    kullanici: 0,
    onay: 0
  };

  // test only — Kullanicilar sheet + Config.TEST_USERS senkron (kod sheet’te)
  added.kullanici = seedTestUsers_(ss, cfg);

  var tedarikciler = [
    { ad: 'Mavi Su Ltd', telefon: '0212 555 0101', not: 'Örnek tedarikçi' },
    { ad: 'Kaynak Dağıtım', telefon: '0216 555 0202', not: 'Örnek tedarikçi' },
    { ad: 'Tekel Ambalaj', telefon: '0312 555 0303', not: 'Örnek tedarikçi' }
  ];

  var dMon = samplePreviousWeekDayTr_(0);
  var dTue = samplePreviousWeekDayTr_(1);
  var dWed = samplePreviousWeekDayTr_(2);
  var dThu = samplePreviousWeekDayTr_(3);
  var dFri = samplePreviousWeekDayTr_(4);
  var dSat = samplePreviousWeekDayTr_(5);

  var faturalar = [
    {
      faturaNo: 'ORNEK-F001',
      tarih: dMon,
      tedarikci: 'Mavi Su Ltd',
      tutar: 1500,
      vade: dThu,
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Vadeli',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi'
    },
    {
      faturaNo: 'ORNEK-F002',
      tarih: dTue,
      tedarikci: 'Kaynak Dağıtım',
      tutar: 820,
      vade: dFri,
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Nakit',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Onaylandi'
    },
    {
      faturaNo: 'ORNEK-F003',
      tarih: dWed,
      tedarikci: 'Tekel Ambalaj',
      tutar: 450,
      vade: dSat,
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Kredi kartı',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi'
    }
  ];

  var odemeler = [
    {
      tarih: dThu,
      tedarikci: 'Mavi Su Ltd',
      tutar: 500,
      yontem: 'Nakit',
      faturaNo: 'ORNEK-F001',
      not: 'Örnek ödeme',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi'
    },
    {
      tarih: dFri,
      tedarikci: 'Kaynak Dağıtım',
      tutar: 320,
      yontem: 'Kredi kartı',
      faturaNo: 'ORNEK-F002',
      not: 'Örnek ödeme',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Onaylandi'
    },
    {
      tarih: dSat,
      tedarikci: 'Tekel Ambalaj',
      tutar: 200,
      yontem: 'Vadeli',
      faturaNo: 'ORNEK-F003',
      not: 'Vadeli kayıt — borç düşmez',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Bekliyor'
    }
  ];

  var gelirler = [
    {
      tarih: dMon,
      tutar: 2400,
      aciklama: 'Örnek satış — mağaza',
      kategori: 'Satış',
      kaynak: 'Nakit',
      not: 'Örnek gelir',
      kullanici: 'Fatih Toprak'
    },
    {
      tarih: dWed,
      tutar: 1100,
      aciklama: 'Örnek satış — kart',
      kategori: 'Satış',
      kaynak: 'Kart',
      not: 'Örnek gelir',
      kullanici: 'Sercan Toprak'
    },
    {
      tarih: dFri,
      tutar: 350,
      aciklama: 'Örnek diğer gelir',
      kategori: 'Diğer',
      kaynak: 'Havale',
      not: 'Örnek gelir',
      kullanici: 'Aleyna Toprak'
    }
  ];

  var giderler = [
    {
      tarih: dTue,
      tutar: 200,
      aciklama: 'Örnek kira taksiti',
      kategori: 'Kira',
      not: 'Örnek gider',
      kullanici: 'Fatih Toprak'
    },
    {
      tarih: dThu,
      tutar: 180,
      aciklama: 'Örnek market alışverişi',
      kategori: 'Market',
      not: 'Örnek gider',
      kullanici: 'Sercan Toprak'
    },
    {
      tarih: dFri,
      tutar: 95,
      aciklama: 'Örnek yemek gideri',
      kategori: 'Yemek',
      not: 'Örnek gider',
      kullanici: 'Aleyna Toprak'
    }
  ];

  var sheetTed = ss.getSheetByName(cfg.SHEETS.TEDARIKCILER);
  var sheetFat = ss.getSheetByName(cfg.SHEETS.FATURALAR);
  var sheetOde = ss.getSheetByName(cfg.SHEETS.ODEMELER);
  var sheetGel = ss.getSheetByName(cfg.SHEETS.GELIR);
  var sheetGid = ss.getSheetByName(cfg.SHEETS.GIDER);
  var sheetOnay = ss.getSheetByName(cfg.SHEETS.ONAYLAR);

  if (!sheetTed || !sheetFat || !sheetOde || !sheetGel || !sheetGid) {
    var missing =
      'Test sayfaları eksik. Önce menüden “Test sayfalarını kur” çalıştırın.';
    alertSample_(missing);
    return { ok: false, message: missing, added: added };
  }

  var i;
  var existingTed = getDataRows(sheetTed);
  for (i = 0; i < tedarikciler.length; i++) {
    var t = tedarikciler[i];
    if (rowExistsByKey_(existingTed, 0, t.ad)) {
      continue;
    }
    sheetTed.appendRow([t.ad, t.telefon, t.not, 0, 'Evet']);
    existingTed.push([t.ad, t.telefon, t.not, 0, 'Evet']);
    added.tedarikci++;
  }

  var existingFat = getDataRows(sheetFat);
  for (i = 0; i < faturalar.length; i++) {
    var f = faturalar[i];
    if (invoiceExists_(existingFat, f.faturaNo, f.tedarikci)) {
      continue;
    }
    sheetFat.appendRow([
      f.faturaNo, f.tarih, f.tedarikci, f.tutar, f.vade, f.durum, f.not,
      f.yontem, f.kullanici, f.onayDurum, '', ''
    ]);
    existingFat.push([
      f.faturaNo, f.tarih, f.tedarikci, f.tutar, f.vade, f.durum, f.not
    ]);
    added.fatura++;
  }

  var existingOde = getDataRows(sheetOde);
  for (i = 0; i < odemeler.length; i++) {
    var o = odemeler[i];
    if (paymentSampleExists_(existingOde, o)) {
      continue;
    }
    sheetOde.appendRow([
      o.tarih, o.tedarikci, o.tutar, o.yontem, o.faturaNo, o.not,
      o.kullanici, o.onayDurum, '', ''
    ]);
    existingOde.push([
      o.tarih, o.tedarikci, o.tutar, o.yontem, o.faturaNo, o.not
    ]);
    added.odeme++;
  }

  var existingGel = getDataRows(sheetGel);
  for (i = 0; i < gelirler.length; i++) {
    var g = gelirler[i];
    if (txExists_(existingGel, g.tarih, g.tutar, g.aciklama)) {
      continue;
    }
    sheetGel.appendRow([
      g.tarih, g.tutar, g.aciklama, g.kategori, g.kaynak, g.not, g.kullanici
    ]);
    existingGel.push([
      g.tarih, g.tutar, g.aciklama, g.kategori, g.kaynak, g.not
    ]);
    added.gelir++;
  }

  var existingGid = getDataRows(sheetGid);
  for (i = 0; i < giderler.length; i++) {
    var x = giderler[i];
    if (txExists_(existingGid, x.tarih, x.tutar, x.aciklama)) {
      continue;
    }
    sheetGid.appendRow([
      x.tarih, x.tutar, x.aciklama, x.kategori, x.not, x.kullanici
    ]);
    existingGid.push([
      x.tarih, x.tutar, x.aciklama, x.kategori, x.not
    ]);
    added.gider++;
  }

  // Örnek bekleyen onay (Vadeli ödeme)
  if (sheetOnay) {
    var existingOnay = getDataRows(sheetOnay);
    var onayId = 'ON-ORNEK-VADELI';
    if (!rowExistsByKey_(existingOnay, 0, onayId)) {
      sheetOnay.appendRow([
        onayId,
        'odeme',
        '',
        'Sercan Toprak',
        dSat,
        'Bekliyor',
        'Vadeli · Tekel Ambalaj · 200 (örnek)'
      ]);
      added.onay++;
    }
  }

  var bal = refreshSupplierBalances();
  var totalAdded =
    added.tedarikci + added.fatura + added.odeme + added.gelir +
    added.gider + added.kullanici + added.onay;

  var message =
    totalAdded === 0
      ? 'Örnek kayıtlar zaten vardı; yeni satır eklenmedi.\n' +
        (bal && bal.message ? bal.message : '')
      : [
          'Örnek test verisi yüklendi.',
          'Tedarikçi: ' + added.tedarikci,
          'Fatura: ' + added.fatura,
          'Ödeme: ' + added.odeme,
          'Gelir: ' + added.gelir,
          'Gider: ' + added.gider,
          'Kullanıcı (sheet, kod test only): ' + added.kullanici,
          'Onay: ' + added.onay,
          bal && bal.message ? bal.message : ''
        ].filter(Boolean).join('\n');

  alertSample_(message);
  return { ok: true, message: message, added: added };
}

/**
 * Kullanicilar sayfasına TEST_USERS satırları ekler (kod test only).
 * @param {Spreadsheet} ss
 * @param {Object} cfg
 * @return {number} eklenen satır
 */
function seedTestUsers_(ss, cfg) {
  var sheet = ss.getSheetByName(cfg.SHEETS.KULLANICILAR);
  if (!sheet) {
    return 0;
  }
  var existing = getDataRows(sheet);
  var users = cfg.TEST_USERS || [];
  var added = 0;
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var id = u.id;
    var found = false;
    for (var j = 0; j < existing.length; j++) {
      // Yeni şema: Id col0; eski: Ad col2
      if (normalizeKeyPart(existing[j][0]) === normalizeKeyPart(id) ||
          normalizeKeyPart(existing[j][2]) === normalizeKeyPart(u.ad) ||
          normalizeKeyPart(existing[j][3]) === normalizeKeyPart(u.ad)) {
        found = true;
        break;
      }
    }
    if (found) {
      continue;
    }
    var email = String(u.id || 'test') + '@example.com';
    // Kod sheet’e yazılır — test only
    sheet.appendRow([u.id, email, u.rol, u.ad, 'Evet', u.kod || '']);
    existing.push([u.id, email, u.rol, u.ad, 'Evet', u.kod || '']);
    added++;
  }
  return added;
}

/**
 * Eksik test sayfalarını sessizce oluşturur (Bootstrap başlıklarıyla).
 * @param {Spreadsheet} ss
 * @param {Object} cfg
 */
function ensureSampleSheets_(ss, cfg) {
  var defs = [
    { ad: cfg.SHEETS.GELIR, basliklar: cfg.HEADERS.GELIR },
    { ad: cfg.SHEETS.GIDER, basliklar: cfg.HEADERS.GIDER },
    { ad: cfg.SHEETS.TEDARIKCILER, basliklar: cfg.HEADERS.TEDARIKCILER },
    { ad: cfg.SHEETS.FATURALAR, basliklar: cfg.HEADERS.FATURALAR },
    { ad: cfg.SHEETS.ODEMELER, basliklar: cfg.HEADERS.ODEMELER },
    { ad: cfg.SHEETS.KULLANICILAR, basliklar: cfg.HEADERS.KULLANICILAR },
    { ad: cfg.SHEETS.ONAYLAR, basliklar: cfg.HEADERS.ONAYLAR },
    { ad: cfg.SHEETS.GIRIS_LOG, basliklar: cfg.HEADERS.GIRIS_LOG }
  ];
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    if (!d.ad || !d.basliklar) {
      continue;
    }
    if (ss.getSheetByName(d.ad)) {
      // Var olan sayfada başlığı sessizce yeniden yazma
      continue;
    }
    var sheet = ss.insertSheet(d.ad);
    sheet.getRange(1, 1, 1, d.basliklar.length).setValues([d.basliklar]);
    sheet.getRange(1, 1, 1, d.basliklar.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/**
 * @param {string} message
 */
function alertSample_(message) {
  try {
    SpreadsheetApp.getUi().alert(
      'Aqua Tekel — Örnek test verisi',
      message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    // UI yoksa (Web App) sessiz
  }
}

/**
 * @param {Array<Array<*>>} rows
 * @param {number} col
 * @param {*} value
 * @return {boolean}
 */
function rowExistsByKey_(rows, col, value) {
  var key = normalizeKeyPart(value);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeKeyPart(rows[i][col]) === key) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Array<Array<*>>} rows
 * @param {string} faturaNo
 * @param {string} tedarikci
 * @return {boolean}
 */
function invoiceExists_(rows, faturaNo, tedarikci) {
  var fn = normalizeKeyPart(faturaNo);
  var td = normalizeKeyPart(tedarikci);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeKeyPart(rows[i][0]) === fn &&
        normalizeKeyPart(rows[i][2]) === td) {
      return true;
    }
  }
  return false;
}

/**
 * Örnek ödemeyi tarih+tedarikçi+tutar+faturaNo ile tanır.
 * @param {Array<Array<*>>} rows
 * @param {Object} o
 * @return {boolean}
 */
function paymentSampleExists_(rows, o) {
  var t = normalizeKeyPart(o.tarih);
  var td = normalizeKeyPart(o.tedarikci);
  var tutar = parseTutar(o.tutar);
  var fn = normalizeKeyPart(o.faturaNo);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (normalizeKeyPart(r[0]) === t &&
        normalizeKeyPart(r[1]) === td &&
        parseTutar(r[2]) === tutar &&
        normalizeKeyPart(r[4]) === fn) {
      return true;
    }
  }
  return false;
}

/**
 * Gelir/gider dedup anahtarı: tarih + tutar + açıklama.
 * @param {Array<Array<*>>} rows
 * @param {*} tarih
 * @param {*} tutar
 * @param {*} aciklama
 * @return {boolean}
 */
function txExists_(rows, tarih, tutar, aciklama) {
  var t = normalizeKeyPart(tarih);
  var a = normalizeKeyPart(aciklama);
  var n = parseTutar(tutar);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (normalizeKeyPart(r[0]) === t &&
        parseTutar(r[1]) === n &&
        normalizeKeyPart(r[2]) === a) {
      return true;
    }
  }
  return false;
}
