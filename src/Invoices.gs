/**
 * Aqua Tekel — fatura işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 * Ödeme yöntemi alanı: Nakit | Kredi kartı | Vadeli.
 */

/**
 * Yeni fatura kaydı ekler.
 * @param {Object} kayit — {faturaNo, tarih, tedarikci, tutar, vade, durum, not, yontem, dekontFileId, dekontUrl}
 * @return {{ok: boolean, message: string, duplicate?: boolean, row?: number}}
 */
function addInvoice(kayit) {
  return withScriptLock_(function () {
    // Fatura ekleme: patron veya personel (tedarikçi ekleme hâlâ yalnız patron).
    var denied = denyUnlessInvoiceManager();
    if (denied) {
      return denied;
    }

    kayit = kayit || {};
    var faturaNo = String(kayit.faturaNo || '').trim();
    var tedarikci = String(kayit.tedarikci || '').trim();
    var tutar = parseTutar(kayit.tutar);
    var yontem = normalizeOdemeYontemi(kayit.yontem || '');

    if (!faturaNo || !kayit.tarih || !tedarikci || isNaN(tutar)) {
      return {
        ok: false,
        message: 'Fatura için fatura no, tarih, tedarikçi ve tutar gerekli.'
      };
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

    var onayDurum = initialApprovalStatus_();
    var kullanici = currentActorLabel_();

    got.sheet.appendRow([
      faturaNo,
      kayit.tarih,
      tedarikci,
      tutar,
      kayit.vade || '',
      kayit.durum || 'Açık',
      kayit.not || '',
      yontem,
      kullanici,
      onayDurum,
      kayit.dekontFileId || '',
      sanitizeDekontUrl(kayit.dekontUrl)
    ]);

    var rowNum = got.sheet.getLastRow();
    refreshSupplierBalances(tedarikci);

    createApproval(
      'fatura',
      rowNum,
      faturaNo + ' · ' + tedarikci + ' · ' + tutar +
        (yontem ? ' · ' + yontem : ''),
      onayDurum
    );

    var msg = 'Fatura kaydı eklendi.';
    if (onayDurum === cfg.ONAY_DURUM.BEKLIYOR) {
      msg += ' Onay bekliyor.';
    }

    return { ok: true, message: msg, row: rowNum, onayDurum: onayDurum };
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
      not: r[6],
      yontem: r.length > 7 ? r[7] : '',
      kullanici: r.length > 8 ? r[8] : '',
      onayDurum: r.length > 9 ? r[9] : '',
      dekontFileId: r.length > 10 ? r[10] : '',
      dekontUrl: r.length > 11 ? r[11] : ''
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
  // Fatura düzenleme: patron veya personel.
  var denied = denyUnlessInvoiceManager();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.FATURALAR);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  if (rowNum > got.sheet.getLastRow()) {
    return { ok: false, message: 'Fatura satırı bulunamadı.' };
  }

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 12).getValues()[0];
  var faturaNo = kayit.faturaNo !== undefined
    ? String(kayit.faturaNo).trim()
    : existing[0];
  var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[1];
  var tedarikci = kayit.tedarikci !== undefined
    ? String(kayit.tedarikci).trim()
    : existing[2];
  var tutar = kayit.tutar !== undefined ? parseTutar(kayit.tutar) : existing[3];
  var vade = kayit.vade !== undefined ? kayit.vade : existing[4];
  var durum = kayit.durum !== undefined ? kayit.durum : existing[5];
  var not = kayit.not !== undefined ? kayit.not : existing[6];
  var yontem = kayit.yontem !== undefined
    ? normalizeOdemeYontemi(kayit.yontem)
    : existing[7];
  var kullanici = existing[8];
  var onayDurum = existing[9];
  if (kayit.onayDurum !== undefined && requirePatron()) {
    onayDurum = kayit.onayDurum;
  }
  var dekontFileId = kayit.dekontFileId !== undefined
    ? kayit.dekontFileId
    : existing[10];
  var dekontUrl = kayit.dekontUrl !== undefined
    ? sanitizeDekontUrl(kayit.dekontUrl)
    : existing[11];

  if (!faturaNo || !tedarikci) {
    return { ok: false, message: 'Fatura no ve tedarikçi boş olamaz.' };
  }
  if (isNaN(parseTutar(tutar))) {
    return { ok: false, message: 'Geçersiz tutar.' };
  }

  got.sheet.getRange(rowNum, 1, rowNum, 12).setValues([[
    faturaNo, tarih, tedarikci, parseTutar(tutar), vade, durum, not,
    yontem, kullanici, onayDurum, dekontFileId, dekontUrl
  ]]);

  refreshSupplierBalances(tedarikci);
  if (normalizeKeyPart(existing[2]) !== normalizeKeyPart(tedarikci)) {
    refreshSupplierBalances(existing[2]);
  }

  return { ok: true, message: 'Fatura kaydı güncellendi.' };
}
