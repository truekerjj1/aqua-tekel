/**
 * Aqua Tekel — yapılandırma (iskelet)
 *
 * ÖNEMLİ: Canlı muhasebe dosyasına bağlanmayın.
 * Spreadsheet ID'yi siz dolduracaksınız; şimdilik yer tutucu bırakılmıştır.
 */

var CONFIG = {
  // Yer tutucu — kendi test tablonuzun ID'sini buraya yazın (URL'deki /d/ ile /edit/ arası)
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

  // Test ortamı etiketi (panelde görünür)
  ENVIRONMENT_LABEL: 'Test ortamı',

  // Marka
  BRAND_NAME: 'Aqua Tekel',

  // Sayfa (sekme) adları — test sheet: "Aqua TEKEL TEST PROJESİ"
  SHEETS: {
    GELIR: 'Gelir',
    GIDER: 'Gider',
    TEDARIKCILER: 'Tedarikçiler',
    AYARLAR: 'Ayarlar'
  }
};

/**
 * Yapılandırmayı döndürür.
 * @return {Object}
 */
function getConfig() {
  return CONFIG;
}

/**
 * Spreadsheet ID yer tutucu mu, yoksa doldurulmuş mu?
 * (Canlı bağlantı yapmaz; yalnızca kontrol.)
 * @return {boolean}
 */
function isSpreadsheetConfigured() {
  return CONFIG.SPREADSHEET_ID &&
    CONFIG.SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID';
}
