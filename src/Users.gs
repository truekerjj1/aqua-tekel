/**
 * Aqua Tekel — kullanıcı yönetimi (sandbox)
 *
 * Config.TEST_USERS + Kullanicilar sheet senkron.
 * Kod sütunu test only (düz metin OK). Canlı şifre değil.
 * requirePatron for admin APIs.
 */

/**
 * Sheet’ten kullanıcı satırlarını okur.
 * @return {Array<Object>}
 */
function readUsersFromSheet_() {
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.KULLANICILAR);
  if (!got.ok) {
    return [];
  }
  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    // Yeni şema: Id, E-posta, Rol, Ad, Aktif, Kod
    // Eski şema: E-posta, Rol, Ad, Aktif
    var hasId = r.length >= 5 && String(r[0] || '').indexOf('@') < 0;
    if (hasId || (r.length >= 6)) {
      var id = String(r[0] || '').trim();
      if (!id) continue;
      rows.push({
        row: i + 2,
        id: id,
        email: String(r[1] || '').trim(),
        rol: String(r[2] || '').trim() || 'personel',
        ad: String(r[3] || '').trim(),
        aktif: isActiveFlag_(r[4]),
        kod: String(r[5] || '').trim()
      });
    } else {
      // Eski 4 sütun
      var ad = String(r[2] || '').trim();
      if (!ad) continue;
      rows.push({
        row: i + 2,
        id: 'legacy-' + (i + 2),
        email: String(r[0] || '').trim(),
        rol: String(r[1] || '').trim() || 'personel',
        ad: ad,
        aktif: isActiveFlag_(r[3]),
        kod: ''
      });
    }
  }
  return rows;
}

/**
 * Aktif bayrağı.
 * @param {*} val
 * @return {boolean}
 */
function isActiveFlag_(val) {
  var s = String(val == null ? 'Evet' : val).trim().toLowerCase();
  if (!s || s === 'evet' || s === 'e' || s === 'true' || s === '1' || s === 'aktif') {
    return true;
  }
  return false;
}

/**
 * Config.TEST_USERS → sheet senkron (eksik satır ekler).
 * @return {{ok: boolean, message: string, added: number}}
 */
function syncUsersFromConfig() {
  var denied = denyUnlessManager();
  if (denied) {
    // Bootstrap/sample çağrıları oturumsuz olabilir — sessiz seed için ayrı path
  }
  return syncUsersFromConfigInternal_();
}

/**
 * @return {{ok: boolean, message: string, added: number}}
 */
function syncUsersFromConfigInternal_() {
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.KULLANICILAR);
  if (!got.ok) {
    return { ok: false, message: got.message, added: 0 };
  }
  var existing = readUsersFromSheet_();
  var byId = {};
  for (var i = 0; i < existing.length; i++) {
    byId[existing[i].id] = existing[i];
  }
  var users = cfg.TEST_USERS || [];
  var added = 0;
  for (var j = 0; j < users.length; j++) {
    var u = users[j];
    if (byId[u.id]) {
      continue;
    }
    var email = String(u.id || 'test') + '@example.com';
    // Kod sheet’e yazılır — test only
    got.sheet.appendRow([
      u.id,
      email,
      u.rol,
      u.ad,
      'Evet',
      u.kod || ''
    ]);
    added++;
  }
  return {
    ok: true,
    message: added ? (added + ' kullanıcı senkronlandı.') : 'Senkron tamam.',
    added: added
  };
}

/**
 * Giriş / Auth için kullanıcı bul (sheet + Config).
 * @param {string} userId
 * @return {Object|null}
 */
function findUserById(userId) {
  var id = String(userId || '').trim();
  if (!id) return null;

  var sheetUsers = readUsersFromSheet_();
  for (var i = 0; i < sheetUsers.length; i++) {
    if (sheetUsers[i].id === id) {
      if (!sheetUsers[i].aktif) {
        return null;
      }
      var su = sheetUsers[i];
      // Kod sheet’te yoksa Config’ten tamamla
      if (!su.kod) {
        var cfgU = findConfigUser_(id);
        if (cfgU) su.kod = cfgU.kod;
      }
      return {
        id: su.id,
        ad: su.ad,
        rol: su.rol,
        kod: su.kod,
        aktif: su.aktif,
        email: su.email
      };
    }
  }
  return findConfigUser_(id);
}

/**
 * @param {string} id
 * @return {Object|null}
 */
function findConfigUser_(id) {
  var list = getConfig().TEST_USERS || [];
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === id) {
      return {
        id: list[i].id,
        ad: list[i].ad,
        rol: list[i].rol,
        kod: list[i].kod,
        aktif: true,
        email: list[i].id + '@example.com'
      };
    }
  }
  return null;
}

