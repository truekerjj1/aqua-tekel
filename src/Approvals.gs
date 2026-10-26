/**
 * Aqua Tekel — onay kuyruğu (sandbox)
 *
 * Sheet: Onaylar (Id, Tip, RefId, Kullanici, Tarih, Durum, Ozet)
 * Personel fatura/ödeme → Bekliyor; patron onaylar/reddeder.
 * Canlı muhasebe ID’si kullanılmaz.
 */

/**
 * Benzersiz onay id üretir.
 * @return {string}
 */
function generateApprovalId_() {
  return 'ON-' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyyMMdd-HHmmss') +
    '-' + String(Math.floor(Math.random() * 9000 + 1000));
}

/**
 * Aktif oturum kullanıcısı adı (veya id).
 * @return {string}
 */
function currentActorLabel_() {
  var sess = getSessionUser_();
  if (sess && sess.ad) {
    return sess.ad;
  }
  if (sess && sess.id) {
    return sess.id;
  }
  return getCurrentUserEmail() || 'bilinmiyor';
}

/**
 * Aktif oturum kullanıcı id.
 * @return {string}
 */
function currentActorId_() {
  var sess = getSessionUser_();
  return (sess && sess.id) || '';
}

/**
 * Yeni kayıt için onay durumu: patron → Onaylandi, personel → Bekliyor.
 * @return {string}
 */
function initialApprovalStatus_() {
  var cfg = getConfig();
  if (requirePatron()) {
    return cfg.ONAY_DURUM.ONAYLANDI;
  }
  return cfg.ONAY_DURUM.BEKLIYOR;
}

/**
 * Onay satırı ekler (personel işlemlerinde veya her zaman kayıt için).
 * @param {string} tip — fatura | odeme
 * @param {string|number} refId — satır no veya fatura no
 * @param {string} ozet
 * @param {string=} durum
 * @return {{ok: boolean, message: string, id: string}}
 */
function createApproval(tip, refId, ozet, durum) {
  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.ONAYLAR);
  if (!got.ok) {
    // Onaylar yoksa sessizce atla (kurulum sonrası gelir)
    return { ok: false, message: got.message, id: '' };
  }
  var id = generateApprovalId_();
  var status = durum || initialApprovalStatus_();
  got.sheet.appendRow([
    id,
    tip || '',
    String(refId != null ? refId : ''),
    currentActorLabel_(),
    formatDateTr(),
    status,
    ozet || ''
  ]);
  return { ok: true, message: 'Onay kaydı eklendi.', id: id };
}

/**
 * Onay listesi.
 * @param {Object=} filtre — {durum, tip}
 * @return {{ok: boolean, message: string, rows: Array<Object>}}
 */
function listApprovals(filtre) {
  filtre = filtre || {};
  var denied = denyUnlessManager();
  if (denied) {
    // Personel kendi bekleyenlerini görebilir
    if (!requirePersonelOrPatron()) {
      return { ok: false, message: denied.message, rows: [] };
    }
  }

  var cfg = getConfig();
  var got = getSandboxSheet(cfg.SHEETS.ONAYLAR);
  if (!got.ok) {
    return { ok: false, message: got.message, rows: [] };
  }

  var data = getDataRows(got.sheet);
  var rows = [];
  var isPatron = requirePatron();
  var me = currentActorLabel_();

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var obj = {
      row: i + 2,
      id: r[0],
      tip: r[1],
      refId: r[2],
      kullanici: r[3],
      tarih: r[4],
      durum: r[5],
      ozet: r[6]
    };
    if (!isPatron && normalizeKeyPart(obj.kullanici) !== normalizeKeyPart(me)) {
      continue;
    }
    if (filtre.durum &&
        normalizeKeyPart(obj.durum) !== normalizeKeyPart(filtre.durum)) {
      continue;
    }
    if (filtre.tip &&
        normalizeKeyPart(obj.tip) !== normalizeKeyPart(filtre.tip)) {
      continue;
    }
    rows.push(obj);
  }
  rows.reverse();
  return { ok: true, message: 'Tamam', rows: rows };
}

/**
 * Onayı onayla veya reddet (yalnız patron).
 * @param {string} approvalId
 * @param {string} karar — Onaylandi | Red
 * @return {{ok: boolean, message: string}}
 */
function decideApproval(approvalId, karar) {
  var denied = denyUnlessManager();
  if (denied) {
    return denied;
  }

  var cfg = getConfig();
  var hedef = String(karar || '').trim();
  if (hedef !== cfg.ONAY_DURUM.ONAYLANDI && hedef !== cfg.ONAY_DURUM.RED) {
    return { ok: false, message: 'Karar Onaylandi veya Red olmalı.' };
  }

  var got = getSandboxSheet(cfg.SHEETS.ONAYLAR);
  if (!got.ok) {
    return { ok: false, message: got.message };
  }

  var id = String(approvalId || '').trim();
  var data = getDataRows(got.sheet);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) !== id) {
      continue;
    }
    var rowNum = i + 2;
    got.sheet.getRange(rowNum, 6).setValue(hedef);
    syncRefApprovalStatus_(data[i][1], data[i][2], hedef);
    return {
      ok: true,
      message: hedef === cfg.ONAY_DURUM.ONAYLANDI
        ? 'İşlem onaylandı.'
        : 'İşlem reddedildi.'
    };
  }
  return { ok: false, message: 'Onay kaydı bulunamadı.' };
}

/**
 * Fatura/ödeme satırındaki OnayDurum alanını günceller.
 * @param {*} tip
 * @param {*} refId
 * @param {string} durum
 */
function syncRefApprovalStatus_(tip, refId, durum) {
  var cfg = getConfig();
  var t = normalizeKeyPart(tip);
  var ref = String(refId != null ? refId : '').trim();
  var rowNum = Number(ref);

  if (t === 'odeme' && rowNum >= 2) {
    var ode = getSandboxSheet(cfg.SHEETS.ODEMELER);
    if (ode.ok && rowNum <= ode.sheet.getLastRow()) {
      // Kullanici=7, OnayDurum=8
      ode.sheet.getRange(rowNum, 8).setValue(durum);
    }
    return;
  }
  if (t === 'fatura' && rowNum >= 2) {
    var fat = getSandboxSheet(cfg.SHEETS.FATURALAR);
    if (fat.ok && rowNum <= fat.sheet.getLastRow()) {
      // OnayDurum=10
      fat.sheet.getRange(rowNum, 10).setValue(durum);
    }
  }
}

/**
 * Bekleyen onay sayısı (patron rozeti).
 * @return {{ok: boolean, message: string, count: number}}
 */
function countPendingApprovals() {
  if (!requirePatron()) {
    return { ok: true, message: 'Tamam', count: 0 };
  }
  var list = listApprovals({ durum: getConfig().ONAY_DURUM.BEKLIYOR });
  return {
    ok: !!list.ok,
    message: list.message || 'Tamam',
    count: (list.rows && list.rows.length) || 0
  };
}
