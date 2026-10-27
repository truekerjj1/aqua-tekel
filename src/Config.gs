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

  /** Drive dekont klasör yolu (script’in bağlı Drive’ı). */
  DEKONT_FOLDER_PATH: ['Aqua Tekel TEST', 'Dekontlar'],

  /** Dekont yükleme üst sınırı (bayt) — UI ~5MB uyarısı. */
  DEKONT_MAX_BYTES: 5 * 1024 * 1024,

  // Sayfa (sekme) adları — sheets/SEMASI.md ile uyumlu
  SHEETS: {
    GELIR: 'Gelir',
    GIDER: 'Gider',
    TEDARIKCILER: 'Tedarikçiler',
    FATURALAR: 'Faturalar',
    ODEMELER: 'Odemeler',
    KULLANICILAR: 'Kullanicilar',
    ONAYLAR: 'Onaylar',
    GIRIS_LOG: 'GirisLog'
  },

  // Başlık satırları — Bootstrap.gs TEST_SAYFALARI ile aynı olmalı
  HEADERS: {
    GELIR: ['Tarih', 'Tutar', 'Açıklama', 'Kategori', 'Kaynak', 'Not', 'Kullanici'],
    // Gider tedarikçi kullanmaz — kategori seçimi (GIDER_KATEGORILERI)
    GIDER: ['Tarih', 'Tutar', 'Açıklama', 'Kategori', 'Not', 'Kullanici'],
    TEDARIKCILER: ['Ad', 'Telefon', 'Not', 'KalanBorc', 'Aktif'],
    FATURALAR: [
      'FaturaNo', 'Tarih', 'Tedarikçi', 'Tutar', 'Vade', 'Durum', 'Not',
      'Yöntem', 'Kullanici', 'OnayDurum', 'DekontFileId', 'DekontUrl'
    ],
    ODEMELER: [
      'Tarih', 'Tedarikçi', 'Tutar', 'Yöntem', 'FaturaNo', 'Not',
      'Kullanici', 'OnayDurum', 'DekontFileId', 'DekontUrl'
    ],
    // Kod sütunu test only — düz metin sandbox; üretime taşınmaz.
    KULLANICILAR: ['Id', 'E-posta', 'Rol', 'Ad', 'Aktif', 'Kod'],
    ONAYLAR: ['Id', 'Tip', 'RefId', 'Kullanici', 'Tarih', 'Durum', 'Ozet'],
    GIRIS_LOG: ['Tarih', 'Saat', 'UserId', 'Ad', 'Rol']
  },

  /**
   * Ödeme yöntemleri (fatura + ödeme formları).
   * Nakit / Kredi kartı → gerçek ödeme (borç azalır).
   * Vadeli → cari işlem kaydı; kalanBorc hesabında ödeme sayılmaz.
   */
  ODEME_YONTEMLERI: ['Nakit', 'Kredi kartı', 'Vadeli'],

  ONAY_DURUM: {
    BEKLIYOR: 'Bekliyor',
    ONAYLANDI: 'Onaylandi',
    RED: 'Red'
  },

  /**
   * Gider formu kategori seçenekleri (tedarikçi yok).
   * Panel select + SampleData ile uyumlu.
   */
  GIDER_KATEGORILERI: [
    'Yemek',
    'Mutfak',
    'Temizlik',
    'Market',
    'Muhasebe',
    'Kira',
    'Elektrik',
    'Su',
    'Diğer'
  ],

  /**
   * Yetki listeleri — örnek placeholder (gerçek hesap değil).
   * Eve dönünce kendi Google e-postalarınızla değiştirin.
   * Panel girişi için asıl kaynak: TEST_USERS + Kullanicilar sheet.
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
   * Örnek test: Fatih Toprak + TEST4567 (patron) · Sercan Toprak + TEST2345 (personel).
   * Kullanicilar sheet ile senkron (SampleData / Users.gs).
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

/**
 * Ödeme yöntemi normalize (karşılaştırma).
 * @param {*} yontem
 * @return {string}
 */
function normalizeOdemeYontemi(yontem) {
  var s = String(yontem || '').trim().toLowerCase();
  if (s === 'nakit') return 'Nakit';
  if (s === 'kredi kartı' || s === 'kredi karti' || s === 'kk' || s === 'kart') {
    return 'Kredi kartı';
  }
  if (s === 'vadeli') return 'Vadeli';
  return String(yontem || '').trim();
}

/**
 * Gerçek ödeme mi? (kalanBorc’tan düşülür)
 * Vadeli ödeme sayılmaz.
 * @param {*} yontem
 * @return {boolean}
 */
function isDebtReducingPayment(yontem) {
  var n = normalizeOdemeYontemi(yontem);
  return n === 'Nakit' || n === 'Kredi kartı';
}
