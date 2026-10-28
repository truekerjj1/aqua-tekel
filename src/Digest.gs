/**
 * Aqua Tekel — Pazartesi 09:00 Europe/Istanbul haftalık özet (sandbox)
 *
 * Varsayılan: önceki takvim haftası (Pzt–Paz). Simülasyonda weekMode:
 *   previous | current | auto (önceki boşsa bu hafta).
 * Ödemeler (toplam + firma), faturalar, gelir/gider (toplam + kullanıcı),
 * başarılı girişler. Son özet PropertiesService’te saklanır.
 * E-posta: MailApp (isteğe bağlı; scope yoksa yalnız in-app).
 *
 * Trigger: installWeeklyDigestTrigger() → ScriptApp Pazartesi 09:00 Istanbul.
 * Localhost: runWeeklyDigest / getLastWeeklyDigest mock (local/api.js).
 */

var DIGEST_PROP_KEY = 'AQUA_TEKEL_LAST_WEEKLY_DIGEST';
/** Config.SHEETS.GIRIS_LOG ile aynı — 'GirisLog' */
var LOGIN_SHEET_NAME = 'GirisLog';

/**
 * İstanbul yyyy-MM-dd.
 * @param {Date=} d
 * @return {string}
 */
function digestDateKey_(d) {
  return Utilities.formatDate(d || new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');
}

/**
 * İstanbul’da verilen referans günün bulunduğu haftanın Pzt–Paz aralığı.
 * @param {Date} noonUtc — UTC öğlen referansı (hafta kayması önlemek için)
 * @param {number} weekOffset — 0 = bu hafta, -1 = önceki hafta
 * @return {{baslangic: string, bitis: string, baslangicTr: string, bitisTr: string}}
 */
function weekRangeFromNoon_(noonUtc, weekOffset) {
  var dow = Number(Utilities.formatDate(noonUtc, 'Europe/Istanbul', 'u')); // 1=Pzt … 7=Paz
  var thisMon = new Date(noonUtc.getTime() - (dow - 1) * 86400000);
  var mon = new Date(thisMon.getTime() + weekOffset * 7 * 86400000);
  var sun = new Date(mon.getTime() + 6 * 86400000);
  function tr(d) {
    return Utilities.formatDate(d, 'Europe/Istanbul', 'dd.MM.yyyy');
  }
  function iso(d) {
    return Utilities.formatDate(d, 'Europe/Istanbul', 'yyyy-MM-dd');
  }
  return {
    baslangic: iso(mon),
    bitis: iso(sun),
    baslangicTr: tr(mon),
    bitisTr: tr(sun)
  };
}

/**
 * Referans tarihin UTC öğlen karşılığı (İstanbul gününe göre).
 * @param {Date=} ref
 * @return {Date}
 */
function istanbulNoonUtc_(ref) {
  ref = ref || new Date();
  var key = digestDateKey_(ref);
  var parts = key.split('-');
  var y = Number(parts[0]);
  var m = Number(parts[1]) - 1;
  var day = Number(parts[2]);
  return new Date(Date.UTC(y, m, day, 9, 0, 0));
}

/**
 * Önceki takvim haftası Pazartesi–Pazar (İstanbul).
 * Pazartesi sabah brifingi: tamamlanan haftayı özetler.
 * @param {Date=} ref
 * @return {{baslangic: string, bitis: string, baslangicTr: string, bitisTr: string}}
 */
function previousWeekRangeIstanbul_(ref) {
  return weekRangeFromNoon_(istanbulNoonUtc_(ref), -1);
}

/**
 * Bu takvim haftası Pazartesi–Pazar (İstanbul).
 * @param {Date=} ref
 * @return {{baslangic: string, bitis: string, baslangicTr: string, bitisTr: string}}
 */
function currentWeekRangeIstanbul_(ref) {
  return weekRangeFromNoon_(istanbulNoonUtc_(ref), 0);
}

/**
 * weekMode: previous | current | auto
 * @param {string=} mode
 * @param {Date=} ref
 * @return {string}
 */
function normalizeWeekMode_(mode) {
  var m = String(mode || '').trim().toLowerCase();
  if (m === 'current' || m === 'bu' || m === 'bu_hafta' || m === 'this') {
    return 'current';
  }
  if (m === 'auto' || m === 'otomatik') {
    return 'auto';
  }
  return 'previous';
}

/**
 * Seçilen hafta aralığını döndürür (etiketli).
 * @param {string} mode
 * @param {Date=} ref
 * @return {{baslangic: string, bitis: string, baslangicTr: string, bitisTr: string, weekMode: string, weekLabel: string}}
 */
function resolveWeekRange_(mode, ref) {
  mode = normalizeWeekMode_(mode);
  var range;
  var label;
  if (mode === 'current') {
    range = currentWeekRangeIstanbul_(ref);
    label = 'bu hafta';
  } else {
    range = previousWeekRangeIstanbul_(ref);
    label = 'önceki hafta';
    mode = 'previous';
  }
  return {
    baslangic: range.baslangic,
    bitis: range.bitis,
    baslangicTr: range.baslangicTr,
    bitisTr: range.bitisTr,
    weekMode: mode,
    weekLabel: label
  };
}

/**
 * Aralıkta herhangi bir gelir/gider/ödeme/fatura var mı?
 * @param {string} bas
 * @param {string} bit
 * @return {boolean}
 */
function hasActivityInRange_(bas, bit) {
  var i;
  var pay = listPayments({});
  if (pay && pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      if (inDateRange_(pay.rows[i].tarih, bas, bit)) return true;
    }
  }
  var inv = listInvoices({});
  if (inv && inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      if (inDateRange_(inv.rows[i].tarih, bas, bit)) return true;
    }
  }
  var inc = listIncome({});
  if (inc && inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      if (inDateRange_(inc.rows[i].tarih, bas, bit)) return true;
    }
  }
  var exp = listExpense({});
  if (exp && exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      if (inDateRange_(exp.rows[i].tarih, bas, bit)) return true;
    }
  }
  return false;
}

