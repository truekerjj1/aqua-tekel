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
 * Tutarı sayıya çevirir; geçersizse NaN.
 * @param {*} deger
 * @return {number}
 */
function parseTutar(deger) {
  if (typeof deger === 'number') {
    return deger;
  }
  if (deger === null || deger === undefined || deger === '') {
    return NaN;
  }
  var s = String(deger).replace(/\s/g, '').replace(',', '.');
  return Number(s);
}

/**
 * Tutarı doğrular: sayı ve > 0 olmalı.
 * @param {*} deger
 * @return {{ok: boolean, message: string, tutar: number}}
 */
function requirePositiveTutar(deger) {
  var tutar = parseTutar(deger);
  if (isNaN(tutar) || tutar <= 0) {
    return {
      ok: false,
      message: 'Tutar sıfırdan büyük bir sayı olmalı.',
      tutar: NaN
    };
  }
  return { ok: true, message: 'Tamam', tutar: tutar };
}

/**
 * Belge kilidi ile yazma (check + append yarışını azaltır).
 * Kilit alınamazsa Türkçe hata nesnesi döner.
 * @param {function(): *} fn
 * @return {*}
 */
function withDocumentLock(fn) {
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return {
      ok: false,
      message: 'Tablo meşgul; lütfen birkaç saniye sonra tekrar deneyin.'
    };
  }
  try {
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {
      // kilit zaten bırakılmış olabilir
    }
  }
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
  return {
    brand: cfg.BRAND_NAME,
    environmentLabel: cfg.ENVIRONMENT_LABEL,
    spreadsheetConfigured: isSpreadsheetConfigured(),
    usesActiveSpreadsheet: true,
    userEmail: getCurrentUserEmail(),
    role: role,
    canWrite: canWriteRecords(),
    message: 'Merhaba Aqua Tekel'
  };
}
