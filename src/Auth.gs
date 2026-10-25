/**
 * Aqua Tekel — yetki (sandbox)
 *
 * Config.PATRON_EMAILS / Config.PERSONEL_EMAILS listelerini kullanır.
 * Örnek e-postalar placeholder’dır; gerçek hesap uydurulmaz.
 *
 * Patron: tam yazma
 * Personel: gelir / gider / tedarikçi yazabilir; silme / ayar yok
 * Misafir: salt okuma
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
 * E-postayı liste karşılaştırması için normalize eder.
 * @param {string} email
 * @return {string}
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * E-posta listede mi?
 * @param {string} email
 * @param {Array<string>} liste
 * @return {boolean}
 */
function emailInList(email, liste) {
  var n = normalizeEmail(email);
  if (!n || !liste || !liste.length) {
    return false;
  }
  for (var i = 0; i < liste.length; i++) {
    if (normalizeEmail(liste[i]) === n) {
      return true;
    }
  }
  return false;
}

/**
 * Kullanıcının rolünü döndürür (Config listeleri).
 * @param {string=} email
 * @return {string} ROLLER değerlerinden biri
 */
function getUserRole(email) {
  email = email || getCurrentUserEmail();
  if (!email) {
    return ROLLER.MISAFIR;
  }
  var cfg = getConfig();
  if (emailInList(email, cfg.PATRON_EMAILS)) {
    return ROLLER.PATRON;
  }
  if (emailInList(email, cfg.PERSONEL_EMAILS)) {
    return ROLLER.PERSONEL;
  }
  return ROLLER.MISAFIR;
}

/**
 * Belirli bir rol için izin var mı?
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
 * İşlem öncesi yetki kontrolü.
 * @param {string} requiredRole
 * @param {string=} email
 * @return {boolean}
 */
function requireRole(requiredRole, email) {
  return hasRole(requiredRole, email);
}

/**
 * Gelir / gider / tedarikçi yazabilir mi? (patron veya personel)
 * @param {string=} email
 * @return {boolean}
 */
function canWriteRecords(email) {
  return hasRole(ROLLER.PERSONEL, email);
}

/**
 * Silme / ayar gibi hassas işlemler yalnızca patron.
 * @param {string=} email
 * @return {boolean}
 */
function canManageSettings(email) {
  return hasRole(ROLLER.PATRON, email);
}

/**
 * Yazma yetkisi yoksa Türkçe sonuç nesnesi.
 * @return {{ok: boolean, message: string}|null} null = yetki var
 */
function denyUnlessWriter() {
  if (canWriteRecords()) {
    return null;
  }
  var role = getUserRole();
  if (role === ROLLER.MISAFIR) {
    return {
      ok: false,
      message:
        'Yazma yetkisi yok. Config içinde PATRON_EMAILS veya PERSONEL_EMAILS ' +
        'listesine kendi test e-postanızı ekleyin (örnek placeholder’ları değiştirin).'
    };
  }
  return {
    ok: false,
    message: 'Bu işlem için yazma yetkisi yok.'
  };
}
