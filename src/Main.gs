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
      'Beklenen ekran: Merhaba Aqua Tekel + Test ortamı\n\n' +
      'Ayrıntılı adımlar: PANEL-KURULUM.md (GitHub deposunda).',
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
  template.environmentLabel = cfg.ENVIRONMENT_LABEL;
  template.appInfoJson = JSON.stringify(getAppInfo());

  return template
    .evaluate()
    .setTitle(cfg.BRAND_NAME + ' — ' + cfg.ENVIRONMENT_LABEL)
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
 * İstemciden çağrılabilir: panel özeti (sheet yazmaz/okumaz).
 * @return {Object}
 */
function getPanelData() {
  return getAppInfo();
}
