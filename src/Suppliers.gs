/**
 * Aqua Tekel — tedarikçiler (sandbox CRUD)
 *
 * Aktif tabloya yazar. KalanBorc (Bakiye) = Faturalar − Odemeler (aynı Ad).
 * Vadeli ödemeler borç düşümünde sayılmaz (isDebtReducingPayment).
 * Soft delete: Aktif=Hayır. YOUR_SPREADSHEET_ID zorunlu değildir.
 */

/**
 * Tedarikçi için kalan borç hesaplar.
 * Faturalar tutar − (Nakit/KK ödemeler). Vadeli ödemeler hariç.
 * @param {string} ad
 * @param {Spreadsheet} ss
 * @return {number}
 */
function computeSupplierBalance(ad, ss) {
  var cfg = getConfig();
  var key = normalizeKeyPart(ad);
  var faturalar = ss.getSheetByName(cfg.SHEETS.FATURALAR);
  var odemeler = ss.getSheetByName(cfg.SHEETS.ODEMELER);
  var borc = 0;
  var odenen = 0;
  var i;
  var r;

  if (faturalar) {
    var fRows = getDataRows(faturalar);
    for (i = 0; i < fRows.length; i++) {
      r = fRows[i];
      // FaturaNo, Tarih, Tedarikçi, Tutar, ...
      if (normalizeKeyPart(r[2]) === key) {
        var ft = parseTutar(r[3]);
        if (!isNaN(ft)) {
          borc += ft;
        }
      }
    }
  }

  if (odemeler) {
    var oRows = getDataRows(odemeler);
    for (i = 0; i < oRows.length; i++) {
      r = oRows[i];
      // Tarih, Tedarikçi, Tutar, Yöntem, ...
      if (normalizeKeyPart(r[1]) === key) {
        // Vadeli → ödeme sayma (borç düşmez)
        if (!isDebtReducingPayment(r[3])) {
          continue;
        }
        var ot = parseTutar(r[2]);
        if (!isNaN(ot)) {
          odenen += ot;
        }
      }
    }
  }

  return borc - odenen;
}

/**
 * Tedarikçiler sayfasındaki KalanBorc (bakiye) sütununu günceller.
 * ad verilirse yalnız o tedarikçi; yoksa tüm satırlar.
 * @param {string=} ad — isteğe bağlı tedarikçi adı
 * @return {{ok: boolean, message: string, updated: number}}
 */
function refreshSupplierBalances(ad) {
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.TEDARIKCILER);
  if (!got.ok) {
    return { ok: false, message: got.message, updated: 0 };
  }

  var data = getDataRows(got.sheet);
  var filterKey = ad ? normalizeKeyPart(ad) : '';
  var updated = 0;
  var i;

  for (i = 0; i < data.length; i++) {
    var rowAd = String(data[i][0] != null ? data[i][0] : '').trim();
    if (!rowAd) {
      continue;
    }
    if (filterKey && normalizeKeyPart(rowAd) !== filterKey) {
      continue;
    }
    var kalan = computeSupplierBalance(rowAd, got.ss);
    try {
      got.sheet.getRange(i + 2, 4).setValue(kalan);
      updated++;
    } catch (e) {
      return {
        ok: false,
        message: 'Bakiye sütunu yazılamadı: ' + (e.message || e),
        updated: updated
      };
    }
  }

  return {
    ok: true,
    message: updated
      ? ('Bakiye güncellendi (' + updated + ' satır).')
      : (filterKey
        ? 'Bu adla tedarikçi satırı bulunamadı; bakiye hesaplanır ama satır yok.'
        : 'Güncellenecek tedarikçi yok.'),
    updated: updated
  };
}

/**
 * Tedarikçi ekler.
 * @param {Object} tedarikci — {ad, telefon, not}
 * @return {{ok: boolean, message: string}}
 */
function addSupplier(tedarikci) {
  // Tedarikçi yalnız patron — personel ekleyemez (UI gizleme yetmez).
  var denied = denyUnlessSupplierManager();
  if (denied) {
    return denied;
  }

  tedarikci = tedarikci || {};
  var ad = String(tedarikci.ad || '').trim();
  if (!ad) {
    return { ok: false, message: 'Tedarikçi adı gerekli.' };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.TEDARIKCILER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  var rows = getDataRows(got.sheet);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeKeyPart(rows[i][0]) === normalizeKeyPart(ad)) {
      // Pasif ise yeniden aktifleştir
      var aktifVal = rows[i].length > 4 ? rows[i][4] : 'Evet';
      if (!isActiveFlag_(aktifVal)) {
        var rowNum = i + 2;
        got.sheet.getRange(rowNum, 5).setValue('Evet');
        if (tedarikci.telefon !== undefined) {
          got.sheet.getRange(rowNum, 2).setValue(tedarikci.telefon);
        }
        if (tedarikci.not !== undefined) {
          got.sheet.getRange(rowNum, 3).setValue(tedarikci.not);
        }
        var kalanRe = computeSupplierBalance(ad, got.ss);
        got.sheet.getRange(rowNum, 4).setValue(kalanRe);
        return { ok: true, message: 'Pasif tedarikçi yeniden aktifleştirildi.' };
      }
      return {
        ok: false,
        message: 'Bu tedarikçi adı zaten var: ' + ad
      };
    }
  }

  var kalan = computeSupplierBalance(ad, got.ss);
  got.sheet.appendRow([
    ad,
    tedarikci.telefon || '',
    tedarikci.not || '',
    kalan,
    'Evet'
  ]);

  return { ok: true, message: 'Tedarikçi eklendi.' };
}

