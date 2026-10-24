/**
 * Aqua Tekel — yetki iskeleti (stub)
 *
 * Patron / personel rol kontrolü için imzalar.
 * Gerçek yetki kuralları sonra eklenecek.
 */

var ROLLER = {
  PATRON: 'patron',
  PERSONEL: 'personel',
  MISAFIR: 'misafir'
};

/**
 * Giriş yapan kullanıcının e-postasını alır.
 * @return {string}
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

/**
 * Kullanıcının rolünü döndürür (iskelet).
 * TODO: Ayarlar sayfasından veya sabit listeden rol okuma.
 * @param {string=} email
 * @return {string} ROLLER değerlerinden biri
 */
function getUserRole(email) {
  email = email || getCurrentUserEmail();
  // Stub: henüz rol tablosu yok — varsayılan misafir
  if (!email) {
    return ROLLER.MISAFIR;
  }
  // TODO: patron/personel listesini Config veya Ayarlar sayfasından oku
  return ROLLER.MISAFIR;
}

/**
 * Belirli bir rol için izin var mı?
 * TODO: İş kurallarına göre doldurulacak.
 * @param {string} requiredRole
 * @param {string=} email
 * @return {boolean}
 */
function hasRole(requiredRole, email) {
  var role = getUserRole(email);
  if (requiredRole === ROLLER.MISAFIR) {
    return true;
  }
  if (requiredRole === ROLLER.PERSONEL) {
    return role === ROLLER.PERSONEL || role === ROLLER.PATRON;
  }
  if (requiredRole === ROLLER.PATRON) {
    return role === ROLLER.PATRON;
  }
  return false;
}

/**
 * İşlem öncesi yetki kontrolü (iskelet).
 * Yetkisizse hata fırlatır veya false döner.
 * @param {string} requiredRole
 * @param {string=} email
 * @return {boolean}
 */
function requireRole(requiredRole, email) {
  if (!hasRole(requiredRole, email)) {
    // Stub: şimdilik sadece false; ileride kullanıcıya Türkçe mesaj gösterilecek
    return false;
  }
  return true;
}
