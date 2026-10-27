/**
 * Aqua Tekel — yardımcı fonksiyonlar (sandbox)
 */

/**
 * Basit Türkçe tarih metni (İstanbul).
 * @param {Date=} tarih
 * @return {string}
 */
function formatDateTr(tarih) {
  tarih = tarih || new Date();
  return Utilities.formatDate(tarih, 'Europe/Istanbul', 'dd.MM.yyyy');
}

/**
 * Güvenli metin (HTML için).
 * @param {*} deger
 * @return {string}
 */
function escapeHtml(deger) {
  if (deger === null || deger === undefined) {
    return '';
  }
  return String(deger)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Metni karşılaştırma için normalize eder.
 * @param {*} deger
 * @return {string}
 */
function normalizeKeyPart(deger) {
  if (deger === null || deger === undefined) {
    return '';
  }
  if (Object.prototype.toString.call(deger) === '[object Date]') {
    return formatDateTr(deger);
  }
  return String(deger).replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Tutarı sayıya çevirir; geçersizse NaN (sessiz 0 yok).
 * TR: 1.234,56 · 1234,56 · US: 1,234.56 · düz: 1234.5
 * @param {*} deger
 * @return {number}
 */
function parseTutar(deger) {
  if (typeof deger === 'number') {
    return isFinite(deger) ? deger : NaN;
  }
  if (deger === null || deger === undefined || deger === '') {
    return NaN;
  }
  var s = String(deger)
    .replace(/\s/g, '')
    .replace(/₺/g, '')
    .replace(/TL/gi, '');
  if (!s || s === '-' || s === '.' || s === ',') {
    return NaN;
  }
  var lastComma = s.lastIndexOf(',');
  var lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    var afterC = s.length - lastComma - 1;
    if (afterC <= 0) return NaN;
    if (afterC <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    return NaN;
  }
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}

/**
 * Tutarı TR gösterim metnine çevirir.
 * @param {number} n
 * @return {string}
 */
function formatTutarTr(n) {
  if (n == null || isNaN(Number(n))) {
    return '—';
  }
  return (Math.round(Number(n) * 100) / 100).toLocaleString('tr-TR');
}

/**
 * Script kilidi ile kritik yazma (çift tıklama / eşzamanlı).
 * @param {function(): Object} fn
 * @return {Object}
 */
function withScriptLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return {
      ok: false,
      message: 'Sistem meşgul. Lütfen birkaç saniye sonra tekrar deneyin.'
    };
  }
  try {
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {
      // yok say
    }
  }
}

/**
 * Dekont URL’sini güvenli tut (yalnız http(s) veya /uploads/).
 * @param {*} url
 * @return {string}
 */
function sanitizeDekontUrl(url) {
  var u = String(url == null ? '' : url).trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf('/uploads/') === 0) return u;
  return '';
}

/**
 * Aktif (bağlı) test tablosunu alır. Canlı ID kullanmaz.
 * @return {Spreadsheet|null}
 */
function getActiveSandboxSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

/**
 * Aktif tabloda sayfa alır. Yoksa Türkçe hata nesnesi döner.
 * @param {string} sheetName
 * @return {{ok: boolean, sheet: Sheet|null, message: string, ss: Spreadsheet|null}}
 */
function getSandboxSheet(sheetName) {
  var ss = getActiveSandboxSpreadsheet();
  if (!ss) {
    return {
      ok: false,
      sheet: null,
      ss: null,
      message:
        'Tablo bulunamadı. Script’i “Aqua TEKEL TEST PROJESİ” tablosundan ' +
        'Uzantılar → Apps Script ile açın. Canlı muhasebe tablosunu kullanmayın.'
    };
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return {
      ok: false,
      sheet: null,
      ss: ss,
      message:
        '“' + sheetName + '” sayfası yok. Tabloda menü: Aqua Tekel (Test) → ' +
        'Test sayfalarını kur. (YOUR_SPREADSHEET_ID gerekmez.)'
    };
  }
  return { ok: true, sheet: sheet, ss: ss, message: 'Tamam' };
}

/**
 * Sayfadaki veri satırlarını (başlık hariç) dizi olarak okur.
 * @param {Sheet} sheet
 * @return {Array<Array<*>>}
 */
function getDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow, lastCol).getValues();
}

/**
 * Panel / istemci için özet bilgi.
 * @return {Object}
 */
function getAppInfo() {
  var cfg = getConfig();
  var role = getUserRole();
  var sess = getSession();
  var displayName = (sess && sess.session && sess.session.ad) || '';
  var greet = displayName
    ? ('Merhaba ' + displayName)
    : ('Merhaba ' + (cfg.BRAND_NAME || 'Aqua Tekel'));
  return {
    brand: cfg.BRAND_NAME,
    brandSubtitle: cfg.BRAND_SUBTITLE || 'Cari işlem yönetimi',
    environmentLabel: cfg.ENVIRONMENT_LABEL,
    spreadsheetConfigured: isSpreadsheetConfigured(),
    usesActiveSpreadsheet: true,
    userEmail: getCurrentUserEmail(),
    userName: displayName,
    role: role,
    canWrite: canWriteRecords(),
    canManageSuppliers: canManageSuppliers(),
    canManageInvoices: canManageInvoices(),
    canManage: canManageSettings(),
    loggedIn: !!(sess && sess.loggedIn),
    session: (sess && sess.session) || null,
    message: greet
  };
}
