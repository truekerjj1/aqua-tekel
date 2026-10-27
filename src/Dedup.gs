/**
 * Aqua Tekel — çift kayıt kontrolü (sandbox)
 *
 * Gelir/Gider: Tarih + Tutar + Açıklama
 * Fatura: FaturaNo + Tedarikçi
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
 * Ödeme çift anahtarı (yalnız tam eşleşme; benzer işlemleri engellemez).
 * @param {Object} kayit
 * @return {string}
 */
function buildPaymentDedupKey(kayit) {
  kayit = kayit || {};
  return [
    normalizeKeyPart(kayit.tarih),
    normalizeKeyPart(kayit.tedarikci),
    normalizeKeyPart(parseTutar(kayit.tutar)),
    normalizeKeyPart(normalizeOdemeYontemi(kayit.yontem)),
    normalizeKeyPart(kayit.faturaNo)
  ].join('|');
}

/**
 * Satırdan ödeme anahtarı (Tarih, Tedarikçi, Tutar, Yöntem, FaturaNo).
 * @param {Array<*>} row
 * @return {string}
 */
function rowPaymentDedupKey(row) {
  return buildPaymentDedupKey({
    tarih: row[0],
    tedarikci: row[1],
    tutar: row[2],
    yontem: row[3],
    faturaNo: row[4]
  });
}

/**
 * Kayıt daha önce eklenmiş mi?
 * @param {Object} kayit
 * @param {string} tur — 'gelir' | 'gider' | 'fatura'
 * @return {boolean} true = çift kayıt şüphesi
 */
function isDuplicate(kayit, tur) {
  tur = String(tur || '').toLowerCase();
  var cfg = getConfig();
  var sheetName;
  var keyFn;
  var rowKeyFn;

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
  if (!target || target === '||' || target === '|') {
    return false;
  }

  var got = getSandboxSheet(sheetName);
  if (!got.ok) {
    return false;
  }

  var rows = getDataRows(got.sheet);
  for (var i = 0; i < rows.length; i++) {
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
 * @return {{ok: boolean, message: string, duplicate: boolean}}
 */
function checkDedup(kayit, tur) {
  if (isDuplicate(kayit, tur)) {
    var tip = String(tur || '').toLowerCase();
    var msg;
    if (tip === 'fatura') {
      msg =
        'Aynı fatura no + tedarikçi zaten var. Farklı bir fatura ise numarayı kontrol edin.';
    } else if (tip === 'odeme') {
      msg =
        'Aynı tarih + tedarikçi + tutar + yöntem + fatura no zaten var. ' +
        'Gerçekten ayrı bir ödeme ise not/tarihi ayırt edin.';
    } else {
      msg =
        'Aynı tarih + tutar + açıklama zaten var. Farklı bir işlemse açıklamayı ayırt edin.';
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
