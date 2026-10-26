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

  ENVIRONMENT_LABEL: 'TEST MODU - Canlı cariye işlenmez',
  BRAND_NAME: 'AQUA TEKEL',
  BRAND_SUBTITLE: 'Cari işlem yönetimi',

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
    // Kod sütunu sheet’te tutulmaz; erişim kodları yalnızca CONFIG.TEST_USERS (test only).
    KULLANICILAR: ['E-posta', 'Rol', 'Ad', 'Aktif']
  },

  /**
   * Yetki listeleri — örnek placeholder (gerçek hesap değil).
   * Eve dönünce kendi Google e-postalarınızla değiştirin.
   * Panel girişi için asıl kaynak: TEST_USERS (aşağıda).
   */
  PATRON_EMAILS: [
    'patron@example.com'
  ],
  PERSONEL_EMAILS: [
    'personel@example.com'
  ],

  /**
   * Sandbox panel kullanıcıları + kişisel erişim kodları.
   * test only — canlı şifre / gerçek erişim kodu değil; uydurma canlı kod yok.
   * Kodlar düz metin (sandbox kolaylığı); üretime taşınmaz.
   */
  TEST_USERS: [
    { id: 'test-yalcin', ad: 'Yalçın Özeke', rol: 'patron', kod: 'TEST1234' },
    { id: 'test-sercan', ad: 'Sercan Toprak', rol: 'personel', kod: 'TEST2345' },
    { id: 'test-aleyna', ad: 'Aleyna Toprak', rol: 'personel', kod: 'TEST3456' },
    { id: 'test-fatih', ad: 'Fatih Toprak', rol: 'patron', kod: 'TEST4567' }
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
