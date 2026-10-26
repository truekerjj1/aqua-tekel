/**
 * Aqua Tekel — gider işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 */

/**
 * Yeni gider kaydı ekler.
 * @param {Object} kayit — {tarih, tutar, aciklama, tedarikci, kategori, not}
 * @return {{ok: boolean, message: string, duplicate?: boolean}}
 */
function addExpense(kayit) {
  // Gider: patron veya personel (requirePersonelOrPatron).
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var tutar = parseTutar(kayit.tutar);
  if (!kayit.tarih || !kayit.aciklama || isNaN(tutar)) {
    return {
      ok: false,
      message: 'Gider için tarih, tutar ve açıklama gerekli.'
    };
  }

  var dedup = checkDedup(kayit, 'gider');
  if (!dedup.ok) {
    return dedup;
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  got.sheet.appendRow([
    kayit.tarih,
    tutar,
    String(kayit.aciklama),
    kayit.tedarikci || '',
    kayit.kategori || '',
    kayit.not || ''
  ]);

  return { ok: true, message: 'Gider kaydı eklendi.' };
}

/**
 * Gider listesini okur.
 * @param {Object=} filtre — {tedarikci, kategori} isteğe bağlı
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listExpense(filtre) {
  filtre = filtre || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var obj = {
      row: i + 2,
      tarih: r[0],
      tutar: r[1],
      aciklama: r[2],
      tedarikci: r[3],
      kategori: r[4],
      not: r[5]
    };
    if (filtre.tedarikci &&
        normalizeKeyPart(obj.tedarikci) !== normalizeKeyPart(filtre.tedarikci)) {
      continue;
    }
    if (filtre.kategori &&
        normalizeKeyPart(obj.kategori) !== normalizeKeyPart(filtre.kategori)) {
      continue;
    }
    rows.push(obj);
  }
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Gider kaydını günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateExpense(id, kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  if (rowNum > got.sheet.getLastRow()) {
    return { ok: false, message: 'Gider satırı bulunamadı.' };
  }

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 6).getValues()[0];
  var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[0];
  var tutar = kayit.tutar !== undefined ? parseTutar(kayit.tutar) : existing[1];
  var aciklama = kayit.aciklama !== undefined ? kayit.aciklama : existing[2];
  var tedarikci = kayit.tedarikci !== undefined ? kayit.tedarikci : existing[3];
  var kategori = kayit.kategori !== undefined ? kayit.kategori : existing[4];
  var not = kayit.not !== undefined ? kayit.not : existing[5];

  if (isNaN(parseTutar(tutar))) {
    return { ok: false, message: 'Geçersiz tutar.' };
  }

  got.sheet.getRange(rowNum, 1, rowNum, 6).setValues([[
    tarih, parseTutar(tutar), aciklama, tedarikci, kategori, not
  ]]);

  return { ok: true, message: 'Gider kaydı güncellendi.' };
}
