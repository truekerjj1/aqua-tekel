/**
 * Aqua Tekel — dekont / ek dosya (sandbox)
 *
 * Drive: script’in bağlı Drive’ında `Aqua Tekel TEST / Dekontlar` (getOrCreate).
 * Base64 upload via google.script.run. UI max ~5MB.
 * Canlı muhasebe / canlı Drive köküne bağlanmaz; yalnızca bu script’in Drive’ı.
 */

/**
 * Klasör yolunu getOrCreate ile oluşturur.
 * @param {Array<string>} pathParts
 * @return {Folder}
 */
function getOrCreateFolderPath_(pathParts) {
  var parent = DriveApp.getRootFolder();
  for (var i = 0; i < pathParts.length; i++) {
    var name = pathParts[i];
    var it = parent.getFoldersByName(name);
    if (it.hasNext()) {
      parent = it.next();
    } else {
      parent = parent.createFolder(name);
    }
  }
  return parent;
}

/**
 * Dekont klasörünü döndürür (oluşturur).
 * @return {{ok: boolean, message: string, folderId: string, folderUrl: string}}
 */
function getDekontFolder() {
  try {
    var cfg = getConfig();
    var folder = getOrCreateFolderPath_(cfg.DEKONT_FOLDER_PATH || ['Aqua Tekel TEST', 'Dekontlar']);
    return {
      ok: true,
      message: 'Tamam',
      folderId: folder.getId(),
      folderUrl: folder.getUrl()
    };
  } catch (e) {
    return {
      ok: false,
      message: 'Dekont klasörü açılamadı: ' + (e.message || e),
      folderId: '',
      folderUrl: ''
    };
  }
}

/**
 * Base64 dekont yükler (görsel veya PDF).
 * google.script.run → uploadDekont
 * @param {Object} payload — {base64, mimeType, fileName, tip?, refLabel?}
 * @return {{ok: boolean, message: string, fileId: string, url: string}}
 */
function uploadDekont(payload) {
  var denied = denyUnlessWriter();
  if (denied) {
    return { ok: false, message: denied.message, fileId: '', url: '' };
  }

  payload = payload || {};
  var b64 = String(payload.base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!b64) {
    return { ok: false, message: 'Dosya verisi yok.', fileId: '', url: '' };
  }

  var cfg = getConfig();
  var maxBytes = cfg.DEKONT_MAX_BYTES || (5 * 1024 * 1024);
  // Kabaca boyut tahmini (base64 ~ 4/3)
  var approx = Math.floor((b64.length * 3) / 4);
  if (approx > maxBytes) {
    return {
      ok: false,
      message: 'Dosya çok büyük. En fazla ~5 MB yükleyin.',
      fileId: '',
      url: ''
    };
  }

  var mime = String(payload.mimeType || 'application/octet-stream').trim();
  var allowed =
    mime.indexOf('image/') === 0 ||
    mime === 'application/pdf';
  if (!allowed) {
    return {
      ok: false,
      message: 'Yalnızca görsel veya PDF yükleyin.',
      fileId: '',
      url: ''
    };
  }

  var name = String(payload.fileName || 'dekont').trim() || 'dekont';
  name = name.replace(/[\\\/\?\%\*\:\|\"<>]/g, '_');
  var stamp = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyyMMdd-HHmmss');
  var actor = currentActorId_() || 'user';
  var fullName = stamp + '_' + actor + '_' + name;

  try {
    var folderInfo = getDekontFolder();
    if (!folderInfo.ok) {
      return { ok: false, message: folderInfo.message, fileId: '', url: '' };
    }
    var folder = DriveApp.getFolderById(folderInfo.folderId);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(b64),
      mime,
      fullName
    );
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    return {
      ok: true,
      message: 'Dekont yüklendi.',
      fileId: file.getId(),
      url: file.getUrl()
    };
  } catch (e) {
    return {
      ok: false,
      message: 'Dekont kaydedilemedi: ' + (e.message || e),
      fileId: '',
      url: ''
    };
  }
}