/**
 * Aktif kullanıcı listesi (giriş — kod yok).
 * @return {{ok: boolean, message: string, users: Array<{id: string, ad: string}>}}
 */
function listActiveUsersForLogin() {
  syncUsersFromConfigInternal_();
  var sheetUsers = readUsersFromSheet_();
  var users = [];
  var seen = {};

  if (sheetUsers.length) {
    for (var i = 0; i < sheetUsers.length; i++) {
      var u = sheetUsers[i];
      if (!u.aktif || !u.id || seen[u.id]) continue;
      seen[u.id] = true;
      users.push({ id: u.id, ad: u.ad || u.id });
    }
  }

  if (!users.length) {
    var cfg = getConfig().TEST_USERS || [];
    for (var j = 0; j < cfg.length; j++) {
      users.push({ id: cfg[j].id, ad: cfg[j].ad });
    }
  }

  return { ok: true, message: 'Tamam', users: users };
}

/**
 * Yönetici: tüm kullanıcılar (kod maskeli değil — sandbox test only).
 * google.script.run → listUsersAdmin
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listUsersAdmin() {
  var denied = denyUnlessManager();
  if (denied) {
    return { ok: false, message: denied.message, rows: [] };
  }
  syncUsersFromConfigInternal_();
  var rows = readUsersFromSheet_();
  // İstemciye kod göster (test only — yorumda belirtilir)
  return { ok: true, message: 'Tamam (kodlar test only)', rows: rows };
}

/**
 * Kullanıcı ekle (patron).
 * @param {Object} kayit — {id, ad, rol, kod, email}
 * @return {{ok: boolean, message: string}}
 */
function addUserAdmin(kayit) {
  var denied = denyUnlessManager();
  if (denied) {
    return denied;
  }
  kayit = kayit || {};
  var id = String(kayit.id || '').trim();
  var ad = String(kayit.ad || '').trim();
  var rol = String(kayit.rol || 'personel').trim();
  var kod = String(kayit.kod || '').trim();
  if (!id || !ad || !kod) {
    return { ok: false, message: 'Id, ad ve erişim kodu gerekli (test only).' };
  }
  if (rol !== 'patron' && rol !== 'personel') {
    return { ok: false, message: 'Rol patron veya personel olmalı.' };
  }
  if (findUserById(id) || findConfigUser_(id)) {
    // Pasif sheet satırı olabilir
    var all = readUsersFromSheet_();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) {
        return { ok: false, message: 'Bu kullanıcı id zaten var: ' + id };
      }
    }
  }
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.KULLANICILAR);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }
  var email = String(kayit.email || (id + '@example.com')).trim();
  got.sheet.appendRow([id, email, rol, ad, 'Evet', kod]);
  return { ok: true, message: 'Kullanıcı eklendi (test only kod sheet’te).' };
}

/**
 * Kullanıcı güncelle (patron).
 * @param {string} userId
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateUserAdmin(userId, kayit) {
  var denied = denyUnlessManager();
  if (denied) {
    return denied;
  }
  kayit = kayit || {};
  var id = String(userId || '').trim();
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.KULLANICILAR);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }
  var rows = readUsersFromSheet_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue;
    var rowNum = rows[i].row;
    var ad = kayit.ad !== undefined ? String(kayit.ad).trim() : rows[i].ad;
    var rol = kayit.rol !== undefined ? String(kayit.rol).trim() : rows[i].rol;
    var email = kayit.email !== undefined ? String(kayit.email).trim() : rows[i].email;
    var aktif = kayit.aktif !== undefined
      ? (kayit.aktif ? 'Evet' : 'Hayır')
      : (rows[i].aktif ? 'Evet' : 'Hayır');
    var kod = kayit.kod !== undefined ? String(kayit.kod).trim() : rows[i].kod;
    if (!ad) {
      return { ok: false, message: 'Ad boş olamaz.' };
    }
    if (rol !== 'patron' && rol !== 'personel') {
      return { ok: false, message: 'Rol patron veya personel olmalı.' };
    }
    got.sheet.getRange(rowNum, 1, rowNum, 6).setValues([[
      id, email, rol, ad, aktif, kod
    ]]);
    return { ok: true, message: 'Kullanıcı güncellendi.' };
  }
  return { ok: false, message: 'Kullanıcı bulunamadı (önce senkron / örnek veri).' };
}

/**
 * Kullanıcıyı pasifleştir (soft delete).
 * @param {string} userId
 * @return {{ok: boolean, message: string}}
 */
function deactivateUserAdmin(userId) {
  return updateUserAdmin(userId, { aktif: false });
}
