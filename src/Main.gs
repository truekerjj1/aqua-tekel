/**
 * Aqua Tekel — giriş noktası (iskelet)
 *
 * Web App: doGet → mobil uyumlu Türkçe panel
 * Sheet menüsü: onOpen → “Aqua Tekel (Test)”
 * Canlı muhasebe sheet'ine bağlanmaz.
 */

/**
 * Tablo açılınca menü ekler (test).
 * Paneli veya Web App’i değiştirmez.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Aqua Tekel (Test)')
    .addItem('Test sayfalarını kur', 'setupTestSheets')
    .addItem('Örnek test verisi yükle', 'loadSampleTestData')
    .addItem('Haftalık özet tetikleyicisi (Pzt 09:00)', 'installWeeklyDigestTrigger')
    .addItem('Haftalık özeti şimdi çalıştır', 'triggerWeeklyDigest')
    .addItem('Paneli aç (talimat)', 'showPanelOpenInstructions')
    .addToUi();
}

/**
 * Deploy edilmiş paneli nasıl açacağını gösterir.
 * Kod veya deploy ayarını değiştirmez.
 */
function showPanelOpenInstructions() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Paneli açma',
    '1) Bu sayfada: Uzantılar → Apps Script\n' +
      '2) Sağ üst: Deploy (Dağıt) → Manage deployments (Dağıtımları yönet)\n' +
      '   veya ilk kez: Deploy → New deployment → Web app\n' +
      '3) Execute as: Me · Who has access: Only myself\n' +
      '4) Açılan Web App linkine tıklayın.\n\n' +
      'Beklenen: Güvenli giriş + TEST MODU + rol sekmeleri\n' +
      'Test: Fatih TEST4567 (patron) · Sercan TEST2345 (personel)\n' +
      'Tedarikçi / yönetici / onay yalnız patron; personel günlük işlem.\n' +
      'Ödeme: Nakit | Kredi kartı | Vadeli (vadeli borç düşmez).\n\n' +
      'Ayrıntılı adımlar: PANEL-GUNCELLEME.md / PANEL-KURULUM.md',
    ui.ButtonSet.OK
  );
}

/**
 * Web App açıldığında çalışır.
 * @param {Object} e
 * @return {HtmlOutput}
 */
function doGet(e) {
  var cfg = getConfig();
  var template = HtmlService.createTemplateFromFile('ui/Index');
  template.brandName = cfg.BRAND_NAME;
  template.brandSubtitle = cfg.BRAND_SUBTITLE || 'Cari işlem yönetimi';
  template.environmentLabel = cfg.ENVIRONMENT_LABEL;
  template.appInfoJson = JSON.stringify(getAppInfo());

  return template
    .evaluate()
    .setTitle(cfg.BRAND_NAME + ' — Test')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTML parçalarını birleştirmek için (Styles, Client).
 * @param {string} filename — örn. 'ui/Styles'
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * İstemciden çağrılabilir: panel özeti.
 * Rol / yapılandırma + gelir / gider / tedarikçi borç toplamları
 * (listIncome, listExpense, listSuppliers üzerinden).
 * @return {Object}
 */
function getPanelData() {
  var info = getAppInfo();
  info.summary = getPanelSummary();
  return info;
}

/**
 * Özet sekmesi için toplamlar (mevcut liste fonksiyonlarından).
 * @return {{
 *   ok: boolean,
 *   message: string,
 *   gelirToplam: number,
 *   giderToplam: number,
 *   tedarikciBorcToplam: number,
 *   tedarikciler: Array<{ad: string, kalanBorc: number}>
 * }}
 */
function getPanelSummary() {
  var gelirToplam = 0;
  var giderToplam = 0;
  var tedarikciBorcToplam = 0;
  var tedarikciler = [];
  var i;
  var messages = [];

  var income = listIncome({});
  if (income && income.ok) {
    for (i = 0; i < income.rows.length; i++) {
      var gt = parseTutar(income.rows[i].tutar);
      if (!isNaN(gt)) {
        gelirToplam += gt;
      }
    }
  } else if (income && income.message) {
    messages.push(income.message);
  }

  var expense = listExpense({});
  if (expense && expense.ok) {
    for (i = 0; i < expense.rows.length; i++) {
      var xt = parseTutar(expense.rows[i].tutar);
      if (!isNaN(xt)) {
        giderToplam += xt;
      }
    }
  } else if (expense && expense.message) {
    messages.push(expense.message);
  }

  var suppliers = listSuppliers();
  if (suppliers && suppliers.ok) {
    for (i = 0; i < suppliers.rows.length; i++) {
      var s = suppliers.rows[i];
      var borc = parseTutar(s.kalanBorc);
      if (isNaN(borc)) {
        borc = 0;
      }
      tedarikciBorcToplam += borc;
      tedarikciler.push({
        ad: s.ad,
        kalanBorc: borc
      });
    }
  } else if (suppliers && suppliers.message) {
    messages.push(suppliers.message);
  }

  var incomeOk = !!(income && income.ok);
  var expenseOk = !!(expense && expense.ok);
  var suppliersOk = !!(suppliers && suppliers.ok);
  // Hepsi başarılı olmalı; kısmi veri → ok:false (yanlış “tamam” yok)
  var ok = incomeOk && expenseOk && suppliersOk;
  var partial = !ok && (incomeOk || expenseOk || suppliersOk);
  var message;
  if (ok) {
    message = 'Tamam';
  } else if (messages.length) {
    message = (partial ? 'Özet kısmi: ' : '') + messages[0];
  } else {
    message = 'Özet alınamadı.';
  }

  return {
    ok: ok,
    partial: partial,
    message: message,
    gelirToplam: gelirToplam,
    giderToplam: giderToplam,
    tedarikciBorcToplam: tedarikciBorcToplam,
    tedarikciler: tedarikciler
  };
}