/**
 * Başarılı giriş logunu yazar (minimal). Sheet yoksa sessizce geçer.
 * @param {string} userId
 * @param {string} ad
 * @param {string} rol
 */
function logSuccessfulLogin_(userId, ad, rol) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sh = ss.getSheetByName(LOGIN_SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(LOGIN_SHEET_NAME);
      sh.appendRow(['Tarih', 'Saat', 'UserId', 'Ad', 'Rol']);
      sh.setFrozenRows(1);
    }
    var now = new Date();
    sh.appendRow([
      Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy'),
      Utilities.formatDate(now, 'Europe/Istanbul', 'HH:mm:ss'),
      String(userId || ''),
      String(ad || ''),
      String(rol || '')
    ]);
  } catch (e) {
    // log başarısız olsa girişi bozma
  }
}

/**
 * Giriş loglarından aralık sayımı.
 * @param {string} bas yyyy-MM-dd
 * @param {string} bit yyyy-MM-dd
 * @return {{toplam: number, byUser: Array<{ad: string, adet: number}>}}
 */
function countLoginsInRange_(bas, bit) {
  var byUser = {};
  var toplam = 0;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { toplam: 0, byUser: [] };
    var sh = ss.getSheetByName(LOGIN_SHEET_NAME);
    if (!sh || sh.getLastRow() < 2) return { toplam: 0, byUser: [] };
    var values = sh.getRange(2, 1, sh.getLastRow(), 5).getValues();
    for (var i = 0; i < values.length; i++) {
      var k = parseDateKey_(values[i][0]);
      if (!k || (bas && k < bas) || (bit && k > bit)) continue;
      toplam++;
      var ad = String(values[i][3] || values[i][2] || '—').trim() || '—';
      byUser[ad] = (byUser[ad] || 0) + 1;
    }
  } catch (e) {
    return { toplam: 0, byUser: [] };
  }
  var list = Object.keys(byUser).map(function (ad) {
    return { ad: ad, adet: byUser[ad] };
  });
  list.sort(function (a, b) {
    return b.adet - a.adet;
  });
  return { toplam: toplam, byUser: list };
}

