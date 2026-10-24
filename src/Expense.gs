/**
 * Aqua Tekel — gider işlemleri (iskelet / stub)
 *
 * TODO: Gider kaydı ve cari bağlantı sonra eklenecek.
 * Şimdilik canlı sheet'e yazma yok.
 */

/**
 * Yeni gider kaydı ekler (stub).
 * @param {Object} kayit — {tarih, tutar, aciklama, tedarikci, ...}
 * @return {{ok: boolean, message: string}}
 */
function addExpense(kayit) {
  // TODO: Gider sayfasına satır ekle
  return {
    ok: false,
    message: 'Henüz hazır değil (gider kaydı — stub).'
  };
}

/**
 * Gider listesini okur (stub).
 * @param {Object=} filtre
 * @return {Array}
 */
function listExpense(filtre) {
  // TODO: Gider sayfasından oku
  return [];
}

/**
 * Gider kaydını günceller (stub).
 * @param {string|number} id
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateExpense(id, kayit) {
  // TODO
  return {
    ok: false,
    message: 'Henüz hazır değil (gider güncelleme — stub).'
  };
}
