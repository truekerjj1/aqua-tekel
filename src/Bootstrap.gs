/**
 * Aqua Tekel — test sayfalarını kur (sandbox)
 *
 * Yalnızca script’in bağlı olduğu aktif tabloya yazar
 * (SpreadsheetApp.getActiveSpreadsheet).
 * Canlı muhasebe ID’si kullanılmaz; ID uydurulmaz.
 * Başlıklar sheets/SEMASI.md ve Config.HEADERS ile uyumludur.
 */

/**
 * Test sayfaları ve başlık satırları.
 * Varsa atlanır; yoksa oluşturulur.
 */
var TEST_SAYFALARI = [
  {
    ad: 'Gelir',
    basliklar: ['Tarih', 'Tutar', 'Açıklama', 'Kategori', 'Kaynak', 'Not', 'Kullanici']
  },
  {
    ad: 'Gider',
    basliklar: ['Tarih', 'Tutar', 'Açıklama', 'Kategori', 'Not', 'Kullanici']
  },
  {
    ad: 'Tedarikçiler',
    basliklar: ['Ad', 'Telefon', 'Not', 'KalanBorc', 'Aktif']
  },
  {
    ad: 'Faturalar',
    basliklar: [
      'FaturaNo', 'Tarih', 'Tedarikçi', 'Tutar', 'Vade', 'Durum', 'Not',
      'Yöntem', 'Kullanici', 'OnayDurum', 'DekontFileId', 'DekontUrl'
    ]
  },
  {
    ad: 'Odemeler',
    basliklar: [
      'Tarih', 'Tedarikçi', 'Tutar', 'Yöntem', 'FaturaNo', 'Not',
      'Kullanici', 'OnayDurum', 'DekontFileId', 'DekontUrl'
    ]
  },
  {
    ad: 'Kullanicilar',
    basliklar: ['Id', 'E-posta', 'Rol', 'Ad', 'Aktif', 'Kod']
  },
  {
    ad: 'Onaylar',
    basliklar: ['Id', 'Tip', 'RefId', 'Kullanici', 'Tarih', 'Durum', 'Ozet']
  },
  {
    ad: 'GirisLog',
    basliklar: ['Tarih', 'Saat', 'UserId', 'Ad', 'Rol']
  }
];

/**
 * Aktif (bağlı) tabloda test sayfalarını oluşturur.
 * Menüden veya doğrudan çalıştırılabilir.
 * @return {{ok: boolean, message: string, created: string[], skipped: string[]}}
 */
function setupTestSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var msg =
      'Tablo bulunamadı. Bu script’i “Aqua TEKEL TEST PROJESİ” tablosundan ' +
      'Uzantılar → Apps Script ile açın. Canlı muhasebe tablosunu kullanmayın.';
    try {
      SpreadsheetApp.getUi().alert('Aqua Tekel', msg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {
      // UI yoksa (ör. Web App) sessizce dön
    }
    return { ok: false, message: msg, created: [], skipped: [] };
  }

  var created = [];
  var skipped = [];
  var mismatched = [];

  for (var i = 0; i < TEST_SAYFALARI.length; i++) {
    var tanim = TEST_SAYFALARI[i];
    var sheet = ss.getSheetByName(tanim.ad);
    if (sheet) {
      var mismatch = checkHeaderMismatch_(sheet, tanim.basliklar);
      if (mismatch) {
        mismatched.push(tanim.ad + ' (' + mismatch + ')');
      } else {
        skipped.push(tanim.ad);
      }
      continue;
    }
    sheet = ss.insertSheet(tanim.ad);
    sheet.getRange(1, 1, 1, tanim.basliklar.length).setValues([tanim.basliklar]);
    sheet.getRange(1, 1, 1, tanim.basliklar.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    created.push(tanim.ad);
  }

  var parts = [];
  if (created.length) {
    parts.push('Oluşturulan: ' + created.join(', '));
  }
  if (skipped.length) {
    parts.push('Zaten vardı (atlandı): ' + skipped.join(', '));
  }
  if (mismatched.length) {
    parts.push(
      'Şema uyuşmazlığı (başlıklar yeniden yazılmadı): ' +
        mismatched.join('; ')
    );
  }
  if (!parts.length) {
    parts.push('Değişiklik yok.');
  }

  var message = parts.join('\n');
  var ok = mismatched.length === 0;
  try {
    SpreadsheetApp.getUi().alert('Aqua Tekel — Test sayfaları', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e2) {
    // UI yoksa
  }

  return {
    ok: ok,
    message: message,
    created: created,
    skipped: skipped,
    mismatched: mismatched
  };
}

/**
 * Mevcut başlık satırı beklenenle aynı mı? Uyuşmazlıkta metin döner; sessiz yeniden yazmaz.
 * @param {Sheet} sheet
 * @param {Array<string>} expected
 * @return {string|null}
 */
function checkHeaderMismatch_(sheet, expected) {
  expected = expected || [];
  var lastCol = Math.max(sheet.getLastColumn(), expected.length);
  if (lastCol < 1) {
    return 'başlık satırı boş';
  }
  var actual = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var a = [];
  var i;
  for (i = 0; i < expected.length; i++) {
    a.push(String(actual[i] != null ? actual[i] : '').trim());
  }
  for (i = 0; i < expected.length; i++) {
    if (a[i] !== String(expected[i])) {
      return 'beklenen "' + expected[i] + '", bulunan "' + a[i] + '" (sütun ' +
        (i + 1) + ')';
    }
  }
  // Fazladan dolu sütun varsa uyar
  for (i = expected.length; i < actual.length; i++) {
    if (String(actual[i] != null ? actual[i] : '').trim()) {
      return 'beklenmeyen ekstra sütun ' + (i + 1);
    }
  }
  return null;
}