/**
 * Kullanıcı bazlı tutar haritasını sıralı diziye çevirir.
 * @param {Object} map
 * @return {Array<{ad: string, tutar: number, adet: number}>}
 */
function mapToUserTotals_(map) {
  var list = Object.keys(map).map(function (k) {
    return map[k];
  });
  list.sort(function (a, b) {
    return b.tutar - a.tutar;
  });
  return list;
}

/**
 * Haftalık özet nesnesini üretir.
 * opts.weekMode: previous (varsayılan tetikleyici) | current | auto
 * auto: önceki hafta boşsa bu haftaya düşer (simülasyon için).
 * @param {Object=} opts
 * @return {Object}
 */
function buildWeeklyDigest_(opts) {
  opts = opts || {};
  var ref = opts.refDate ? new Date(opts.refDate) : new Date();
  var requested = normalizeWeekMode_(opts.weekMode || 'previous');
  var resolvedMode = requested;
  var autoFellBack = false;
  var note = '';

  if (requested === 'auto') {
    var prev = previousWeekRangeIstanbul_(ref);
    if (hasActivityInRange_(prev.baslangic, prev.bitis)) {
      resolvedMode = 'previous';
      note = 'Otomatik: önceki haftada kayıt var.';
    } else {
      resolvedMode = 'current';
      autoFellBack = true;
      note =
        'Otomatik: önceki hafta boş — bu haftanın (Pzt–bugün/Paz) kayıtları özetlendi.';
    }
  }

  var range = resolveWeekRange_(resolvedMode, ref);
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
  var i;

  function bumpUser(map, ad, tutar) {
    var name = String(ad || '—').trim() || '—';
    if (!map[name]) map[name] = { ad: name, tutar: 0, adet: 0 };
    map[name].tutar += tutar;
    map[name].adet++;
  }

  var pay = listPayments({});
  if (pay && pay.ok) {
    for (i = 0; i < pay.rows.length; i++) {
      var pr = pay.rows[i];
      if (!inDateRange_(pr.tarih, bas, bit)) continue;
      var pt = parseTutar(pr.tutar);
      if (isNaN(pt)) continue;
      odemeToplam += pt;
      odemeAdet++;
      var firm = String(pr.tedarikci || '—').trim() || '—';
      if (!byFirm[firm]) byFirm[firm] = { ad: firm, tutar: 0, adet: 0 };
      byFirm[firm].tutar += pt;
      byFirm[firm].adet++;
    }
  }

  var inv = listInvoices({});
  if (inv && inv.ok) {
    for (i = 0; i < inv.rows.length; i++) {
      var ir = inv.rows[i];
      if (!inDateRange_(ir.tarih, bas, bit)) continue;
      var it = parseTutar(ir.tutar);
      if (isNaN(it)) continue;
      faturaToplam += it;
      faturaAdet++;
    }
  }

  var inc = listIncome({});
  if (inc && inc.ok) {
    for (i = 0; i < inc.rows.length; i++) {
      var gr = inc.rows[i];
      if (!inDateRange_(gr.tarih, bas, bit)) continue;
      var gt = parseTutar(gr.tutar);
      if (isNaN(gt)) continue;
      gelirToplam += gt;
      gelirAdet++;
      bumpUser(gelirByUser, gr.kullanici, gt);
    }
  }

  var exp = listExpense({});
  if (exp && exp.ok) {
    for (i = 0; i < exp.rows.length; i++) {
      var er = exp.rows[i];
      if (!inDateRange_(er.tarih, bas, bit)) continue;
      var et = parseTutar(er.tutar);
      if (isNaN(et)) continue;
      giderToplam += et;
      giderAdet++;
      bumpUser(giderByUser, er.kullanici, et);
    }
  }

  var firms = Object.keys(byFirm).map(function (k) {
    return byFirm[k];
  });
  firms.sort(function (a, b) {
    return b.tutar - a.tutar;
  });

  var gelirUsers = mapToUserTotals_(gelirByUser);
  var giderUsers = mapToUserTotals_(giderByUser);
  var logins = countLoginsInRange_(bas, bit);
  var now = new Date();

  return {
    ok: true,
    generatedAt: Utilities.formatDate(now, 'Europe/Istanbul', "yyyy-MM-dd'T'HH:mm:ss"),
    generatedAtTr: Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy HH:mm'),
    timezone: 'Europe/Istanbul',
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
    metin: formatWeeklyDigestText_({
      range: range,
      weekLabel: range.weekLabel,
      note: note,
      odemeToplam: odemeToplam,
      odemeAdet: odemeAdet,
      firms: firms,
      faturaToplam: faturaToplam,
      faturaAdet: faturaAdet,
      gelirToplam: gelirToplam,
      giderToplam: giderToplam,
      gelirUsers: gelirUsers,
      giderUsers: giderUsers,
      girisToplam: logins.toplam,
      byUser: logins.byUser
    })
  };
}