/**
 * Tedarikçi listesini döndürür (KalanBorc güncel hesaplanır).
 * @param {Object=} opts — {includeInactive: boolean}
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listSuppliers(opts) {
  opts = opts || {};
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.TEDARIKCILER);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  refreshSupplierBalances();

  var data = getDataRows(got.sheet);
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var ad = String(r[0] != null ? r[0] : '').trim();
    // Boş / placeholder satırları listeye alma (boş <li> üretmesin)
    if (!ad) {
      continue;
    }
    var aktif = r.length > 4 ? isActiveFlag_(r[4]) : true;
    if (!opts.includeInactive && !aktif) {
      continue;
    }
    var kalan = computeSupplierBalance(ad, got.ss);
    rows.push({
      row: i + 2,
      ad: ad,
      telefon: r[1],
      not: r[2],
      kalanBorc: kalan,
      aktif: aktif
    });
  }
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Tedarikçi günceller (satır numarası ile).
 * @param {string|number} id — sheet satır numarası (2+)
 * @param {Object} tedarikci
 * @return {{ok: boolean, message: string}}
 */
function updateSupplier(id, tedarikci) {
  // Tedarikçi düzenleme yalnız patron.
  var denied = denyUnlessSupplierManager();
  if (denied) {
    return denied;
  }

  tedarikci = tedarikci || {};
  var rowNum = Number(id);
  if (!rowNum || rowNum < 2) {
    return { ok: false, message: 'Geçersiz satır numarası.' };
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.TEDARIKCILER);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  if (rowNum > got.sheet.getLastRow()) {
    return { ok: false, message: 'Tedarikçi satırı bulunamadı.' };
  }

  var existing = got.sheet.getRange(rowNum, 1, rowNum, 5).getValues()[0];
  var ad = tedarikci.ad !== undefined ? String(tedarikci.ad).trim() : existing[0];
  var telefon = tedarikci.telefon !== undefined ? tedarikci.telefon : existing[1];
  var not = tedarikci.not !== undefined ? tedarikci.not : existing[2];
  var aktif = tedarikci.aktif !== undefined
    ? (tedarikci.aktif ? 'Evet' : 'Hayır')
    : (existing[4] != null && existing[4] !== '' ? existing[4] : 'Evet');

  if (!ad) {
    return { ok: false, message: 'Tedarikçi adı boş olamaz.' };
  }

  var others = getDataRows(got.sheet);
  for (var i = 0; i < others.length; i++) {
    var otherRow = i + 2;
    if (otherRow === rowNum) {
      continue;
    }
    if (normalizeKeyPart(others[i][0]) === normalizeKeyPart(ad)) {
      return { ok: false, message: 'Bu tedarikçi adı zaten var: ' + ad };
    }
  }

  var oldAd = String(existing[0] != null ? existing[0] : '').trim();
  if (normalizeKeyPart(oldAd) !== normalizeKeyPart(ad)) {
    // Ad değiştiyse fatura/ödeme satırlarındaki adı da güncelle (bakiye bütünlüğü)
    renameSupplierRefs_(got.ss, oldAd, ad);
  }

  var kalan = computeSupplierBalance(ad, got.ss);
  got.sheet.getRange(rowNum, 1, rowNum, 5).setValues([[
    ad, telefon, not, kalan, aktif
  ]]);

  if (normalizeKeyPart(oldAd) !== normalizeKeyPart(ad) && oldAd) {
    refreshSupplierBalances(oldAd);
  }

  return { ok: true, message: 'Tedarikçi güncellendi.' };
}

/**
 * Fatura / ödeme satırlarındaki tedarikçi adını yeniden adlandırır.
 * @param {Spreadsheet} ss
 * @param {string} oldAd
 * @param {string} newAd
 */
function renameSupplierRefs_(ss, oldAd, newAd) {
  var cfg = getConfig();
  var oldKey = normalizeKeyPart(oldAd);
  var inv = ss.getSheetByName(cfg.SHEETS.FATURALAR);
  var pay = ss.getSheetByName(cfg.SHEETS.ODEMELER);
  var i;
  var r;
  if (inv) {
    var fRows = getDataRows(inv);
    for (i = 0; i < fRows.length; i++) {
      r = fRows[i];
      if (normalizeKeyPart(r[2]) === oldKey) {
        inv.getRange(i + 2, 3).setValue(newAd);
      }
    }
  }
  if (pay) {
    var oRows = getDataRows(pay);
    for (i = 0; i < oRows.length; i++) {
      r = oRows[i];
      if (normalizeKeyPart(r[1]) === oldKey) {
        pay.getRange(i + 2, 2).setValue(newAd);
      }
    }
  }
}

/**
 * Soft delete — Aktif=Hayır (onaylı silme UI’da).
 * @param {string|number} id — satır numarası
 * @return {{ok: boolean, message: string}}
 */
function deleteSupplier(id) {
  var denied = denyUnlessSupplierManager();
  if (denied) {
    return denied;
  }
  return updateSupplier(id, { aktif: false });
}
