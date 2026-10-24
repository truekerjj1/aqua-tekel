/**
 * Aqua Tekel — gelir işlemleri (iskelet / stub)
 *
 * TODO: Cari hesap motoru ve gelir kaydı burada yazılacak.
 * Şimdilik canlı sheet'e yazma yok.
 */

/**
 * Yeni gelir kaydı ekler (stub).
 * @param {Object} kayit — {tarih, tutar, aciklama, ...}
 * @return {{ok: boolean, message: string}}
 */
function addIncome(kayit) {
  // TODO: Gelir sayfasına satır ekle
  return {
    ok: false,
    message: 'Henüz hazır değil (gelir kaydı — stub).'
  };
}

/**
 * Gelir listesini okur (stub).
 * @param {Object=} filtre
 * @return {Array}
 */
function listIncome(filtre) {
  // TODO: Gelir sayfasından oku
  return [];
}

/**
 * Gelir kaydını günceller (stub).
 * @param {string|number} id
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateIncome(id, kayit) {
  // TODO
  return {
    ok: false,
    message: 'Henüz hazır değil (gelir güncelleme — stub).'
  };
}
