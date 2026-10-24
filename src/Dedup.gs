/**
 * Aqua Tekel — çift kayıt önleme (iskelet / stub)
 *
 * TODO: Aynı işlemin iki kez yazılmasını engelleyecek kurallar.
 */

/**
 * Kayıt daha önce eklenmiş mi? (stub)
 * @param {Object} kayit
 * @param {string} tur — 'gelir' | 'gider'
 * @return {boolean} true = çift kayıt şüphesi
 */
function isDuplicate(kayit, tur) {
  // TODO: Tarih + tutar + açıklama (veya hash) ile kontrol
  return false;
}

/**
 * Çift kayıt varsa uyarı / engelleme (stub).
 * @param {Object} kayit
 * @param {string} tur
 * @return {{ok: boolean, message: string, duplicate: boolean}}
 */
function checkDedup(kayit, tur) {
  if (isDuplicate(kayit, tur)) {
    return {
      ok: false,
      duplicate: true,
      message: 'Bu kayıt daha önce eklenmiş olabilir (çift kayıt kontrolü — stub).'
    };
  }
  return {
    ok: true,
    duplicate: false,
    message: 'Çift kayıt bulunamadı (iskelet).'
  };
}
