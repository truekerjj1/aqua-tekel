/**
 * Aqua Tekel — gelir işlemleri (sandbox CRUD)
 *
 * Aktif tabloya yazar: SpreadsheetApp.getActiveSpreadsheet().
 * YOUR_SPREADSHEET_ID zorunlu değildir; canlı ID kullanılmaz.
 */

/**
 * Yeni gelir kaydı ekler.
 * @param {Object} kayit — {tarih, tutar, aciklama, kategori, kaynak, not}
 * @return {{ok: boolean, message: string, duplicate?: boolean}}
 */
function addIncome(kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  if (!kayit.tarih || !kayit.aciklama) {
    return {
      ok: false,
      message: 'Gelir için tarih, tutar ve açıklama gerekli.'
    };
  }
  var tutarCheck = requirePositiveTutar(kayit.tutar);
  if (!tutarCheck.ok) {
    return { ok: false, message: tutarCheck.message };
  }
  var tutar = tutarCheck.tutar;

  return withDocumentLock(function () {
    var dedup = checkDedup(kayit, 'gelir');
    if (!dedup.ok) {
      return dedup;
    }

    var cfg = getConfig();
    var got = getSandboxSheet(cfg.SHEETS.GELIR);
    if (!got.ok) {
      return { ok: false, message: got.message };
    }

    got.sheet.appendRow([
      kayit.tarih,
      tutar,
      String(kayit.aciklama),
      kayit.kategori || '',
      kayit.kaynak || '',
      kayit.not || ''
    ]);

    return { ok: true, message: 'Gelir kaydı eklendi.' };
  });
}

/**
 * Gelir listesini okur.
 * @param {Object=} filtre — {kategori} isteğe bağlı
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listIncome(filtre) {
  filtre = filtre || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.GELIR);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var obj = {
      row: i + 2,
      tarih: r[0],
      tutar: r[1],
      aciklama: r[2],
      kategori: r[3],
      kaynak: r[4],
      not: r[5]
    };
    if (filtre.kategori && normalizeKeyPart(obj.kategori) !== normalizeKeyPart(filtre.kategori)) {
      continue;
    }
    rows.push(obj);
  }
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Gelir kaydını günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} kayit
 * @return {{ok: boolean, message: string}}
 */
function updateIncome(id, kayit) {
  var denied = denyUnlessWriter();
  if (denied) {
    return denied;
  }

  kayit = kayit || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  return withDocumentLock(function () {
    var cfg = getConfig();
    var got = getSandboxSheet(cfg.SHEETS.GELIR);
    if (!got.ok) {
      return { ok: false, message: got.message };
    }

    if (rowNum > got.sheet.getLastRow()) {
      return { ok: false, message: 'Gelir satırı bulunamadı.' };
    }

    var existing = got.sheet.getRange(rowNum, 1, rowNum, 6).getValues()[0];
    var tarih = kayit.tarih !== undefined ? kayit.tarih : existing[0];
    var tutarRaw = kayit.tutar !== undefined ? kayit.tutar : existing[1];
    var aciklama = kayit.aciklama !== undefined ? kayit.aciklama : existing[2];
    var kategori = kayit.kategori !== undefined ? kayit.kategori : existing[3];
    var kaynak = kayit.kaynak !== undefined ? kayit.kaynak : existing[4];
    var not = kayit.not !== undefined ? kayit.not : existing[5];

    var tutarCheck = requirePositiveTutar(tutarRaw);
    if (!tutarCheck.ok) {
      return { ok: false, message: tutarCheck.message };
    }

    var dedup = checkDedup({
      tarih: tarih,
      tutar: tutarCheck.tutar,
      aciklama: aciklama
    }, 'gelir', rowNum);
    if (!dedup.ok) {
      return dedup;
    }

    got.sheet.getRange(rowNum, 1, rowNum, 6).setValues([[
      tarih, tutarCheck.tutar, aciklama, kategori, kaynak, not
    ]]);

    return { ok: true, message: 'Gelir kaydı güncellendi.' };
  });
}
