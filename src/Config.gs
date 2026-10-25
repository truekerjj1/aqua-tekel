/**
 * Aqua Tekel — yapılandırma (sandbox)
 *
 * ÖNEMLİ: Canlı muhasebe dosyasına bağlanmayın.
 * CRUD ve Bootstrap aktif tabloyu kullanır (SpreadsheetApp.getActiveSpreadsheet).
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID uydurulmaz.
 */

var CONFIG = {
  // İsteğe bağlı yer tutucu — CRUD için gerekli değil (aktif tablo kullanılır).
  // Eve dönünce kendi test tablonuzun ID'sini yazabilirsiniz; canlı ID yazmayın.
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

  ENVIRONMENT_LABEL: 'Test ortamı',
  BRAND_NAME: 'Aqua Tekel',

  // Sayfa (sekme) adları — sheets/SEMASI.md ile uyumlu
  SHEETS: {
    GELIR: 'Gelir',
    GIDER: 'Gider',
    TEDARIKCILER: 'Tedarikçiler',
    FATURALAR: 'Faturalar',
    ODEMELER: 'Odemeler',
    KULLANICILAR: 'Kullanicilar'
  },

  // Başlık satırları — Bootstrap.gs TEST_SAYFALARI ile aynı olmalı
  HEADERS: {
    GELIR: ['Tarih', 'Tutar', 'Açıklama', 'Kategori', 'Kaynak', 'Not'],
    GIDER: ['Tarih', 'Tutar', 'Açıklama', 'Tedarikçi', 'Kategori', 'Not'],
    TEDARIKCILER: ['Ad', 'Telefon', 'Not', 'KalanBorc'],
    FATURALAR: ['FaturaNo', 'Tarih', 'Tedarikçi', 'Tutar', 'Vade', 'Durum', 'Not'],
    ODEMELER: ['Tarih', 'Tedarikçi', 'Tutar', 'Yöntem', 'FaturaNo', 'Not'],
    KULLANICILAR: ['E-posta', 'Rol', 'Ad', 'Aktif']
  },

  /**
   * Yetki listeleri — örnek placeholder (gerçek hesap değil).
   * Eve dönünce kendi Google e-postalarınızla değiştirin.
   */
  PATRON_EMAILS: [
    'patron@example.com'
  ],
  PERSONEL_EMAILS: [
    'personel@example.com'
  ]
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
 * (Canlı bağlantı yapmaz; yalnızca kontrol. CRUD için şart değil.)
 * @return {boolean}
 */
function isSpreadsheetConfigured() {
  return CONFIG.SPREADSHEET_ID &&
    CONFIG.SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID';
}
