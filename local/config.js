'use strict';

/** Localhost mock ayarları — Config.gs ile uyumlu; canlı ID yok. */
module.exports = {
  PORT: Number(process.env.PORT) || 8787,
  BRAND_NAME: 'AQUA TEKEL',
  BRAND_SUBTITLE: 'Cari işlem yönetimi',
  ENVIRONMENT_LABEL: 'LOCALHOST TEST — Canlı cariye işlenmez',
  DEKONT_MAX_BYTES: 5 * 1024 * 1024,
  ODEME_YONTEMLERI: ['Nakit', 'Kredi kartı', 'Vadeli'],
  ONAY_DURUM: {
    BEKLIYOR: 'Bekliyor',
    ONAYLANDI: 'Onaylandi',
    RED: 'Red'
  },
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
  TEST_USERS: [
    { id: 'test-yalcin', ad: 'Yalçın Özeke', rol: 'patron', kod: 'TEST1234', aktif: true },
    { id: 'test-sercan', ad: 'Sercan Toprak', rol: 'personel', kod: 'TEST2345', aktif: true },
    { id: 'test-aleyna', ad: 'Aleyna Toprak', rol: 'personel', kod: 'TEST3456', aktif: true },
    { id: 'test-fatih', ad: 'Fatih Toprak', rol: 'patron', kod: 'TEST4567', aktif: true }
  ],
  SESSION_COOKIE: 'aqua_tekel_local_session',
  SESSION_TTL_MS: 6 * 60 * 60 * 1000
};
