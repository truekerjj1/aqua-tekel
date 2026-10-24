/**
 * Aqua Tekel — giriş noktası (iskelet)
 *
 * Web App: doGet → mobil uyumlu Türkçe panel
 * Canlı muhasebe sheet'ine bağlanmaz.
 */

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
