'use strict';

const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const store = require('./store');
const money = require('./money');

var parseTutar = money.parseTutar;
var formatTutarTr = money.formatTutarTr;
var sanitizeDekontUrl = money.sanitizeDekontUrl;

function normalizeKeyPart(deger) {
  if (deger === null || deger === undefined) return '';
  return String(deger).replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeOdemeYontemi(yontem) {
  var s = String(yontem || '').trim().toLowerCase();
  if (s === 'nakit') return 'Nakit';
  if (s === 'kredi kartı' || s === 'kredi karti' || s === 'kk' || s === 'kart') {
    return 'Kredi kartı';
  }
  if (s === 'vadeli') return 'Vadeli';
  return String(yontem || '').trim();
}

function isDebtReducingPayment(yontem) {
  var n = normalizeOdemeYontemi(yontem);
  return n === 'Nakit' || n === 'Kredi kartı';
}

function formatDateTr(d) {
  d = d || new Date();
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '.' + mm + '.' + yyyy;
}

function todayKey() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/** Hafta aralığı Pzt–Paz (yerel saat; localhost ≈ Istanbul). weekOffset 0=bu, -1=önceki */
function weekRange(weekOffset) {
  var now = new Date();
  var dow = now.getDay();
  var daysSinceMon = (dow + 6) % 7;
  var thisMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMon);
  var mon = new Date(
    thisMon.getFullYear(),
    thisMon.getMonth(),
    thisMon.getDate() + weekOffset * 7
  );
  var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  function iso(d) {
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }
  return {
    baslangic: iso(mon),
    bitis: iso(sun),
    baslangicTr: formatDateTr(mon),
    bitisTr: formatDateTr(sun)
  };
}

function previousWeekRange() {
  return weekRange(-1);
}

function currentWeekRange() {
  return weekRange(0);
}

function normalizeWeekMode(mode) {
  var m = String(mode || '').trim().toLowerCase();
  if (m === 'current' || m === 'bu' || m === 'bu_hafta' || m === 'this') return 'current';
  if (m === 'auto' || m === 'otomatik') return 'auto';
  return 'previous';
}

function hasActivityInRange(bas, bit) {
  var files = ['payments', 'invoices', 'income', 'expense'];
  for (var f = 0; f < files.length; f++) {
    var rows = store.readJson(files[f], []);
    for (var i = 0; i < rows.length; i++) {
      if (inDateRange(rows[i].tarih, bas, bit)) return true;
    }
  }
  return false;
}

function resolveWeekRange(mode) {
  mode = normalizeWeekMode(mode);
  if (mode === 'current') {
    var cur = currentWeekRange();
    return Object.assign(cur, { weekMode: 'current', weekLabel: 'bu hafta' });
  }
  var prev = previousWeekRange();
  return Object.assign(prev, { weekMode: 'previous', weekLabel: 'önceki hafta' });
}

function formatDigestMoney(n) {
  if (n == null || isNaN(Number(n))) return '0';
  return (Math.round(Number(n) * 100) / 100).toLocaleString('tr-TR');
}

function logSuccessfulLogin(user) {
  var logins = store.readJson('logins', []);
  var now = new Date();
  logins.push({
    tarih: formatDateTr(now),
    saat:
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0') +
      ':' +
      String(now.getSeconds()).padStart(2, '0'),
    userId: user.id,
    ad: user.ad,
    rol: user.rol
  });
  store.writeJson('logins', logins);
}

function countLoginsInRange(bas, bit) {
  var logins = store.readJson('logins', []);
  var byUser = {};
  var toplam = 0;
  logins.forEach(function (row) {
    var k = parseDateKey(row.tarih);
    if (!k || (bas && k < bas) || (bit && k > bit)) return;
    toplam++;
    var ad = String(row.ad || row.userId || '—').trim() || '—';
    byUser[ad] = (byUser[ad] || 0) + 1;
  });
  var list = Object.keys(byUser).map(function (ad) {
    return { ad: ad, adet: byUser[ad] };
  });
  list.sort(function (a, b) {
    return b.adet - a.adet;
  });
  return { toplam: toplam, byUser: list };
}

function bumpUserMap(map, ad, tutar) {
  var name = String(ad || '—').trim() || '—';
  if (!map[name]) map[name] = { ad: name, tutar: 0, adet: 0 };
  map[name].tutar += tutar;
  map[name].adet++;
}

function mapToUserTotals(map) {
  var list = Object.keys(map).map(function (k) { return map[k]; });
  list.sort(function (a, b) { return b.tutar - a.tutar; });
  return list;
}

function buildWeeklyDigest(opts) {
  opts = opts || {};
  var requested = normalizeWeekMode(opts.weekMode || 'auto');
  var resolvedMode = requested;
  var autoFellBack = false;
  var note = '';
  if (requested === 'auto') {
    var prevCheck = previousWeekRange();
    if (hasActivityInRange(prevCheck.baslangic, prevCheck.bitis)) {
      resolvedMode = 'previous';
      note = 'Otomatik: önceki haftada kayıt var.';
    } else {
      resolvedMode = 'current';
      autoFellBack = true;
      note = 'Otomatik: önceki hafta boş — bu haftanın kayıtları özetlendi.';
    }
  }
  var range = resolveWeekRange(resolvedMode);
  var bas = range.baslangic;
  var bit = range.bitis;
  var odemeToplam = 0;
  var odemeAdet = 0;
  var byFirm = {};
  var faturaToplam = 0;
  var faturaAdet = 0;
  var gelirToplam = 0;
  var gelirAdet = 0;
  var giderToplam = 0;
  var giderAdet = 0;
  var gelirByUser = {};
  var giderByUser = {};

  store.readJson('payments', []).forEach(function (pr) {
    if (!inDateRange(pr.tarih, bas, bit)) return;
    var pt = parseTutar(pr.tutar);
    if (isNaN(pt)) return;
    odemeToplam += pt;
    odemeAdet++;
    var firm = String(pr.tedarikci || '—').trim() || '—';
    if (!byFirm[firm]) byFirm[firm] = { ad: firm, tutar: 0, adet: 0 };
    byFirm[firm].tutar += pt;
    byFirm[firm].adet++;
  });

  store.readJson('invoices', []).forEach(function (ir) {
    if (!inDateRange(ir.tarih, bas, bit)) return;
    var it = parseTutar(ir.tutar);
    if (isNaN(it)) return;
    faturaToplam += it;
    faturaAdet++;
  });

  store.readJson('income', []).forEach(function (gr) {
    if (!inDateRange(gr.tarih, bas, bit)) return;
    var gt = parseTutar(gr.tutar);
    if (isNaN(gt)) return;
    gelirToplam += gt;
    gelirAdet++;
    bumpUserMap(gelirByUser, gr.kullanici, gt);
  });

  store.readJson('expense', []).forEach(function (er) {
    if (!inDateRange(er.tarih, bas, bit)) return;
    var et = parseTutar(er.tutar);
    if (isNaN(et)) return;
    giderToplam += et;
    giderAdet++;
    bumpUserMap(giderByUser, er.kullanici, et);
  });

  var firms = Object.keys(byFirm).map(function (k) {
    return byFirm[k];
  });
  firms.sort(function (a, b) {
    return b.tutar - a.tutar;
  });

  var gelirUsers = mapToUserTotals(gelirByUser);
  var giderUsers = mapToUserTotals(giderByUser);
  var logins = countLoginsInRange(bas, bit);
  var now = new Date();
  var lines = [];
  lines.push('Aqua Tekel — Haftalık Özet');
  lines.push(
    'Dönem: ' + range.baslangicTr + ' – ' + range.bitisTr + ' (' + range.weekLabel + ')'
  );
  if (note) lines.push(note);
  lines.push('');
  lines.push(
    'Bu dönemde toplam ' +
      formatDigestMoney(odemeToplam) +
      ' ₺ ödeme yapıldı (' +
      odemeAdet +
      ' kayıt).'
  );
  if (firms.length) {
    lines.push('Firmalara göre:');
    firms.forEach(function (f) {
      lines.push(
        '  · ' + f.ad + ': ' + formatDigestMoney(f.tutar) + ' ₺ (' + f.adet + ' ödeme)'
      );
    });
  } else {
    lines.push('Firmalara ödeme kaydı yok.');
  }
  lines.push(
    'Faturalar: ' +
      formatDigestMoney(faturaToplam) +
      ' ₺ (' +
      faturaAdet +
      ' adet)'
  );
  lines.push(
    'Gelir: ' +
      formatDigestMoney(gelirToplam) +
      ' ₺ · Gider: ' +
      formatDigestMoney(giderToplam) +
      ' ₺'
  );
  if (giderUsers.length) {
    lines.push('Kullanıcı bazlı gider:');
    giderUsers.forEach(function (u) {
      lines.push(
        '  · ' + u.ad + ': ' + formatDigestMoney(u.tutar) + ' ₺ gider (' + u.adet + ' kayıt)'
      );
    });
  }
  if (gelirUsers.length) {
    lines.push('Kullanıcı bazlı gelir:');
    gelirUsers.forEach(function (u) {
      lines.push(
        '  · ' + u.ad + ': ' + formatDigestMoney(u.tutar) + ' ₺ gelir (' + u.adet + ' kayıt)'
      );
    });
  }
  lines.push('Kullanıcı girişleri: ' + logins.toplam + ' başarılı giriş.');
  logins.byUser.forEach(function (u) {
    lines.push('  · ' + u.ad + ': ' + u.adet);
  });

  return {
    ok: true,
    generatedAt: now.toISOString(),
    generatedAtTr: formatDateTr(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
    timezone: 'Europe/Istanbul',
    simulated: true,
    period: range,
    weekMode: range.weekMode,
    weekLabel: range.weekLabel,
    requestedWeekMode: requested,
    autoFellBack: autoFellBack,
    note: note,
    odeme: { toplam: odemeToplam, adet: odemeAdet, byFirm: firms },
    fatura: { toplam: faturaToplam, adet: faturaAdet },
    gelir: { toplam: gelirToplam, adet: gelirAdet, byUser: gelirUsers },
    gider: { toplam: giderToplam, adet: giderAdet, byUser: giderUsers },
    giris: logins,
    metin: lines.join('\n')
  };
}

function parseDateKey(val) {
  if (val == null || val === '') return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    var mm = String(val.getMonth() + 1).padStart(2, '0');
    var dd = String(val.getDate()).padStart(2, '0');
    return val.getFullYear() + '-' + mm + '-' + dd;
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    if (s.length > 10) {
      var parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        var mm2 = String(parsed.getMonth() + 1).padStart(2, '0');
        var dd2 = String(parsed.getDate()).padStart(2, '0');
        return parsed.getFullYear() + '-' + mm2 + '-' + dd2;
      }
    }
    return s.substring(0, 10);
  }
  return '';
}

