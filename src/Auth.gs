/**
 * Aqua Tekel — yetki + panel oturumu (sandbox)
 *
 * Config.TEST_USERS ile giriş (kullanıcı seç + kişisel erişim kodu).
 * Config.PATRON_EMAILS / PERSONEL_EMAILS yedek (Google e-posta).
 *
 * Yetki matrisi (sunucu tarafı da zorunlu — yalnız UI gizleme yetmez):
 * | Özellik              | Patron | Personel |
 * |----------------------|--------|----------|
 * | Özet                 | evet   | evet     |
 * | Gelir ekle/liste     | evet   | evet     |
 * | Gider ekle/liste     | evet   | evet     |
 * | Ödeme ekle (dropdown)| evet   | evet     |
 * | Fatura ekle          | evet   | hayır (liste görüntüleyebilir) |
 * | Tedarikçi ekle/düzenle / sekme | evet | hayır |
 * | Ayarlar / kullanıcı  | evet   | hayır    |
 * | Çıkış                | evet   | evet     |
 *
 * requirePatron / requirePersonelOrPatron / deny* yardımcıları API’lerde kullanılır.
 * Erişim kodları test only — canlı şifre değildir.
 */

var ROLLER = {
  PATRON: 'patron',
  PERSONEL: 'personel',
  MISAFIR: 'misafir'
};

/** UserCache anahtarı — panel oturumu (test only). */
var SESSION_CACHE_KEY = 'AQUA_TEKEL_SESSION';
/** Oturum süresi: 6 saat */
var SESSION_TTL_SEC = 21600;

/**
 * Giriş yapan Google kullanıcısının e-postasını alır.
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
 * Panel oturumunu UserCache’ten okur.
 * @return {{id: string, ad: string, rol: string}|null}
 */
function getSessionUser_() {
  try {
    var cache = CacheService.getUserCache();
    var raw = cache.get(SESSION_CACHE_KEY);
    if (!raw) {
      return null;
    }
    var data = JSON.parse(raw);
    if (!data || !data.id || !data.rol) {
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Panel oturumunu yazar (test only).
 * @param {{id: string, ad: string, rol: string}} session
 */
function setSessionUser_(session) {
  var cache = CacheService.getUserCache();
  cache.put(SESSION_CACHE_KEY, JSON.stringify(session), SESSION_TTL_SEC);
}

/**
 * Panel oturumunu siler.
 */
function clearSessionUser_() {
  try {
    CacheService.getUserCache().remove(SESSION_CACHE_KEY);
  } catch (e) {
    // yok say
  }
}

/**
 * Config.TEST_USERS içinden id ile kullanıcı bulur.
 * @param {string} userId
 * @return {Object|null}
 */
function findTestUserById_(userId) {
  var list = getConfig().TEST_USERS || [];
  var id = String(userId || '').trim();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === id) {
      return list[i];
    }
  }
  return null;
}

/**
 * Giriş ekranı için kullanıcı listesi (kod yok).
 * google.script.run → listUsersForLogin
 * @return {{ok: boolean, message: string, users: Array<{id: string, ad: string}>}}
 */
function listUsersForLogin() {
  var list = getConfig().TEST_USERS || [];
  var users = [];
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    users.push({
      id: u.id,
      ad: u.ad
    });
  }
  return {
    ok: true,
    message: 'Tamam',
    users: users
  };
}

/**
 * Kullanıcı + kişisel erişim kodu ile giriş (sandbox).
 * google.script.run → login
 * @param {string} userId
 * @param {string} accessCode — test only
 * @return {{ok: boolean, message: string, session: Object|null}}
 */
function login(userId, accessCode) {
  var user = findTestUserById_(userId);
  if (!user) {
    return {
      ok: false,
      message: 'Kullanıcı seçin.',
      session: null
    };
  }
  var kod = String(accessCode || '').trim();
  // test only: düz metin karşılaştırma (canlı hash/şifre yok)
  if (!kod || kod !== String(user.kod || '')) {
    return {
      ok: false,
      message: 'Erişim kodu hatalı. Test kodunu kontrol edin (ör. TEST1234).',
      session: null
    };
  }
  var session = {
    id: user.id,
    ad: user.ad,
    rol: user.rol
  };
  setSessionUser_(session);
  return {
    ok: true,
    message: 'Giriş başarılı. Merhaba ' + user.ad + '.',
    session: buildPublicSession_(session)
  };
}

/**
 * Oturumu kapatır.
 * google.script.run → logout
 * @return {{ok: boolean, message: string}}
 */
function logout() {
  clearSessionUser_();
  return { ok: true, message: 'Çıkış yapıldı.' };
}

/**
 * İstemciye güvenli oturum özeti (kod yok) + yetki bayrakları.
 * @param {{id: string, ad: string, rol: string}} session
 * @return {Object}
 */
function buildPublicSession_(session) {
  var rol = session.rol || ROLLER.MISAFIR;
  var isPatron = rol === ROLLER.PATRON;
  var isStaff = rol === ROLLER.PERSONEL || isPatron;
  return {
    id: session.id,
    ad: session.ad,
    rol: rol,
    /** Günlük işlem: gelir / gider / ödeme */
    canWrite: isStaff,
    /** Tedarikçi ekle / düzenle / sekme — yalnız patron */
    canManageSuppliers: isPatron,
    /** Fatura ekle / düzenle — yalnız patron (personel listeleyebilir) */
    canManageInvoices: isPatron,
    /** Ayarlar / kullanıcı / silme — yalnız patron */
    canManage: isPatron
  };
}

