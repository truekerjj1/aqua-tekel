/**
 * Aqua Tekel — fatura işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 */

/**
 * Yeni fatura kaydı ekler.
 * @param {Object} kayit — {faturaNo, tarih, tedarikci, tutar, vade, durum, not}
 * @return {{ok: boolean, message: string, duplicate?: boolean}}
 */
function addInvoice(kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var faturaNo = String(kayit.faturaNo || '').trim();
  var tedarikci = String(kayit.tedarikci || '').trim();

  if (!faturaNo || !kayit.tarih || !tedarikci) {
    return {
      ok: false,
      message: 'Fatura için fatura no, tarih, tedarikçi ve tutar gerekli.'
    };
  }

  var tutarCheck = requirePositiveTutar(kayit.tutar);
  if (!tutarCheck.ok) {
    return { ok: false, message: tutarCheck.message };
  }
  var tutar = tutarCheck.tutar;

  var supplierErr = requireExistingSupplier(tedarikci);
  if (supplierErr) {
    return supplierErr;
  }

  return withDocumentLock(function () {
    var supplierErrLocked = requireExistingSupplier(tedarikci);
    if (supplierErrLocked) {
      return supplierErrLocked;
    }

    var dedup = checkDedup({
      faturaNo: faturaNo,
      tedarikci: tedarikci
    }, 'fatura');
    if (!dedup.ok) {
      return dedup;
    }

    var cfg = getConfig();
    var got = getSandboxSheet(cfg.SHEETS.FATURALAR);
    if (!got.ok) {
      return { ok: false, message: got.message };
    }

    got.sheet.appendRow([
      faturaNo,
      kayit.tarih,
      tedarikci,
      tutar,
      kayit.vade || '',
      kayit.durum || 'Açık',
      kayit.not || ''
    ]);

    refreshSupplierBalances(tedarikci);

    return { ok: true, message: 'Fatura kaydı eklendi.' };
  });
}

/**
 * Fatura listesini okur.
 * @param {Object=} filtre — {tedarikci, faturaNo} isteğe bağlı
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listInvoices(filtre) {
  filtre = filtre || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.FATURALAR);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var obj = {
      row: i + 2,
      faturaNo: r[0],
      tarih: r[1],
      tedarikci: r[2],
      tutar: r[3],
      vade: r[4],
      durum: r[5],
      not: r[6]
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
 * Fatura kaydını günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateInvoice(id, kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  return withDocumentLock(function () {
    var cfg = getConfig();
    var got = getSandboxSheet(cfg.SHEETS.FATURALAR);
    if (!got.ok) {
      return { ok: false, message: got.message };
    }

    if (rowNum > got.sheet.getLastRow()) {
      return { ok: false, message: 'Fatura satırı bulunamadı.' };
    }

    var existing = got.sheet.getRange(rowNum, 1, rowNum, 7).getValues()[0];
    var faturaNo = kayit.faturaNo !== undefined
      ? String(kayit.faturaNo).trim()
      : existing[0];
    var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[1];
    var tedarikci = kayit.tedarikci !== undefined
      ? String(kayit.tedarikci).trim()
      : existing[2];
    var tutarRaw = kayit.tutar !== undefined ? kayit.tutar : existing[3];
    var vade = kayit.vade !== undefined ? kayit.vade : existing[4];
    var durum = kayit.durum !== undefined ? kayit.durum : existing[5];
    var not = kayit.not !== undefined ? kayit.not : existing[6];

    if (!faturaNo || !tedarikci) {
      return { ok: false, message: 'Fatura no ve tedarikçi boş olamaz.' };
    }

    var tutarCheck = requirePositiveTutar(tutarRaw);
    if (!tutarCheck.ok) {
      return { ok: false, message: tutarCheck.message };
    }

    var supplierErr = requireExistingSupplier(tedarikci);
    if (supplierErr) {
      return supplierErr;
    }

    var dedup = checkDedup({
      faturaNo: faturaNo,
      tedarikci: tedarikci
    }, 'fatura', rowNum);
    if (!dedup.ok) {
      return dedup;
    }

    got.sheet.getRange(rowNum, 1, rowNum, 7).setValues([[
      faturaNo, tarih, tedarikci, tutarCheck.tutar, vade, durum, not
    ]]);

    refreshSupplierBalances(tedarikci);
    if (normalizeKeyPart(existing[2]) !== normalizeKeyPart(tedarikci)) {
      refreshSupplierBalances(existing[2]);
    }

    return { ok: true, message: 'Fatura kaydı güncellendi.' };
  });
}