function normalizeUserFilterToken(s) {
  var t = String(s == null ? '' : s).trim();
  if (!t) return '';
  return t.replace(/\s*\((patron|personel|misafir)\)\s*$/i, '').trim();
}

function dateToTr(val) {
  var k = parseDateKey(val);
  if (!k) return val == null || val === '' ? '' : String(val);
  var p = k.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

function matchKullaniciFilter(kullanici, filtreAd, filtreId) {
  var fAd = normalizeKeyPart(normalizeUserFilterToken(filtreAd));
  var fId = normalizeKeyPart(filtreId);
  if (!fAd && !fId) return true;
  var k = normalizeKeyPart(kullanici);
  if (!k) return false;
  if (fId && (k === fId || k.indexOf(fId) === 0)) return true;
  if (!fAd) return false;
  if (k === fAd) return true;
  if (k.indexOf(fAd) === 0 || k.indexOf(fAd + ' ') >= 0) return true;
  if (fAd.indexOf(k) === 0 || fAd.indexOf(k + ' ') >= 0) return true;
  return false;
}

function adminWeekPresetRange(preset) {
  var p = String(preset || '').trim().toLowerCase();
  if (!p) return null;
  var mode = p === 'current' || p === 'bu' || p === 'bu_hafta' ? 'current' : 'previous';
  return resolveWeekRange(mode);
}

function resolveAdminFilterRange(filtre) {
  filtre = filtre || {};
  var weekPreset = String(filtre.weekPreset || filtre.hafta || '').trim();
  var preset = adminWeekPresetRange(weekPreset);
  var bas = '';
  var bit = '';
  var basTr = '';
  var bitTr = '';
  var weekLabel = '';
  if (preset) {
    bas = preset.baslangic;
    bit = preset.bitis;
    basTr = preset.baslangicTr || dateToTr(bas);
    bitTr = preset.bitisTr || dateToTr(bit);
    weekLabel = preset.weekLabel || '';
  } else {
    if (filtre.baslangic) bas = parseDateKey(filtre.baslangic) || '';
    if (filtre.bitis) bit = parseDateKey(filtre.bitis) || '';
    basTr = bas ? dateToTr(bas) : '';
    bitTr = bit ? dateToTr(bit) : '';
  }
  return {
    bas: bas,
    bit: bit,
    basTr: basTr,
    bitTr: bitTr,
    weekPreset: weekPreset,
    weekLabel: weekLabel
  };
}

function serializeAdminRow(r, tip) {
  r = r || {};
  var out = {
    tip: tip || '',
    row: r.row,
    tarih: dateToTr(r.tarih),
    tutar: r.tutar,
    kullanici: r.kullanici || '',
    onayDurum: r.onayDurum || ''
  };
  if (tip === 'fatura') {
    out.faturaNo = r.faturaNo || '';
    out.tedarikci = r.tedarikci || '';
    out.ozet = (r.faturaNo || '') + ' · ' + (r.tedarikci || '');
  } else if (tip === 'odeme') {
    out.tedarikci = r.tedarikci || '';
    out.yontem = r.yontem || '';
    out.ozet = (r.tedarikci || '') + (r.yontem ? ' · ' + r.yontem : '');
  } else if (tip === 'gelir') {
    out.aciklama = r.aciklama || '';
    out.ozet = r.aciklama || '';
  } else if (tip === 'gider') {
    out.aciklama = r.aciklama || '';
    out.kategori = r.kategori || '';
    out.ozet = (r.aciklama || '') + (r.kategori ? ' · ' + r.kategori : '');
  }
  return out;
}

function monthKey(val) {
  var k = parseDateKey(val);
  return k ? k.substring(0, 7) : '';
}

function inDateRange(tarih, bas, bit) {
  var k = parseDateKey(tarih);
  if (!k) return !bas && !bit;
  if (bas && k < bas) return false;
  if (bit && k > bit) return false;
  return true;
}

function withRows(arr) {
  return (arr || []).map(function (item, i) {
    return Object.assign({ row: i + 2 }, item);
  });
}

function buildPublicSession(session) {
  var rol = session.rol || 'misafir';
  var isPatron = rol === 'patron';
  var isStaff = rol === 'personel' || isPatron;
  return {
    id: session.id,
    ad: session.ad,
    rol: rol,
    canWrite: isStaff,
    canManageSuppliers: isPatron,
    canManageInvoices: isStaff,
    canManage: isPatron
  };
}

function getSessionUser(ctx) {
  return ctx.session || null;
}

function requirePatron(ctx) {
  var s = getSessionUser(ctx);
  return !!(s && s.rol === 'patron');
}

function requireStaff(ctx) {
  var s = getSessionUser(ctx);
  return !!(s && (s.rol === 'patron' || s.rol === 'personel'));
}

function denyUnlessWriter(ctx) {
  if (requireStaff(ctx)) return null;
  if (!getSessionUser(ctx)) {
    return {
      ok: false,
      message: 'Yazma yetkisi yok. Önce panelden kullanıcı seçip test şifresi ile giriş yapın.'
    };
  }
  return { ok: false, message: 'Bu işlem için yazma yetkisi yok.' };
}

function denyUnlessSupplierManager(ctx) {
  if (requirePatron(ctx)) return null;
  if (!getSessionUser(ctx)) {
    return {
      ok: false,
      message: 'Tedarikçi yönetimi için giriş yapın. Tedarikçiyi yalnız patron ekler / düzenler.'
    };
  }
  return {
    ok: false,
    message:
      'Tedarikçi ekleme / düzenleme yalnız patron içindir. Personel ödeme yapabilir ama tedarikçi kaydı oluşturamaz.'
  };
}

function denyUnlessInvoiceManager(ctx) {
  if (requireStaff(ctx)) return null;
  return {
    ok: false,
    message:
      'Fatura eklemek için giriş yapın. Personel ve patron fatura ekleyebilir; tedarikçi ekleme yalnız patron.'
  };
}

function denyUnlessManager(ctx) {
  if (requirePatron(ctx)) return null;
  return {
    ok: false,
    message: 'Bu işlem yalnızca patron içindir. Personelde ayar / kullanıcı yönetimi yok.'
  };
}

function currentActorLabel(ctx) {
  var s = getSessionUser(ctx);
  if (s && s.ad) return s.ad;
  if (s && s.id) return s.id;
  return 'bilinmiyor';
}

function currentActorId(ctx) {
  var s = getSessionUser(ctx);
  return (s && s.id) || '';
}

function initialApprovalStatus(ctx) {
  if (requirePatron(ctx)) return cfg.ONAY_DURUM.ONAYLANDI;
  return cfg.ONAY_DURUM.BEKLIYOR;
}

function findUserById(userId) {
  var id = String(userId || '').trim();
  if (!id) return null;
  var users = store.readJson('users', []);
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === id && users[i].aktif !== false) {
      return users[i];
    }
  }
  for (var j = 0; j < cfg.TEST_USERS.length; j++) {
    if (cfg.TEST_USERS[j].id === id) {
      return Object.assign({ aktif: true, email: id + '@example.com' }, cfg.TEST_USERS[j]);
    }
  }
  return null;
}