/**
 * Patrona okunaklı Türkçe brifing metni.
 * @param {Object} d
 * @return {string}
 */
function formatWeeklyDigestText_(d) {
  var lines = [];
  lines.push('Aqua Tekel — Haftalık Özet');
  lines.push(
    'Dönem: ' +
      d.range.baslangicTr +
      ' – ' +
      d.range.bitisTr +
      ' (' +
      (d.weekLabel || 'önceki hafta') +
      ')'
  );
  if (d.note) {
    lines.push(d.note);
  }
  lines.push('');
  lines.push(
    'Bu dönemde toplam ' +
      formatDigestMoney_(d.odemeToplam) +
      ' ₺ ödeme yapıldı (' +
      d.odemeAdet +
      ' kayıt).'
  );
  if (d.firms && d.firms.length) {
    lines.push('Firmalara göre:');
    for (var i = 0; i < d.firms.length; i++) {
      var f = d.firms[i];
      lines.push(
        '  · ' + f.ad + ': ' + formatDigestMoney_(f.tutar) + ' ₺ (' + f.adet + ' ödeme)'
      );
    }
  } else {
    lines.push('Firmalara ödeme kaydı yok.');
  }
  lines.push(
    'Faturalar: ' +
      formatDigestMoney_(d.faturaToplam) +
      ' ₺ (' +
      d.faturaAdet +
      ' adet)'
  );
  lines.push(
    'Gelir: ' +
      formatDigestMoney_(d.gelirToplam) +
      ' ₺ · Gider: ' +
      formatDigestMoney_(d.giderToplam) +
      ' ₺'
  );
  if (d.giderUsers && d.giderUsers.length) {
    lines.push('Kullanıcı bazlı gider:');
    for (var g = 0; g < d.giderUsers.length; g++) {
      var gu = d.giderUsers[g];
      lines.push(
        '  · ' +
          gu.ad +
          ': ' +
          formatDigestMoney_(gu.tutar) +
          ' ₺ gider (' +
          gu.adet +
          ' kayıt)'
      );
    }
  }
  if (d.gelirUsers && d.gelirUsers.length) {
    lines.push('Kullanıcı bazlı gelir:');
    for (var h = 0; h < d.gelirUsers.length; h++) {
      var hu = d.gelirUsers[h];
      lines.push(
        '  · ' +
          hu.ad +
          ': ' +
          formatDigestMoney_(hu.tutar) +
          ' ₺ gelir (' +
          hu.adet +
          ' kayıt)'
      );
    }
  }
  lines.push('Kullanıcı girişleri: ' + d.girisToplam + ' başarılı giriş.');
  if (d.byUser && d.byUser.length) {
    for (var j = 0; j < d.byUser.length; j++) {
      lines.push('  · ' + d.byUser[j].ad + ': ' + d.byUser[j].adet);
    }
  }
  return lines.join('\n');
}

/**
 * @param {number} n
 * @return {string}
 */
function formatDigestMoney_(n) {
  if (n == null || isNaN(Number(n))) return '0';
  return (Math.round(Number(n) * 100) / 100).toLocaleString('tr-TR');
}

/**
 * Son özeti saklar.
 * @param {Object} digest
 */
function storeLastWeeklyDigest_(digest) {
  PropertiesService.getScriptProperties().setProperty(
    DIGEST_PROP_KEY,
    JSON.stringify(digest)
  );
}

