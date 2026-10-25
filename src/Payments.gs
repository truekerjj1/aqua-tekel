/**
 * Aqua Tekel — ödeme işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 */

/**
 * Yeni ödeme kaydı ekler.
 * @param {Object} kayit — {tarih, tedarikci, tutar, yontem, faturaNo, not}
 * @return {{ok: boolean, message: string}}
 */
function addPayment(kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var tedarikci = String(kayit.tedarikci || '').trim();
  var tutar = parseTutar(kayit.tutar);

  if (!kayit.tarih || !tedarikci || isNaN(tutar)) {
    return {
      ok: false,
      message: 'Ödeme için tarih, tedarikçi ve tutar gerekli.'
    };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.ODEMELER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  got.sheet.appendRow([
    kayit.tarih,
    tedarikci,
    tutar,
    kayit.yontem || '',
    kayit.faturaNo || '',
    kayit.not || ''
  ]);

  refreshSupplierBalances(tedarikci);

  return { ok: true, message: 'Ödeme kaydı eklendi.' };
}

/**
 * Ödeme listesini okur.
 * @param {Object=} filtre — {tedarikci, faturaNo} isteğe bağlı
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listPayments(filtre) {
  filtre = filtre || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.ODEMELER);
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
      tedarikci: r[1],
      tutar: r[2],
      yontem: r[3],
      faturaNo: r[4],
      not: r[5]
    };
    if (filtre.tedarikci &&
        normalizeKeyPart(obj.tedarikci) !== normalizeKeyPart(filtre.tedarikci)) {
      continue;
    }
    if (filtre.faturaNo &&
        normalizeKeyPart(obj.faturaNo) !== normalizeKeyPart(filtre.faturaNo)) {
      continue;
    }
    rows.push(obj);
  }
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Ödeme kaydını günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updatePayment(id, kayit) {
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
  var got = getSandboxSheet(cfg.SHEETS.ODEMELER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  if (rowNum > got.sheet.getLastRow()) {
    return { ok: false, message: 'Ödeme satırı bulunamadı.' };
  }

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 6).getValues()[0];
  var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[0];
  var tedarikci = kayit.tedarikci !== undefined
    ? String(kayit.tedarikci).trim()
    : existing[1];
  var tutar = kayit.tutar !== undefined ? parseTutar(kayit.tutar) : existing[2];
  var yontem = kayit.yontem !== undefined ? kayit.yontem : existing[3];
  var faturaNo = kayit.faturaNo !== undefined ? kayit.faturaNo : existing[4];
  var not = kayit.not !== undefined ? kayit.not : existing[5];

  if (!tedarikci) {
    return { ok: false, message: 'Tedarikçi boş olamaz.' };
  }
  if (isNaN(parseTutar(tutar))) {
    return { ok: false, message: 'Geçersiz tutar.' };
  }

  got.sheet.getRange(rowNum, 1, rowNum, 6).setValues([[
    tarih, tedarikci, parseTutar(tutar), yontem, faturaNo, not
  ]]);

  refreshSupplierBalances(tedarikci);
  if (normalizeKeyPart(existing[1]) !== normalizeKeyPart(tedarikci)) {
    refreshSupplierBalances(existing[1]);
  }

  return { ok: true, message: 'Ödeme kaydı güncellendi.' };
}
