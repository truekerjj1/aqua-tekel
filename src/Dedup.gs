/**
 * Aqua Tekel — çift kayıt kontrolü (sandbox)
 *
 * Gelir/Gider: Tarih + Tutar + Açıklama
 * Fatura: FaturaNo + Tedarikçi
 * Ödeme: Tarih + Tedarikçi + Tutar + FaturaNo (SampleData ile aynı)
 */

/**
 * Gelir/gider çift anahtarı.
 * @param {Object} kayit
 * @return {string}
 */
function buildTxDedupKey(kayit) {
  kayit = kayit || {};
  var tarih = normalizeKeyPart(kayit.tarih);
  var tutar = normalizeKeyPart(parseTutar(kayit.tutar));
  var aciklama = normalizeKeyPart(kayit.aciklama);
  return tarih + '|' + tutar + '|' + aciklama;
}

/**
 * Fatura çift anahtarı.
 * @param {Object} kayit
 * @return {string}
 */
function buildInvoiceDedupKey(kayit) {
  kayit = kayit || {};
  return normalizeKeyPart(kayit.faturaNo) + '|' + normalizeKeyPart(kayit.tedarikci);
}

/**
 * Ödeme çift anahtarı (tarih + tedarikçi + tutar + faturaNo).
 * @param {Object} kayit
 * @return {string}
 */
function buildPaymentDedupKey(kayit) {
  kayit = kayit || {};
  var tarih = normalizeKeyPart(kayit.tarih);
  var tedarikci = normalizeKeyPart(kayit.tedarikci);
  var tutar = normalizeKeyPart(parseTutar(kayit.tutar));
  var faturaNo = normalizeKeyPart(kayit.faturaNo);
  return tarih + '|' + tedarikci + '|' + tutar + '|' + faturaNo;
}

/**
 * Satırdan gelir/gider anahtarı (sütun: Tarih, Tutar, Açıklama = 0,1,2).
 * @param {Array<*>} row
 * @return {string}
 */
function rowTxDedupKey(row) {
  return buildTxDedupKey({
    tarih: row[0],
    tutar: row[1],
    aciklama: row[2]
  });
}

/**
 * Satırdan fatura anahtarı (FaturaNo=0, Tedarikçi=2).
 * @param {Array<*>} row
 * @return {string}
 */
function rowInvoiceDedupKey(row) {
  return buildInvoiceDedupKey({
    faturaNo: row[0],
    tedarikci: row[2]
  });
}

/**
 * Satırdan ödeme anahtarı (Tarih=0, Tedarikçi=1, Tutar=2, FaturaNo=4).
 * @param {Array<*>} row
 * @return {string}
 */
function rowPaymentDedupKey(row) {
  return buildPaymentDedupKey({
    tarih: row[0],
    tedarikci: row[1],
    tutar: row[2],
    faturaNo: row[4]
  });
}

/**
 * Boş / anlamsız dedup anahtarı mı?
 * @param {string} target
 * @param {string} tur
 * @return {boolean}
 */
function isEmptyDedupKey_(target, tur) {
  if (!target) {
    return true;
  }
  if (tur === 'odeme') {
    return target === '|||';
  }
  if (tur === 'fatura') {
    return target === '|';
  }
  return target === '||' || target === '|';
}

/**
 * Kayıt daha önce eklenmiş mi?
 * @param {Object} kayit
 * @param {string} tur — 'gelir' | 'gider' | 'fatura' | 'odeme'
 * @param {number=} excludeRow — güncellemede kendi satırını hariç tut (2+)
 * @return {boolean} true = çift kayıt şüphesi
 */
function isDuplicate(kayit, tur, excludeRow) {
  tur = String(tur || '').toLowerCase();
  var cfg = getConfig();
  var sheetName;
  var keyFn;
  var rowKeyFn;
  var skip = Number(excludeRow) || 0;

  if (tur === 'gelir') {
    sheetName = cfg.SHEETS.GELIR;
    keyFn = buildTxDedupKey;
    rowKeyFn = rowTxDedupKey;
  } else if (tur === 'gider') {
    sheetName = cfg.SHEETS.GIDER;
    keyFn = buildTxDedupKey;
    rowKeyFn = rowTxDedupKey;
  } else if (tur === 'fatura') {
    sheetName = cfg.SHEETS.FATURALAR;
    keyFn = buildInvoiceDedupKey;
    rowKeyFn = rowInvoiceDedupKey;
  } else if (tur === 'odeme') {
    sheetName = cfg.SHEETS.ODEMELER;
    keyFn = buildPaymentDedupKey;
    rowKeyFn = rowPaymentDedupKey;
  } else {
    return false;
  }

  var target = keyFn(kayit);
  if (isEmptyDedupKey_(target, tur)) {
    return false;
  }

  var got = getSandboxSheet(sheetName);
  if (!got.ok) {
    return false;
  }

  var rows = getDataRows(got.sheet);
  for (var i = 0; i < rows.length; i++) {
    var rowNum = i + 2;
    if (skip && rowNum === skip) {
      continue;
    }
    if (rowKeyFn(rows[i]) === target) {
      return true;
    }
  }
  return false;
}

/**
 * Çift kayıt varsa engelleme sonucu.
 * @param {Object} kayit
 * @param {string} tur
 * @param {number=} excludeRow
 * @return {{ok: boolean, message: string, duplicate: boolean}}
 */
function checkDedup(kayit, tur, excludeRow) {
  if (isDuplicate(kayit, tur, excludeRow)) {
    var tip = String(tur || '').toLowerCase();
    var msg;
    if (tip === 'fatura') {
      msg = 'Bu fatura daha önce eklenmiş olabilir (FaturaNo + Tedarikçi).';
    } else if (tip === 'odeme') {
      msg =
        'Bu ödeme daha önce eklenmiş olabilir (Tarih + Tedarikçi + Tutar + FaturaNo).';
    } else {
      msg = 'Bu kayıt daha önce eklenmiş olabilir (Tarih + Tutar + Açıklama).';
    }
    return {
      ok: false,
      duplicate: true,
      message: msg
    };
  }
  return {
    ok: true,
    duplicate: false,
    message: 'Çift kayıt bulunamadı.'
  };
}
