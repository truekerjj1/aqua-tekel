/**
 * Aqua Tekel — yardımcı fonksiyonlar (iskelet)
 */

/**
 * Basit Türkçe tarih metni (İstanbul).
 * @param {Date=} tarih
 * @return {string}
 */
function formatDateTr(tarih) {
  tarih = tarih || new Date();
  return Utilities.formatDate(tarih, 'Europe/Istanbul', 'dd.MM.yyyy');
}

/**
 * Güvenli metin (HTML için).
 * @param {*} deger
 * @return {string}
 */
function escapeHtml(deger) {
  if (deger === null || deger === undefined) {
    return '';
  }
  return String(deger)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Panel / istemci için özet bilgi (canlı sheet okumaz).
 * @return {Object}
 */
function getAppInfo() {
  var cfg = getConfig();
  return {
    brand: cfg.BRAND_NAME,
    environmentLabel: cfg.ENVIRONMENT_LABEL,
    spreadsheetConfigured: isSpreadsheetConfigured(),
    userEmail: getCurrentUserEmail(),
    role: getUserRole(),
    message: 'Merhaba Aqua Tekel'
  };
}
