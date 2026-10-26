/**
 * Aqua Tekel — gider işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 * Gider tedarikçi kullanmaz — kategori (CONFIG.GIDER_KATEGORILERI).
 */

/**
 * Yeni gider kaydı ekler.
 * @param {Object} kayit — {tarih, tutar, aciklama, kategori, not}
 * @return {{ok: boolean, message: string, duplicate?: boolean}}
 */
function addExpense(kayit) {
  // Gider: patron veya personel (requirePersonelOrPatron).
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var tutar = parseTutar(kayit.tutar);
  if (!kayit.tarih || !kayit.aciklama || isNaN(tutar)) {
    return {
      ok: false,
      message: 'Gider için tarih, tutar ve açıklama gerekli.'
    };
  }

  var kategori = String(kayit.kategori || '').trim();
  if (!kategori) {
    return {
      ok: false,
      message: 'Gider için kategori seçin.'
    };
  }

  var dedup = checkDedup(kayit, 'gider');
  if (!dedup.ok) {
    return dedup;
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  // Sütunlar: Tarih, Tutar, Açıklama, Kategori, Not (tedarikçi yok)
  got.sheet.appendRow([
    kayit.tarih,
    tutar,
    String(kayit.aciklama),
    kategori,
    kayit.not || ''
  ]);

  return { ok: true, message: 'Gider kaydı eklendi.' };
}

/**
 * Gider listesini okur.
 * @param {Object=} filtre — {kategori} isteğe bağlı
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listExpense(filtre) {
  filtre = filtre || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    // Boş / placeholder satırları atla
    if (!String(r[0] || '').trim() && !String(r[2] || '').trim() &&
        (r[1] === '' || r[1] == null)) {
      continue;
    }
    var obj = {
      row: i + 2,
      tarih: r[0],
      tutar: r[1],
      aciklama: r[2],
      kategori: r[3],
      not: r[4]
    };
    if (filtre.kategori &&
        normalizeKeyPart(obj.kategori) !== normalizeKeyPart(filtre.kategori)) {
      continue;
    }
    rows.push(obj);
  }
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Gider kaydını günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateExpense(id, kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GIDER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  if (rowNum > got.sheet.getLastRow()) {
    return { ok: false, message: 'Gider satırı bulunamadı.' };
  }

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 5).getValues()[0];
  var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[0];
  var tutar = kayit.tutar !== undefined ? parseTutar(kayit.tutar) : existing[1];
  var aciklama = kayit.aciklama !== undefined ? kayit.aciklama : existing[2];
  var kategori = kayit.kategori !== undefined ? kayit.kategori : existing[3];
  var not = kayit.not !== undefined ? kayit.not : existing[4];

  if (isNaN(parseTutar(tutar))) {
    return { ok: false, message: 'Geçersiz tutar.' };
  }
  if (!String(kategori || '').trim()) {
    return { ok: false, message: 'Gider için kategori gerekli.' };
  }

  got.sheet.getRange(rowNum, 1, rowNum, 5).setValues([[
    tarih, parseTutar(tutar), aciklama, kategori, not
  ]]);

  return { ok: true, message: 'Gider kaydı güncellendi.' };
}

/**
 * Panel gider select için kategori listesi.
 * google.script.run → listExpenseCategories
 * @return {{ok: boolean, message: string, categories: Array<string>}}
 */
function listExpenseCategories() {
  var cfg = getConfig();
  var list = cfg.GIDER_KATEGORILERI || [];
  return {
    ok: true,
    message: 'Tamam',
    categories: list.slice()
  };
}