/**
 * Mevcut panel oturumu (alias: session).
 * google.script.run → getSession / session
 * @return {{ok: boolean, loggedIn: boolean, session: Object|null, message: string}}
 */
function session() {
  return getSession();
}

/**
 * Mevcut panel oturumu.
 * @return {{ok: boolean, loggedIn: boolean, session: Object|null, message: string}}
 */
function getSession() {
  var sess = getSessionUser_();
  if (!sess) {
    return {
      ok: true,
      loggedIn: false,
      session: null,
      message: 'Oturum yok.'
    };
  }
  // Kullanıcı Config’ten silindiyse oturumu düşür
  var user = findTestUserById_(sess.id);
  if (!user) {
    clearSessionUser_();
    return {
      ok: true,
      loggedIn: false,
      session: null,
      message: 'Oturum geçersiz.'
    };
  }
  sess.ad = user.ad;
  sess.rol = user.rol;
  return {
    ok: true,
    loggedIn: true,
    session: buildPublicSession_(sess),
    message: 'Oturum açık.'
  };
}

/**
 * Kullanıcının rolünü döndürür: önce panel oturumu, yoksa e-posta listeleri.
 * @param {string=} email
 * @return {string} ROLLER değerlerinden biri
 */
function getUserRole(email) {
  var sess = getSessionUser_();
  if (sess && sess.rol) {
    if (sess.rol === ROLLER.PATRON ||
        sess.rol === ROLLER.PERSONEL ||
        sess.rol === ROLLER.MISAFIR) {
      return sess.rol;
    }
  }
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
 * İşlem öncesi yetki kontrolü (boolean).
 * @param {string} requiredRole
 * @param {string=} email
 * @return {boolean}
 */
function requireRole(requiredRole, email) {
  return hasRole(requiredRole, email);
}

/**
 * Yalnızca patron. API’lerde kullanın.
 * @param {string=} email
 * @return {boolean}
 */
function requirePatron(email) {
  return hasRole(ROLLER.PATRON, email);
}

/**
 * Personel veya patron (günlük işlemler).
 * @param {string=} email
 * @return {boolean}
 */
function requirePersonelOrPatron(email) {
  return hasRole(ROLLER.PERSONEL, email);
}

/**
 * Gelir / gider / ödeme yazabilir mi? (patron veya personel)
 * Tedarikçi / fatura yazma ayrı — canManageSuppliers / canManageInvoices.
 * @param {string=} email
 * @return {boolean}
 */
function canWriteRecords(email) {
  return requirePersonelOrPatron(email);
}

/**
 * Tedarikçi ekle / düzenle — yalnız patron.
 * @param {string=} email
 * @return {boolean}
 */
function canManageSuppliers(email) {
  return requirePatron(email);
}

/**
 * Fatura ekle / düzenle — yalnız patron.
 * @param {string=} email
 * @return {boolean}
 */
function canManageInvoices(email) {
  return requirePatron(email);
}

/**
 * Silme / ayar gibi hassas işlemler yalnızca patron.
 * @param {string=} email
 * @return {boolean}
 */
function canManageSettings(email) {
  return requirePatron(email);
}

/**
 * Yazma yetkisi yoksa Türkçe sonuç nesnesi (gelir/gider/ödeme).
 * @return {{ok: boolean, message: string}|null} null = yetki var
 */
function denyUnlessWriter() {
  if (requirePersonelOrPatron()) {
    return null;
  }
  var role = getUserRole();
  if (role === ROLLER.MISAFIR) {
    return {
      ok: false,
      message:
        'Yazma yetkisi yok. Önce panelden kullanıcı seçip test erişim kodu ile giriş yapın.'
    };
  }
  return {
    ok: false,
    message: 'Bu işlem için yazma yetkisi yok.'
  };
}

/**
 * Tedarikçi ekleme / düzenleme — yalnız patron (sunucu tarafı).
 * @return {{ok: boolean, message: string}|null} null = yetki var
 */
function denyUnlessSupplierManager() {
  if (requirePatron()) {
    return null;
  }
  var role = getUserRole();
  if (role === ROLLER.MISAFIR) {
    return {
      ok: false,
      message:
        'Tedarikçi yönetimi için giriş yapın. Tedarikçiyi yalnız patron ekler / düzenler.'
    };
  }
  return {
    ok: false,
    message:
      'Tedarikçi ekleme / düzenleme yalnız patron içindir. Personel ödeme yapabilir ama tedarikçi kaydı oluşturamaz.'
  };
}

/**
 * Fatura ekleme / düzenleme — yalnız patron.
 * @return {{ok: boolean, message: string}|null} null = yetki var
 */
function denyUnlessInvoiceManager() {
  if (requirePatron()) {
    return null;
  }
  var role = getUserRole();
  if (role === ROLLER.MISAFIR) {
    return {
      ok: false,
      message: 'Fatura eklemek için giriş yapın. Faturaları yalnız patron ekler.'
    };
  }
  return {
    ok: false,
    message: 'Fatura ekleme / düzenleme yalnız patron içindir. Personel faturaları görüntüleyebilir.'
  };
}

/**
 * Silme / ayar yalnızca patron.
 * @return {{ok: boolean, message: string}|null} null = yetki var
 */
function denyUnlessManager() {
  if (requirePatron()) {
    return null;
  }
  return {
    ok: false,
    message: 'Bu işlem yalnızca patron içindir. Personelde ayar / kullanıcı yönetimi yok.'
  };
}