function computeSupplierBalance(ad) {
  var key = normalizeKeyPart(ad);
  var borc = 0;
  var odenen = 0;
  var invoices = store.readJson('invoices', []);
  var payments = store.readJson('payments', []);
  invoices.forEach(function (r) {
    if (normalizeKeyPart(r.tedarikci) === key) {
      var ft = parseTutar(r.tutar);
      if (!isNaN(ft)) borc += ft;
    }
  });
  payments.forEach(function (r) {
    if (normalizeKeyPart(r.tedarikci) !== key) return;
    if (!isDebtReducingPayment(r.yontem)) return;
    var ot = parseTutar(r.tutar);
    if (!isNaN(ot)) odenen += ot;
  });
  return borc - odenen;
}

function refreshSupplierBalances(ad) {
  var suppliers = store.readJson('suppliers', []);
  var filterKey = ad ? normalizeKeyPart(ad) : '';
  var updated = 0;
  suppliers.forEach(function (s) {
    if (!s.ad) return;
    if (filterKey && normalizeKeyPart(s.ad) !== filterKey) return;
    s.kalanBorc = computeSupplierBalance(s.ad);
    updated++;
  });
  store.writeJson('suppliers', suppliers);
  return updated;
}

function createApproval(ctx, tip, refId, ozet, durum) {
  var approvals = store.readJson('approvals', []);
  var stamp = new Date();
  var id =
    'ON-' +
    stamp.getFullYear() +
    String(stamp.getMonth() + 1).padStart(2, '0') +
    String(stamp.getDate()).padStart(2, '0') +
    '-' +
    String(stamp.getHours()).padStart(2, '0') +
    String(stamp.getMinutes()).padStart(2, '0') +
    String(stamp.getSeconds()).padStart(2, '0') +
    '-' +
    String(Math.floor(Math.random() * 9000 + 1000));
  approvals.push({
    id: id,
    tip: tip || '',
    refId: String(refId != null ? refId : ''),
    kullanici: currentActorLabel(ctx),
    tarih: formatDateTr(),
    durum: durum || initialApprovalStatus(ctx),
    ozet: ozet || ''
  });
  store.writeJson('approvals', approvals);
  return id;
}

function syncRefApprovalStatus(tip, refId, durum) {
  var t = normalizeKeyPart(tip);
  var rowNum = Number(refId);
  if (t === 'odeme' && rowNum >= 2) {
    var payments = store.readJson('payments', []);
    var pi = rowNum - 2;
    if (payments[pi]) {
      payments[pi].onayDurum = durum;
      store.writeJson('payments', payments);
    }
  }
  if (t === 'fatura' && rowNum >= 2) {
    var invoices = store.readJson('invoices', []);
    var fi = rowNum - 2;
    if (invoices[fi]) {
      invoices[fi].onayDurum = durum;
      store.writeJson('invoices', invoices);
    }
  }
}

function getUserRole(ctx) {
  var s = getSessionUser(ctx);
  return (s && s.rol) || 'misafir';
}

function getAppInfo(ctx) {
  var role = getUserRole(ctx);
  var sess = getSession(ctx);
  var displayName = (sess.session && sess.session.ad) || '';
  var greet = displayName
    ? 'Merhaba ' + displayName
    : 'Merhaba ' + cfg.BRAND_NAME;
  return {
    brand: cfg.BRAND_NAME,
    brandSubtitle: cfg.BRAND_SUBTITLE,
    environmentLabel: cfg.ENVIRONMENT_LABEL,
    spreadsheetConfigured: false,
    usesActiveSpreadsheet: false,
    localMock: true,
    userEmail: '',
    userName: displayName,
    role: role,
    canWrite: requireStaff(ctx),
    canManageSuppliers: requirePatron(ctx),
    canManageInvoices: requireStaff(ctx),
    canManage: requirePatron(ctx),
    loggedIn: !!sess.loggedIn,
    session: sess.session || null,
    message: greet
  };
}

function txDedupKey(kayit) {
  kayit = kayit || {};
  return [
    normalizeKeyPart(kayit.tarih),
    normalizeKeyPart(parseTutar(kayit.tutar)),
    normalizeKeyPart(kayit.aciklama)
  ].join('|');
}

function invoiceDedupKey(kayit) {
  kayit = kayit || {};
  return normalizeKeyPart(kayit.faturaNo) + '|' + normalizeKeyPart(kayit.tedarikci);
}

function paymentDedupKey(kayit) {
  kayit = kayit || {};
  return [
    normalizeKeyPart(kayit.tarih),
    normalizeKeyPart(kayit.tedarikci),
    normalizeKeyPart(parseTutar(kayit.tutar)),
    normalizeKeyPart(normalizeOdemeYontemi(kayit.yontem)),
    normalizeKeyPart(kayit.faturaNo)
  ].join('|');
}

function findLocalDuplicate(list, keyFn, kayit) {
  var target = keyFn(kayit);
  if (!target || target === '||' || target === '||||') return false;
  for (var i = 0; i < list.length; i++) {
    if (keyFn(list[i]) === target) return true;
  }
  return false;
}

