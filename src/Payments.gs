/**
 * Aqua Tekel — ödeme işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 *
 * Yöntem: Nakit | Kredi kartı | Vadeli
 * Nakit/KK → gerçek ödeme (borç azalır). Vadeli → kayıt; borç düşmez.
 */

/**
 * Yeni ödeme kaydı ekler.
 * @param {Object} kayit — {tarih, tedarikci, tutar, yontem, faturaNo, not, dekontFileId, dekontUrl}
 * @return {{ok: boolean, message: string, row?: number, onayDurum?: string}}
 */
function addPayment(kayit) {
  // Ödeme: patron veya personel — tedarikçiyi listeden seçer, kayıt oluşturmaz.
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var tedarikci = String(kayit.tedarikci || '').trim();
  var tutar = parseTutar(kayit.tutar);
  var yontem = normalizeOdemeYontemi(kayit.yontem);

  if (!kayit.tarih || !tedarikci || isNaN(tutar)) {
    return {
      ok: false,
      message: 'Ödeme için tarih, tedarikçi ve tutar gerekli.'
    };
  }

  var methods = getConfig().ODEME_YONTEMLERI || [];
  if (methods.length && methods.indexOf(yontem) < 0) {
    return {
      ok: false,
      message: 'Ödeme yöntemi: Nakit, Kredi kartı veya Vadeli seçin.'
    };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.ODEMELER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  var onayDurum = initialApprovalStatus_();
  var kullanici = currentActorLabel_();
  var dekontFileId = kayit.dekontFileId || '';
  var dekontUrl = kayit.dekontUrl || '';

  got.sheet.appendRow([
    kayit.tarih,
    tedarikci,
    tutar,
    yontem,
    kayit.faturaNo || '',
    kayit.not || '',
    kullanici,
    onayDurum,
    dekontFileId,
    dekontUrl
  ]);

  var rowNum = got.sheet.getLastRow();

  // Vadeli: borç düşmez (computeSupplierBalance zaten Vadeli’yi saymaz)
  refreshSupplierBalances(tedarikci);

  var ozet =
    yontem + ' · ' + tedarikci + ' · ' + tutar +
    (yontem === 'Vadeli' ? ' (vadeli — borç düşmez)' : '');
  createApproval('odeme', rowNum, ozet, onayDurum);

  var msg = 'Ödeme kaydı eklendi.';
  if (yontem === 'Vadeli') {
    msg += ' Vadeli: cari işlem kaydı; kalan borçtan düşülmez.';
  }
  if (onayDurum === cfg.ONAY_DURUM.BEKLIYOR) {
    msg += ' Onay bekliyor.';
  }

  return {
    ok: true,
    message: msg,
    row: rowNum,
    onayDurum: onayDurum
  };
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
      not: r[5],
      kullanici: r.length > 6 ? r[6] : '',
      onayDurum: r.length > 7 ? r[7] : '',
      dekontFileId: r.length > 8 ? r[8] : '',
      dekontUrl: r.length > 9 ? r[9] : ''
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

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 10).getValues()[0];
  var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[0];
  var tedarikci = kayit.tedarikci !== undefined
    ? String(kayit.tedarikci).trim()
    : existing[1];
  var tutar = kayit.tutar !== undefined ? parseTutar(kayit.tutar) : existing[2];
  var yontem = kayit.yontem !== undefined
    ? normalizeOdemeYontemi(kayit.yontem)
    : existing[3];
  var faturaNo = kayit.faturaNo !== undefined ? kayit.faturaNo : existing[4];
  var not = kayit.not !== undefined ? kayit.not : existing[5];
  var kullanici = kayit.kullanici !== undefined ? kayit.kullanici : existing[6];
  var onayDurum = kayit.onayDurum !== undefined ? kayit.onayDurum : existing[7];
  var dekontFileId = kayit.dekontFileId !== undefined
    ? kayit.dekontFileId
    : existing[8];
  var dekontUrl = kayit.dekontUrl !== undefined ? kayit.dekontUrl : existing[9];

  if (!tedarikci) {
    return { ok: false, message: 'Tedarikçi boş olamaz.' };
  }
  if (isNaN(parseTutar(tutar))) {
    return { ok: false, message: 'Geçersiz tutar.' };
  }

  got.sheet.getRange(rowNum, 1, rowNum, 10).setValues([[
    tarih, tedarikci, parseTutar(tutar), yontem, faturaNo, not,
    kullanici, onayDurum, dekontFileId, dekontUrl
  ]]);

  refreshSupplierBalances(tedarikci);
  if (normalizeKeyPart(existing[1]) !== normalizeKeyPart(tedarikci)) {
    refreshSupplierBalances(existing[1]);
  }

  return { ok: true, message: 'Ödeme kaydı güncellendi.' };
}
