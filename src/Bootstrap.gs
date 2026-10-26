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

  for (var i = 0; i < TEST_SAYFALARI.length; i++) {
    var tanim = TEST_SAYFALARI[i];
    var sheet = ss.getSheetByName(tanim.ad);
    if (sheet) {
      skipped.push(tanim.ad);
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
  if (!parts.length) {
    parts.push('Değişiklik yok.');
  }

  var message = parts.join('\n');
  try {
    SpreadsheetApp.getUi().alert('Aqua Tekel — Test sayfaları', message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e2) {
    // UI yoksa
  }

  return {
    ok: true,
    message: message,
    created: created,
    skipped: skipped
  };
}