function getPanelSummary() {
  var gelirToplam = 0;
  var giderToplam = 0;
  var tedarikciBorcToplam = 0;
  var tedarikciler = [];

  try {
    store.readJson('income', []).forEach(function (r) {
      var gt = parseTutar(r.tutar);
      if (!isNaN(gt)) gelirToplam += gt;
    });
    store.readJson('expense', []).forEach(function (r) {
      var xt = parseTutar(r.tutar);
      if (!isNaN(xt)) giderToplam += xt;
    });

    refreshSupplierBalances();
    store.readJson('suppliers', []).forEach(function (s) {
      if (s.aktif === false) return;
      var borc = parseTutar(s.kalanBorc);
      if (isNaN(borc)) borc = computeSupplierBalance(s.ad);
      tedarikciBorcToplam += borc;
      tedarikciler.push({ ad: s.ad, kalanBorc: borc });
    });

    return {
      ok: true,
      partial: false,
      message: 'Tamam',
      gelirToplam: gelirToplam,
      giderToplam: giderToplam,
      tedarikciBorcToplam: tedarikciBorcToplam,
      tedarikciler: tedarikciler
    };
  } catch (e) {
    return {
      ok: false,
      partial: false,
      message: 'Özet alınamadı: ' + (e && e.message ? e.message : String(e)),
      gelirToplam: gelirToplam,
      giderToplam: giderToplam,
      tedarikciBorcToplam: tedarikciBorcToplam,
      tedarikciler: tedarikciler
    };
  }
}

function collectActivity(userFilter, limit) {
  var items = [];

  function matchUser(kullanici) {
    if (!userFilter) return true;
    var k = normalizeKeyPart(kullanici);
    return (
      k === normalizeKeyPart(userFilter.ad) ||
      k === normalizeKeyPart(userFilter.id)
    );
  }

  store.readJson('income', []).forEach(function (g) {
    if (!matchUser(g.kullanici)) return;
    items.push({
      tip: 'gelir',
      tarih: g.tarih,
      tarihKey: parseDateKey(g.tarih),
      tutar: g.tutar,
      ozet: g.aciklama || '',
      kullanici: g.kullanici || '',
      onayDurum: ''
    });
  });
  store.readJson('expense', []).forEach(function (x) {
    if (!matchUser(x.kullanici)) return;
    items.push({
      tip: 'gider',
      tarih: x.tarih,
      tarihKey: parseDateKey(x.tarih),
      tutar: x.tutar,
      ozet: (x.aciklama || '') + (x.kategori ? ' · ' + x.kategori : ''),
      kullanici: x.kullanici || '',
      onayDurum: ''
    });
  });
  store.readJson('invoices', []).forEach(function (f) {
    if (!matchUser(f.kullanici)) return;
    items.push({
      tip: 'fatura',
      tarih: f.tarih,
      tarihKey: parseDateKey(f.tarih),
      tutar: f.tutar,
      ozet: (f.faturaNo || '') + ' · ' + (f.tedarikci || ''),
      kullanici: f.kullanici || '',
      onayDurum: f.onayDurum || ''
    });
  });
  store.readJson('payments', []).forEach(function (o) {
    if (!matchUser(o.kullanici)) return;
    items.push({
      tip: 'odeme',
      tarih: o.tarih,
      tarihKey: parseDateKey(o.tarih),
      tutar: o.tutar,
      ozet: (o.tedarikci || '') + (o.yontem ? ' · ' + o.yontem : ''),
      kullanici: o.kullanici || '',
      onayDurum: o.onayDurum || ''
    });
  });

  items.sort(function (a, b) {
    if (a.tarihKey < b.tarihKey) return 1;
    if (a.tarihKey > b.tarihKey) return -1;
    return 0;
  });
  if (limit > 0 && items.length > limit) items = items.slice(0, limit);
  return items;
}

function getSession(ctx) {
  var sess = getSessionUser(ctx);
  if (!sess) {
    return { ok: true, loggedIn: false, session: null, message: 'Oturum yok.' };
  }
  var user = findUserById(sess.id);
  if (!user) {
    ctx.clearSession();
    return { ok: true, loggedIn: false, session: null, message: 'Oturum geçersiz.' };
  }
  sess.ad = user.ad;
  sess.rol = user.rol;
  return {
    ok: true,
    loggedIn: true,
    session: buildPublicSession(sess),
    message: 'Oturum açık.'
  };
}

