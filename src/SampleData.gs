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
function loadSampleTestData() {
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
    gider: 0
  };

  var tedarikciler = [
    { ad: 'Mavi Su Ltd', telefon: '0212 555 0101', not: 'Örnek tedarikçi' },
    { ad: 'Kaynak Dağıtım', telefon: '0216 555 0202', not: 'Örnek tedarikçi' },
    { ad: 'Tekel Ambalaj', telefon: '0312 555 0303', not: 'Örnek tedarikçi' }
  ];

  var faturalar = [
    {
      faturaNo: 'ORNEK-F001',
      tarih: '01.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 1500,
      vade: '15.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura'
    },
    {
      faturaNo: 'ORNEK-F002',
      tarih: '05.10.2026',
      tedarikci: 'Kaynak Dağıtım',
      tutar: 820,
      vade: '20.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura'
    },
    {
      faturaNo: 'ORNEK-F003',
      tarih: '10.10.2026',
      tedarikci: 'Tekel Ambalaj',
      tutar: 450,
      vade: '25.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura'
    }
  ];

  var odemeler = [
    {
      tarih: '08.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 500,
      yontem: 'Havale',
      faturaNo: 'ORNEK-F001',
      not: 'Örnek ödeme'
    },
    {
      tarih: '12.10.2026',
      tedarikci: 'Kaynak Dağıtım',
      tutar: 320,
      yontem: 'Nakit',
      faturaNo: 'ORNEK-F002',
      not: 'Örnek ödeme'
    }
  ];

  var gelirler = [
    {
      tarih: '03.10.2026',
      tutar: 2400,
      aciklama: 'Örnek satış — mağaza',
      kategori: 'Satış',
      kaynak: 'Nakit',
      not: 'Örnek gelir'
    },
    {
      tarih: '09.10.2026',
      tutar: 1100,
      aciklama: 'Örnek satış — kart',
      kategori: 'Satış',
      kaynak: 'Kart',
      not: 'Örnek gelir'
    },
    {
      tarih: '15.10.2026',
      tutar: 350,
      aciklama: 'Örnek diğer gelir',
      kategori: 'Diğer',
      kaynak: 'Havale',
      not: 'Örnek gelir'
    }
  ];

  var giderler = [
    {
      tarih: '04.10.2026',
      tutar: 200,
      aciklama: 'Örnek kira taksiti',
      tedarikci: '',
      kategori: 'Kira',
      not: 'Örnek gider'
    },
    {
      tarih: '11.10.2026',
      tutar: 180,
      aciklama: 'Örnek mal alımı',
      tedarikci: 'Tekel Ambalaj',
      kategori: 'Mal',
      not: 'Örnek gider'
    }
  ];

  var sheetTed = ss.getSheetByName(cfg.SHEETS.TEDARIKCILER);
  var sheetFat = ss.getSheetByName(cfg.SHEETS.FATURALAR);
  var sheetOde = ss.getSheetByName(cfg.SHEETS.ODEMELER);
  var sheetGel = ss.getSheetByName(cfg.SHEETS.GELIR);
  var sheetGid = ss.getSheetByName(cfg.SHEETS.GIDER);

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
    sheetTed.appendRow([t.ad, t.telefon, t.not, 0]);
    existingTed.push([t.ad, t.telefon, t.not, 0]);
    added.tedarikci++;
  }

  var existingFat = getDataRows(sheetFat);
  for (i = 0; i < faturalar.length; i++) {
    var f = faturalar[i];
    if (invoiceExists_(existingFat, f.faturaNo, f.tedarikci)) {
      continue;
    }
    sheetFat.appendRow([
      f.faturaNo, f.tarih, f.tedarikci, f.tutar, f.vade, f.durum, f.not
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
      o.tarih, o.tedarikci, o.tutar, o.yontem, o.faturaNo, o.not
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
      g.tarih, g.tutar, g.aciklama, g.kategori, g.kaynak, g.not
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
      x.tarih, x.tutar, x.aciklama, x.tedarikci, x.kategori, x.not
    ]);
    existingGid.push([
      x.tarih, x.tutar, x.aciklama, x.tedarikci, x.kategori, x.not
    ]);
    added.gider++;
  }

  var bal = refreshSupplierBalances();
  var totalAdded =
    added.tedarikci + added.fatura + added.odeme + added.gelir + added.gider;

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
          bal && bal.message ? bal.message : ''
        ].filter(Boolean).join('\n');

  alertSample_(message);
  return { ok: true, message: message, added: added };
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
    { ad: cfg.SHEETS.KULLANICILAR, basliklar: cfg.HEADERS.KULLANICILAR }
  ];
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    if (ss.getSheetByName(d.ad)) {
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