/**
 * Zamanlayıcı veya menü / istemci: haftalık özeti üret, sakla, isteğe bağlı e-posta.
 * google.script.run → runWeeklyDigest
 * @param {Object=} opts — {sendEmail, fromTrigger, weekMode, refDate}
 * @return {Object}
 */
function runWeeklyDigest(opts) {
  opts = opts || {};
  // Zamanlayıcıdan gelince oturum yok — tetikleyici güvenilir; manuel için patron.
  var fromTrigger = !!opts.fromTrigger;
  if (!fromTrigger) {
    var denied = denyUnlessManager();
    if (denied) {
      return { ok: false, message: denied.message, digest: null };
    }
  }

  // Tetikleyici daima önceki tamamlanan haftayı özetler.
  if (fromTrigger && !opts.weekMode) {
    opts.weekMode = 'previous';
  }
  // Manuel simülasyonda varsayılan: otomatik (önceki boşsa bu hafta).
  if (!fromTrigger && !opts.weekMode) {
    opts.weekMode = 'auto';
  }

  var digest = buildWeeklyDigest_(opts);
  storeLastWeeklyDigest_(digest);

  var mailed = false;
  var mailNote = '';
  if (opts.sendEmail !== false) {
    try {
      var cfg = getConfig();
      var to = (cfg.PATRON_EMAILS && cfg.PATRON_EMAILS[0]) || '';
      if (to && typeof MailApp !== 'undefined') {
        MailApp.sendEmail({
          to: to,
          subject:
            'Aqua Tekel — Haftalık Özet (' +
            digest.period.baslangicTr +
            ' – ' +
            digest.period.bitisTr +
            ')',
          body: digest.metin
        });
        mailed = true;
        mailNote = 'E-posta gönderildi.';
      } else {
        mailNote = 'E-posta atlandı (alıcı veya MailApp yok); özet kaydedildi.';
      }
    } catch (e) {
      mailNote = 'E-posta gönderilemedi; özet yine de kaydedildi.';
    }
  } else {
    mailNote = 'E-posta simülasyonunda gönderilmedi.';
  }

  var modeNote = digest.note
    ? ' ' + digest.note
    : ' Dönem: ' + digest.weekLabel + '.';

  return {
    ok: true,
    message: 'Haftalık özet hazır.' + modeNote + ' ' + mailNote,
    mailed: mailed,
    digest: digest
  };
}

/**
 * Zamanlayıcı girişi.
 */
function triggerWeeklyDigest() {
  runWeeklyDigest({ fromTrigger: true, sendEmail: true, weekMode: 'previous' });
}

/**
 * Son saklanan özeti döndürür (patron).
 * google.script.run → getLastWeeklyDigest
 * @return {Object}
 */
function getLastWeeklyDigest() {
  var denied = denyUnlessManager();
  if (denied) {
    return { ok: false, message: denied.message, digest: null };
  }
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(DIGEST_PROP_KEY);
    if (!raw) {
      return {
        ok: true,
        message: 'Henüz haftalık özet üretilmedi.',
        digest: null
      };
    }
    return {
      ok: true,
      message: 'Son haftalık özet.',
      digest: JSON.parse(raw)
    };
  } catch (e) {
    return { ok: false, message: 'Özet okunamadı.', digest: null };
  }
}

/**
 * Pazartesi 09:00 Europe/Istanbul tetikleyicisini kurar (eski haftalıkları temizler).
 * Menü / yapıştırma sonrası bir kez çalıştırın.
 * @return {{ok: boolean, message: string}}
 */
function installWeeklyDigestTrigger() {
  // Menüden (oturumsuz Script sahibi) veya patron oturumundan.
  if (getSessionUser_()) {
    var denied = denyUnlessManager();
    if (denied) return denied;
  }

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'triggerWeeklyDigest') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('triggerWeeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .inTimezone('Europe/Istanbul')
    .create();

  return {
    ok: true,
    message:
      'Haftalık özet tetikleyicisi kuruldu: her Pazartesi 09:00 Europe/Istanbul → triggerWeeklyDigest (önceki Pzt–Paz).'
  };
}