/** google.script.run method handlers */
var handlers = {
  listUsersForLogin: function () {
    var users = store.readJson('users', []);
    var out = [];
    var seen = {};
    users.forEach(function (u) {
      if (u.aktif === false || !u.id || seen[u.id]) return;
      seen[u.id] = true;
      out.push({
        id: u.id,
        ad: u.ad || u.id,
        rol: u.rol || 'personel'
      });
    });
    if (!out.length) {
      cfg.TEST_USERS.forEach(function (u) {
        out.push({ id: u.id, ad: u.ad, rol: u.rol });
      });
    }
    return { ok: true, message: 'Tamam', users: out };
  },

  login: function (ctx, userId, accessCode) {
    var user = findUserById(userId);
    if (!user) {
      return { ok: false, message: 'Kullanıcı seçin.', session: null };
    }
    var kod = String(accessCode || '').trim();
    if (!kod || kod !== String(user.kod || '')) {
      return {
        ok: false,
        message: 'Şifre hatalı. Test şifresini kontrol edin (ör. TEST1234).',
        session: null
      };
    }
    var session = { id: user.id, ad: user.ad, rol: user.rol };
    ctx.setSession(session);
    try {
      logSuccessfulLogin(user);
    } catch (e) {
      // log opsiyonel
    }
    return {
      ok: true,
      message: 'Giriş başarılı. Merhaba ' + user.ad + '.',
      session: buildPublicSession(session)
    };
  },

  logout: function (ctx) {
    ctx.clearSession();
    return { ok: true, message: 'Çıkış yapıldı.' };
  },

  getSession: function (ctx) {
    return getSession(ctx);
  },

  session: function (ctx) {
    return getSession(ctx);
  },

  getPanelData: function (ctx) {
    var info = getAppInfo(ctx);
    info.summary = getPanelSummary();
    return info;
  },

  getPanelSummary: function () {
    return getPanelSummary();
  },

  listIncome: function (ctx, filtre) {
    filtre = filtre || {};
    var rows = withRows(store.readJson('income', []));
    if (filtre.kategori) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.kategori) === normalizeKeyPart(filtre.kategori);
      });
    }
    return { ok: true, message: 'Tamam', rows: rows };
  },

  addIncome: function (ctx, kayit) {
    var denied = denyUnlessWriter(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var tutar = parseTutar(kayit.tutar);
    if (!kayit.tarih || !kayit.aciklama || isNaN(tutar)) {
      return { ok: false, message: 'Gelir için tarih, tutar ve açıklama gerekli.' };
    }
    var list = store.readJson('income', []);
    if (findLocalDuplicate(list, txDedupKey, {
      tarih: kayit.tarih,
      tutar: tutar,
      aciklama: kayit.aciklama
    })) {
      return {
        ok: false,
        duplicate: true,
        message:
          'Aynı tarih + tutar + açıklama zaten var. Farklı bir işlemse açıklamayı ayırt edin.'
      };
    }
    list.push({
      tarih: kayit.tarih,
      tutar: tutar,
      aciklama: String(kayit.aciklama),
      kategori: kayit.kategori || '',
      kaynak: kayit.kaynak || '',
      not: kayit.not || '',
      kullanici: currentActorLabel(ctx)
    });
    store.writeJson('income', list);
    return { ok: true, message: 'Gelir kaydı eklendi.' };
  },

  listExpense: function (ctx, filtre) {
    filtre = filtre || {};
    var rows = withRows(store.readJson('expense', []));
    if (filtre.kategori) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.kategori) === normalizeKeyPart(filtre.kategori);
      });
    }
    return { ok: true, message: 'Tamam', rows: rows };
  },

  addExpense: function (ctx, kayit) {
    var denied = denyUnlessWriter(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var tutar = parseTutar(kayit.tutar);
    if (!kayit.tarih || !kayit.aciklama || isNaN(tutar)) {
      return { ok: false, message: 'Gider için tarih, tutar ve açıklama gerekli.' };
    }
    var kategori = String(kayit.kategori || '').trim();
    if (!kategori) {
      return { ok: false, message: 'Gider için kategori seçin.' };
    }
    var list = store.readJson('expense', []);
    if (findLocalDuplicate(list, txDedupKey, {
      tarih: kayit.tarih,
      tutar: tutar,
      aciklama: kayit.aciklama
    })) {
      return {
        ok: false,
        duplicate: true,
        message:
          'Aynı tarih + tutar + açıklama zaten var. Farklı bir işlemse açıklamayı ayırt edin.'
      };
    }
    list.push({
      tarih: kayit.tarih,
      tutar: tutar,
      aciklama: String(kayit.aciklama),
      kategori: kategori,
      not: kayit.not || '',
      kullanici: currentActorLabel(ctx)
    });
    store.writeJson('expense', list);
    return { ok: true, message: 'Gider kaydı eklendi.' };
  },

  listExpenseCategories: function () {
    return { ok: true, message: 'Tamam', categories: cfg.GIDER_KATEGORILERI.slice() };
  },

  listPayments: function (ctx, filtre) {
    filtre = filtre || {};
    var rows = withRows(store.readJson('payments', []));
    if (filtre.tedarikci) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.tedarikci) === normalizeKeyPart(filtre.tedarikci);
      });
    }
    if (filtre.faturaNo) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.faturaNo) === normalizeKeyPart(filtre.faturaNo);
      });
    }
    return { ok: true, message: 'Tamam', rows: rows };
  },

  addPayment: function (ctx, kayit) {
    var denied = denyUnlessWriter(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var tedarikci = String(kayit.tedarikci || '').trim();
    var tutar = parseTutar(kayit.tutar);
    var yontem = normalizeOdemeYontemi(kayit.yontem);
    if (!kayit.tarih || !tedarikci || isNaN(tutar)) {
      return { ok: false, message: 'Ödeme için tarih, tedarikçi ve tutar gerekli.' };
    }
    if (cfg.ODEME_YONTEMLERI.indexOf(yontem) < 0) {
      return {
        ok: false,
        message: 'Ödeme yöntemi: Nakit, Kredi kartı veya Vadeli seçin.'
      };
    }
    var list = store.readJson('payments', []);
    if (findLocalDuplicate(list, paymentDedupKey, {
      tarih: kayit.tarih,
      tedarikci: tedarikci,
      tutar: tutar,
      yontem: yontem,
      faturaNo: kayit.faturaNo || ''
    })) {
      return {
        ok: false,
        duplicate: true,
        message:
          'Aynı tarih + tedarikçi + tutar + yöntem + fatura no zaten var. ' +
          'Gerçekten ayrı bir ödeme ise not/tarihi ayırt edin.'
      };
    }
    var onayDurum = initialApprovalStatus(ctx);
    list.push({
      tarih: kayit.tarih,
      tedarikci: tedarikci,
      tutar: tutar,
      yontem: yontem,
      faturaNo: kayit.faturaNo || '',
      not: kayit.not || '',
      kullanici: currentActorLabel(ctx),
      onayDurum: onayDurum,
      dekontFileId: kayit.dekontFileId || '',
      dekontUrl: sanitizeDekontUrl(kayit.dekontUrl)
    });
    store.writeJson('payments', list);
    var rowNum = list.length + 1; // sheet-style: header + index → row = length+1
    refreshSupplierBalances(tedarikci);
    var ozet =
      yontem +
      ' · ' +
      tedarikci +
      ' · ' +
      tutar +
      (yontem === 'Vadeli' ? ' (vadeli — borç düşmez)' : '');
    createApproval(ctx, 'odeme', rowNum, ozet, onayDurum);
    var msg = 'Ödeme kaydı eklendi.';
    if (yontem === 'Vadeli') {
      msg += ' Vadeli: cari işlem kaydı; kalan borçtan düşülmez.';
    }
    if (onayDurum === cfg.ONAY_DURUM.BEKLIYOR) msg += ' Onay bekliyor.';
    return { ok: true, message: msg, row: rowNum, onayDurum: onayDurum };
  },

  listInvoices: function (ctx, filtre) {
    filtre = filtre || {};
    var rows = withRows(store.readJson('invoices', []));
    if (filtre.tedarikci) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.tedarikci) === normalizeKeyPart(filtre.tedarikci);
      });
    }
    if (filtre.faturaNo) {
      rows = rows.filter(function (r) {
        return normalizeKeyPart(r.faturaNo) === normalizeKeyPart(filtre.faturaNo);
      });
    }
    return { ok: true, message: 'Tamam', rows: rows };
  },

  addInvoice: function (ctx, kayit) {
    var denied = denyUnlessInvoiceManager(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var faturaNo = String(kayit.faturaNo || '').trim();
    var tedarikci = String(kayit.tedarikci || '').trim();
    var tutar = parseTutar(kayit.tutar);
    var yontem = normalizeOdemeYontemi(kayit.yontem || '');
    if (!faturaNo || !kayit.tarih || !tedarikci || isNaN(tutar)) {
      return {
        ok: false,
        message: 'Fatura için fatura no, tarih, tedarikçi ve tutar gerekli.'
      };
    }
    var list = store.readJson('invoices', []);
    if (findLocalDuplicate(list, invoiceDedupKey, {
      faturaNo: faturaNo,
      tedarikci: tedarikci
    })) {
      return {
        ok: false,
        duplicate: true,
        message:
          'Aynı fatura no + tedarikçi zaten var. Farklı bir fatura ise numarayı kontrol edin.'
      };
    }
    var onayDurum = initialApprovalStatus(ctx);
    list.push({
      faturaNo: faturaNo,
      tarih: kayit.tarih,
      tedarikci: tedarikci,
      tutar: tutar,
      vade: kayit.vade || '',
      durum: kayit.durum || 'Açık',
      not: kayit.not || '',
      yontem: yontem,
      kullanici: currentActorLabel(ctx),
      onayDurum: onayDurum,
      dekontFileId: kayit.dekontFileId || '',
      dekontUrl: sanitizeDekontUrl(kayit.dekontUrl)
    });
    store.writeJson('invoices', list);
    var rowNum = list.length + 1;
    refreshSupplierBalances(tedarikci);
    createApproval(
      ctx,
      'fatura',
      rowNum,
      faturaNo + ' · ' + tedarikci + ' · ' + tutar + (yontem ? ' · ' + yontem : ''),
      onayDurum
    );
    var msg = 'Fatura kaydı eklendi.';
    if (onayDurum === cfg.ONAY_DURUM.BEKLIYOR) msg += ' Onay bekliyor.';
    return { ok: true, message: msg, row: rowNum, onayDurum: onayDurum };
  },

  listSuppliers: function (ctx, opts) {
    opts = opts || {};
    refreshSupplierBalances();
    var rows = [];
    store.readJson('suppliers', []).forEach(function (s, i) {
      var ad = String(s.ad || '').trim();
      if (!ad) return;
      var aktif = s.aktif !== false;
      if (!opts.includeInactive && !aktif) return;
      rows.push({
        row: i + 2,
        ad: ad,
        telefon: s.telefon || '',
        not: s.not || '',
        kalanBorc: computeSupplierBalance(ad),
        aktif: aktif
      });
    });
    return { ok: true, message: 'Tamam', rows: rows };
  },

  addSupplier: function (ctx, tedarikci) {
    var denied = denyUnlessSupplierManager(ctx);
    if (denied) return denied;
    tedarikci = tedarikci || {};
    var ad = String(tedarikci.ad || '').trim();
    if (!ad) return { ok: false, message: 'Tedarikçi adı gerekli.' };
    var list = store.readJson('suppliers', []);
    for (var i = 0; i < list.length; i++) {
      if (normalizeKeyPart(list[i].ad) === normalizeKeyPart(ad)) {
        if (list[i].aktif === false) {
          list[i].aktif = true;
          if (tedarikci.telefon !== undefined) list[i].telefon = tedarikci.telefon;
          if (tedarikci.not !== undefined) list[i].not = tedarikci.not;
          list[i].kalanBorc = computeSupplierBalance(ad);
          store.writeJson('suppliers', list);
          return { ok: true, message: 'Pasif tedarikçi yeniden aktifleştirildi.' };
        }
        return { ok: false, message: 'Bu tedarikçi adı zaten var: ' + ad };
      }
    }
    list.push({
      ad: ad,
      telefon: tedarikci.telefon || '',
      not: tedarikci.not || '',
      kalanBorc: computeSupplierBalance(ad),
      aktif: true
    });
    store.writeJson('suppliers', list);
    return { ok: true, message: 'Tedarikçi eklendi.' };
  },

  updateSupplier: function (ctx, id, tedarikci) {
    var denied = denyUnlessSupplierManager(ctx);
    if (denied) return denied;
    tedarikci = tedarikci || {};
    var rowNum = Number(id);
    if (!rowNum || rowNum < 2) return { ok: false, message: 'Geçersiz satır numarası.' };
    var list = store.readJson('suppliers', []);
    var idx = rowNum - 2;
    if (!list[idx]) return { ok: false, message: 'Tedarikçi satırı bulunamadı.' };
    var ad =
      tedarikci.ad !== undefined ? String(tedarikci.ad).trim() : list[idx].ad;
    if (!ad) return { ok: false, message: 'Tedarikçi adı boş olamaz.' };
    for (var i = 0; i < list.length; i++) {
      if (i === idx) continue;
      if (normalizeKeyPart(list[i].ad) === normalizeKeyPart(ad)) {
        return { ok: false, message: 'Bu tedarikçi adı zaten var: ' + ad };
      }
    }
    var oldAd = String(list[idx].ad || '').trim();
    if (normalizeKeyPart(oldAd) !== normalizeKeyPart(ad)) {
      var oldKey = normalizeKeyPart(oldAd);
      var invoices = store.readJson('invoices', []);
      invoices.forEach(function (inv) {
        if (normalizeKeyPart(inv.tedarikci) === oldKey) inv.tedarikci = ad;
      });
      store.writeJson('invoices', invoices);
      var payments = store.readJson('payments', []);
      payments.forEach(function (pay) {
        if (normalizeKeyPart(pay.tedarikci) === oldKey) pay.tedarikci = ad;
      });
      store.writeJson('payments', payments);
    }
    list[idx].ad = ad;
    if (tedarikci.telefon !== undefined) list[idx].telefon = tedarikci.telefon;
    if (tedarikci.not !== undefined) list[idx].not = tedarikci.not;
    if (tedarikci.aktif !== undefined) list[idx].aktif = !!tedarikci.aktif;
    list[idx].kalanBorc = computeSupplierBalance(ad);
    store.writeJson('suppliers', list);
    return { ok: true, message: 'Tedarikçi güncellendi.' };
  },

  deleteSupplier: function (ctx, id) {
    return handlers.updateSupplier(ctx, id, { aktif: false });
  },

  listApprovals: function (ctx, filtre) {
    filtre = filtre || {};
    var denied = denyUnlessManager(ctx);
    if (denied && !requireStaff(ctx)) {
      return { ok: false, message: denied.message, rows: [] };
    }
    var isPatron = requirePatron(ctx);
    var me = currentActorLabel(ctx);
    var rows = withRows(store.readJson('approvals', []));
    rows = rows.filter(function (obj) {
      if (!isPatron && normalizeKeyPart(obj.kullanici) !== normalizeKeyPart(me)) {
        return false;
      }
      if (
        filtre.durum &&
        normalizeKeyPart(obj.durum) !== normalizeKeyPart(filtre.durum)
      ) {
        return false;
      }
      if (
        filtre.tip &&
        normalizeKeyPart(obj.tip) !== normalizeKeyPart(filtre.tip)
      ) {
        return false;
      }
      return true;
    });
    rows.reverse();
    return { ok: true, message: 'Tamam', rows: rows };
  },

  decideApproval: function (ctx, approvalId, karar) {
    var denied = denyUnlessManager(ctx);
    if (denied) return denied;
    var hedef = String(karar || '').trim();
    if (hedef !== cfg.ONAY_DURUM.ONAYLANDI && hedef !== cfg.ONAY_DURUM.RED) {
      return { ok: false, message: 'Karar Onaylandi veya Red olmalı.' };
    }
    var list = store.readJson('approvals', []);
    var id = String(approvalId || '').trim();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) !== id) continue;
      list[i].durum = hedef;
      store.writeJson('approvals', list);
      syncRefApprovalStatus(list[i].tip, list[i].refId, hedef);
      return {
        ok: true,
        message:
          hedef === cfg.ONAY_DURUM.ONAYLANDI
            ? 'İşlem onaylandı.'
            : 'İşlem reddedildi.'
      };
    }
    return { ok: false, message: 'Onay kaydı bulunamadı.' };
  },

  countPendingApprovals: function (ctx) {
    if (!requirePatron(ctx)) {
      return { ok: true, message: 'Tamam', count: 0 };
    }
    var list = handlers.listApprovals(ctx, { durum: cfg.ONAY_DURUM.BEKLIYOR });
    return {
      ok: !!list.ok,
      message: list.message || 'Tamam',
      count: (list.rows && list.rows.length) || 0
    };
  },

  getAdminTodaySummary: function (ctx) {
    var denied = denyUnlessManager(ctx);
    if (denied) {
      return {
        ok: false,
        message: denied.message,
        gelir: 0,
        gider: 0,
        fatura: 0,
        odeme: 0,
        faturaAdet: 0,
        odemeAdet: 0
      };
    }
    var today = todayKey();
    var gelir = 0;
    var gider = 0;
    var fatura = 0;
    var odeme = 0;
    var faturaAdet = 0;
    var odemeAdet = 0;
    store.readJson('income', []).forEach(function (r) {
      if (parseDateKey(r.tarih) === today) {
        var gt = parseTutar(r.tutar);
        if (!isNaN(gt)) gelir += gt;
      }
    });
    store.readJson('expense', []).forEach(function (r) {
      if (parseDateKey(r.tarih) === today) {
        var xt = parseTutar(r.tutar);
        if (!isNaN(xt)) gider += xt;
      }
    });
    store.readJson('invoices', []).forEach(function (r) {
      if (parseDateKey(r.tarih) === today) {
        faturaAdet++;
        var ft = parseTutar(r.tutar);
        if (!isNaN(ft)) fatura += ft;
      }
    });
    store.readJson('payments', []).forEach(function (r) {
      if (parseDateKey(r.tarih) === today) {
        odemeAdet++;
        var ot = parseTutar(r.tutar);
        if (!isNaN(ot)) odeme += ot;
      }
    });
    return {
      ok: true,
      message: 'Tamam',
      tarih: formatDateTr(),
      gelir: gelir,
      gider: gider,
      fatura: fatura,
      odeme: odeme,
      faturaAdet: faturaAdet,
      odemeAdet: odemeAdet
    };
  },

  getAdminRecentActivity: function (ctx, opts) {
    var denied = denyUnlessManager(ctx);
    if (denied) return { ok: false, message: denied.message, rows: [] };
    opts = opts || {};
    return {
      ok: true,
      message: 'Tamam',
      rows: collectActivity(null, Number(opts.limit) || 40)
    };
  },

  getMyRecentActivity: function (ctx, opts) {
    if (!requireStaff(ctx)) {
      return { ok: false, message: 'Profil için giriş yapın.', rows: [] };
    }
    opts = opts || {};
    return {
      ok: true,
      message: 'Tamam',
      rows: collectActivity(
        { ad: currentActorLabel(ctx), id: currentActorId(ctx) },
        Number(opts.limit) || 25
      )
    };
  },

  getAdminFilteredReport: function (ctx, filtre) {
    try {
      var denied = denyUnlessManager(ctx);
      if (denied) {
        return {
          ok: false,
          message: denied.message,
          faturalar: [],
          gelirler: [],
          giderler: [],
          odemeler: [],
          userTotals: [],
          ozet: null
        };
      }
      filtre = filtre || {};
      var ted = String(filtre.tedarikci || '').trim();
      var kullanici = normalizeUserFilterToken(filtre.kullanici);
      var kullaniciId = String(filtre.kullaniciId || filtre.userId || '').trim();
      var range = resolveAdminFilterRange(filtre);
      var bas = range.bas;
      var bit = range.bit;
      var byUser = {};
      function bumpUser(ad, tip, tutar) {
        var name = String(ad || '—').trim() || '—';
        if (!byUser[name]) {
          byUser[name] = { ad: name, gelir: 0, gider: 0, gelirAdet: 0, giderAdet: 0 };
        }
        if (tip === 'gelir') {
          byUser[name].gelir += tutar;
          byUser[name].gelirAdet++;
        } else {
          byUser[name].gider += tutar;
          byUser[name].giderAdet++;
        }
      }
      var faturalar = withRows(store.readJson('invoices', []))
        .filter(function (r) {
          if (ted && normalizeKeyPart(r.tedarikci) !== normalizeKeyPart(ted)) return false;
          if (!matchKullaniciFilter(r.kullanici, kullanici, kullaniciId)) return false;
          return inDateRange(r.tarih, bas, bit);
        })
        .map(function (r) {
          return serializeAdminRow(r, 'fatura');
        });
      var odemeler = withRows(store.readJson('payments', []))
        .filter(function (r) {
          if (ted && normalizeKeyPart(r.tedarikci) !== normalizeKeyPart(ted)) return false;
          if (!matchKullaniciFilter(r.kullanici, kullanici, kullaniciId)) return false;
          return inDateRange(r.tarih, bas, bit);
        })
        .map(function (r) {
          return serializeAdminRow(r, 'odeme');
        });
      var gelirRaw = store.readJson('income', []).filter(function (r) {
        if (!matchKullaniciFilter(r.kullanici, kullanici, kullaniciId)) return false;
        return inDateRange(r.tarih, bas, bit);
      });
      var giderRaw = store.readJson('expense', []).filter(function (r) {
        if (!matchKullaniciFilter(r.kullanici, kullanici, kullaniciId)) return false;
        return inDateRange(r.tarih, bas, bit);
      });
      var gelirToplam = 0;
      var giderToplam = 0;
      gelirRaw.forEach(function (r) {
        var t = parseTutar(r.tutar);
        if (!isNaN(t)) {
          gelirToplam += t;
          bumpUser(r.kullanici, 'gelir', t);
        }
      });
      giderRaw.forEach(function (r) {
        var t = parseTutar(r.tutar);
        if (!isNaN(t)) {
          giderToplam += t;
          bumpUser(r.kullanici, 'gider', t);
        }
      });
      var gelirler = withRows(gelirRaw).map(function (r) {
        return serializeAdminRow(r, 'gelir');
      });
      var giderler = withRows(giderRaw).map(function (r) {
        return serializeAdminRow(r, 'gider');
      });
      var userTotals = Object.keys(byUser).map(function (k) {
        return byUser[k];
      });
      userTotals.sort(function (a, b) {
        return b.gider - a.gider;
      });
      var label = kullanici || kullaniciId;
      var aralik =
        range.basTr && range.bitTr ? range.basTr + ' – ' + range.bitTr : 'seçilen aralık';
      var ozetMetin = '';
      if (label) {
        ozetMetin =
          label +
          ' bu aralıkta (' +
          aralik +
          ') ' +
          formatTutarTr(giderToplam) +
          ' ₺ gider' +
          (gelirToplam ? ' · ' + formatTutarTr(gelirToplam) + ' ₺ gelir' : '');
      }
      return {
        ok: true,
        message: ozetMetin || 'Tamam',
        filtre: {
          tedarikci: ted,
          kullanici: kullanici,
          kullaniciId: kullaniciId,
          baslangic: bas,
          bitis: bit,
          baslangicTr: range.basTr,
          bitisTr: range.bitTr,
          weekPreset: range.weekPreset,
          weekLabel: range.weekLabel
        },
        ozet: {
          kullanici: label,
          gelirToplam: gelirToplam,
          giderToplam: giderToplam,
          gelirAdet: gelirler.length,
          giderAdet: giderler.length,
          metin: ozetMetin,
          aralik: aralik
        },
        userTotals: userTotals,
        faturalar: faturalar,
        odemeler: odemeler,
        gelirler: gelirler,
        giderler: giderler
      };
    } catch (e) {
      return {
        ok: false,
        message: 'Filtre sırasında hata: ' + (e && e.message ? e.message : String(e)),
        faturalar: [],
        gelirler: [],
        giderler: [],
        odemeler: [],
        userTotals: [],
        ozet: null
      };
    }
  },

  getAdminUserTotals: function (ctx, filtre) {
    var result = module.exports.getAdminFilteredReport(ctx, filtre || {});
    if (!result || !result.ok) {
      return {
        ok: false,
        message: (result && result.message) || 'Toplam alınamadı.',
        rows: [],
        ozet: null
      };
    }
    return {
      ok: true,
      message: (result.ozet && result.ozet.metin) || 'Tamam',
      filtre: result.filtre,
      rows: result.userTotals || [],
      ozet: result.ozet
    };
  },

  getAdminMonthlyCharts: function (ctx) {
    var denied = denyUnlessManager(ctx);
    if (denied) {
      return { ok: false, message: denied.message, labels: [], fatura: [], odeme: [] };
    }
    var mapF = {};
    var mapO = {};
    store.readJson('invoices', []).forEach(function (r) {
      var mk = monthKey(r.tarih);
      if (!mk) return;
      var ft = parseTutar(r.tutar);
      if (isNaN(ft)) return;
      mapF[mk] = (mapF[mk] || 0) + ft;
    });
    store.readJson('payments', []).forEach(function (r) {
      var mk = monthKey(r.tarih);
      if (!mk) return;
      var ot = parseTutar(r.tutar);
      if (isNaN(ot)) return;
      mapO[mk] = (mapO[mk] || 0) + ot;
    });
    var keys = {};
    Object.keys(mapF).forEach(function (k) {
      keys[k] = true;
    });
    Object.keys(mapO).forEach(function (k) {
      keys[k] = true;
    });
    var labels = Object.keys(keys).sort();
    if (labels.length > 6) labels = labels.slice(labels.length - 6);
    var fatura = [];
    var odeme = [];
    labels.forEach(function (k) {
      fatura.push(Math.round((mapF[k] || 0) * 100) / 100);
      odeme.push(Math.round((mapO[k] || 0) * 100) / 100);
    });
    return { ok: true, message: 'Tamam', labels: labels, fatura: fatura, odeme: odeme };
  },

  listPaymentMethods: function () {
    return { ok: true, methods: cfg.ODEME_YONTEMLERI.slice() };
  },

  listUsersAdmin: function (ctx) {
    var denied = denyUnlessManager(ctx);
    if (denied) return { ok: false, message: denied.message, rows: [] };
    var rows = withRows(store.readJson('users', []));
    return { ok: true, message: 'Tamam (kodlar test only)', rows: rows };
  },

  addUserAdmin: function (ctx, kayit) {
    var denied = denyUnlessManager(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var id = String(kayit.id || '').trim();
    var ad = String(kayit.ad || '').trim();
    var rol = String(kayit.rol || 'personel').trim();
    var kod = String(kayit.kod || '').trim();
    if (!id || !ad || !kod) {
      return { ok: false, message: 'Id, ad ve şifre gerekli (test only).' };
    }
    if (rol !== 'patron' && rol !== 'personel') {
      return { ok: false, message: 'Rol patron veya personel olmalı.' };
    }
    var list = store.readJson('users', []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        return { ok: false, message: 'Bu kullanıcı id zaten var: ' + id };
      }
    }
    list.push({
      id: id,
      email: String(kayit.email || id + '@example.com').trim(),
      rol: rol,
      ad: ad,
      aktif: true,
      kod: kod
    });
    store.writeJson('users', list);
    return { ok: true, message: 'Kullanıcı eklendi (test only kod sheet’te).' };
  },

  updateUserAdmin: function (ctx, userId, kayit) {
    var denied = denyUnlessManager(ctx);
    if (denied) return denied;
    kayit = kayit || {};
    var id = String(userId || '').trim();
    var list = store.readJson('users', []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      if (kayit.ad !== undefined) list[i].ad = String(kayit.ad).trim();
      if (kayit.rol !== undefined) list[i].rol = String(kayit.rol).trim();
      if (kayit.email !== undefined) list[i].email = String(kayit.email).trim();
      if (kayit.kod !== undefined) list[i].kod = String(kayit.kod).trim();
      if (kayit.aktif !== undefined) list[i].aktif = !!kayit.aktif;
      if (!list[i].ad) return { ok: false, message: 'Ad boş olamaz.' };
      if (list[i].rol !== 'patron' && list[i].rol !== 'personel') {
        return { ok: false, message: 'Rol patron veya personel olmalı.' };
      }
      store.writeJson('users', list);
      return { ok: true, message: 'Kullanıcı güncellendi.' };
    }
    return { ok: false, message: 'Kullanıcı bulunamadı (önce senkron / örnek veri).' };
  },

  deactivateUserAdmin: function (ctx, userId) {
    return handlers.updateUserAdmin(ctx, userId, { aktif: false });
  },

  uploadDekont: function (ctx, payload) {
    var denied = denyUnlessWriter(ctx);
    if (denied) return { ok: false, message: denied.message, fileId: '', url: '' };
    payload = payload || {};
    var b64 = String(payload.base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!b64) return { ok: false, message: 'Dosya verisi yok.', fileId: '', url: '' };
    var approx = Math.floor((b64.length * 3) / 4);
    if (approx > cfg.DEKONT_MAX_BYTES) {
      return {
        ok: false,
        message: 'Dosya çok büyük. En fazla ~5 MB yükleyin.',
        fileId: '',
        url: ''
      };
    }
    var mime = String(payload.mimeType || 'application/octet-stream').trim();
    if (mime.indexOf('image/') !== 0 && mime !== 'application/pdf') {
      return {
        ok: false,
        message: 'Yalnızca görsel veya PDF yükleyin.',
        fileId: '',
        url: ''
      };
    }
    var name = String(payload.fileName || 'dekont').trim() || 'dekont';
    name = name.replace(/[\\/?%*:|"<>]/g, '_');
    var stamp = new Date();
    var stampStr =
      stamp.getFullYear() +
      String(stamp.getMonth() + 1).padStart(2, '0') +
      String(stamp.getDate()).padStart(2, '0') +
      '-' +
      String(stamp.getHours()).padStart(2, '0') +
      String(stamp.getMinutes()).padStart(2, '0') +
      String(stamp.getSeconds()).padStart(2, '0');
    var actor = currentActorId(ctx) || 'user';
    var fullName = stampStr + '_' + actor + '_' + name;
    store.ensureDirs();
    var buf = Buffer.from(b64, 'base64');
    var abs = path.join(store.UPLOADS_DIR, fullName);
    fs.writeFileSync(abs, buf);
    var fileId = 'local:' + fullName;
    var url = '/uploads/' + encodeURIComponent(fullName);
    return { ok: true, message: 'Dekont yüklendi.', fileId: fileId, url: url };
  },

  getDekontFolder: function () {
    store.ensureDirs();
    return {
      ok: true,
      message: 'Tamam',
      folderId: 'local-uploads',
      folderUrl: '/uploads/'
    };
  },

  getConfig: function () {
    return {
      BRAND_NAME: cfg.BRAND_NAME,
      BRAND_SUBTITLE: cfg.BRAND_SUBTITLE,
      ENVIRONMENT_LABEL: cfg.ENVIRONMENT_LABEL,
      ODEME_YONTEMLERI: cfg.ODEME_YONTEMLERI,
      GIDER_KATEGORILERI: cfg.GIDER_KATEGORILERI,
      ONAY_DURUM: cfg.ONAY_DURUM,
      TEST_USERS: cfg.TEST_USERS.map(function (u) {
        return { id: u.id, ad: u.ad, rol: u.rol };
      })
    };
  },

  /** Patron: haftalık özeti simüle et (e-posta yok; local/data/weekly-digest.json). */
  runWeeklyDigest: function (ctx, opts) {
    var denied = denyUnlessManager(ctx);
    if (denied) {
      return { ok: false, message: denied.message, digest: null, mailed: false };
    }
    opts = opts || {};
    if (!opts.weekMode) opts.weekMode = 'auto';
    var digest = buildWeeklyDigest(opts);
    store.writeJson('weekly-digest', digest);
    var modeNote = digest.note
      ? ' ' + digest.note
      : ' Dönem: ' + digest.weekLabel + '.';
    return {
      ok: true,
      message:
        'Haftalık özet simüle edildi (e-posta gönderilmedi).' +
        modeNote +
        ' Sonuç: local/data/weekly-digest.json',
      mailed: false,
      digest: digest
    };
  },

  getLastWeeklyDigest: function (ctx) {
    var denied = denyUnlessManager(ctx);
    if (denied) {
      return { ok: false, message: denied.message, digest: null };
    }
    var digest = store.readJson('weekly-digest', null);
    if (!digest) {
      return {
        ok: true,
        message: 'Henüz haftalık özet üretilmedi. «Özeti simüle et» ile oluşturun.',
        digest: null
      };
    }
    return { ok: true, message: 'Son haftalık özet.', digest: digest };
  },

  installWeeklyDigestTrigger: function (ctx) {
    var denied = denyUnlessManager(ctx);
    if (denied) {
      return { ok: false, message: denied.message };
    }
    return {
      ok: true,
      message:
        'Localhost’ta zamanlayıcı yok. GAS’ta installWeeklyDigestTrigger() → Pazartesi 09:00 Europe/Istanbul.'
    };
  }
};

function dispatch(method, args, ctx) {
  if (!handlers[method]) {
    var err = new Error('Bilinmeyen API: ' + method);
    err.code = 'UNKNOWN_METHOD';
    throw err;
  }
  return handlers[method].apply(null, [ctx].concat(args || []));
}

module.exports = {
  dispatch,
  handlers,
  getAppInfo,
  cfg
};
