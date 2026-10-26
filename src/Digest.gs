/**
 * Aqua Tekel — Pazartesi 09:00 Europe/Istanbul haftalık özet (sandbox)
 *
 * Önceki takvim haftası (Pzt–Paz): ödemeler (toplam + firma), faturalar,
 * gelir/gider, başarılı giriş sayıları. Son özet PropertiesService’te saklanır.
 * E-posta: MailApp (isteğe bağlı; scope yoksa yalnız in-app).
 *
 * Trigger: installWeeklyDigestTrigger() → ScriptApp Pazartesi 09:00 Istanbul.
 * Localhost: runWeeklyDigest / getLastWeeklyDigest mock (local/api.js).
 */

var DIGEST_PROP_KEY = 'AQUA_TEKEL_LAST_WEEKLY_DIGEST';
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
 * Önceki takvim haftası Pazartesi–Pazar (İstanbul).
 * Pazartesi sabah brifingi: tamamlanan haftayı özetler.
 * @param {Date=} ref
 * @return {{baslangic: string, bitis: string, baslangicTr: string, bitisTr: string}}
 */
function previousWeekRangeIstanbul_(ref) {
  ref = ref || new Date();
  var key = digestDateKey_(ref);
  var parts = key.split('-');
  var y = Number(parts[0]);
  var m = Number(parts[1]) - 1;
  var day = Number(parts[2]);
  // UTC öğlen ile hafta kayması önlenir
  var noon = new Date(Date.UTC(y, m, day, 9, 0, 0));
  var dow = Number(Utilities.formatDate(noon, 'Europe/Istanbul', 'u')); // 1=Pzt … 7=Paz
  var thisMon = new Date(noon.getTime() - (dow - 1) * 86400000);
  var prevMon = new Date(thisMon.getTime() - 7 * 86400000);
  var prevSun = new Date(prevMon.getTime() + 6 * 86400000);
  function tr(d) {
    return Utilities.formatDate(d, 'Europe/Istanbul', 'dd.MM.yyyy');
  }
  function iso(d) {
    return Utilities.formatDate(d, 'Europe/Istanbul', 'yyyy-MM-dd');
  }
  return {
    baslangic: iso(prevMon),
    bitis: iso(prevSun),
    baslangicTr: tr(prevMon),
    bitisTr: tr(prevSun)
  };
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
 * Haftalık özet nesnesini üretir (önceki Pzt–Paz).
 * @param {Object=} opts
 * @return {Object}
 */
function buildWeeklyDigest_(opts) {
  opts = opts || {};
  var range = previousWeekRangeIstanbul_(opts.refDate ? new Date(opts.refDate) : new Date());
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
  var i;

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
    }
  }

  var firms = Object.keys(byFirm).map(function (k) {
    return byFirm[k];
  });
  firms.sort(function (a, b) {
    return b.tutar - a.tutar;
  });

  var logins = countLoginsInRange_(bas, bit);
  var now = new Date();

  return {
    ok: true,
    generatedAt: Utilities.formatDate(now, 'Europe/Istanbul', "yyyy-MM-dd'T'HH:mm:ss"),
    generatedAtTr: Utilities.formatDate(now, 'Europe/Istanbul', 'dd.MM.yyyy HH:mm'),
    timezone: 'Europe/Istanbul',
    period: range,
    odeme: { toplam: odemeToplam, adet: odemeAdet, byFirm: firms },
    fatura: { toplam: faturaToplam, adet: faturaAdet },
    gelir: { toplam: gelirToplam, adet: gelirAdet },
    gider: { toplam: giderToplam, adet: giderAdet },
    giris: logins,
    metin: formatWeeklyDigestText_({
      range: range,
      odemeToplam: odemeToplam,
      odemeAdet: odemeAdet,
      firms: firms,
      faturaToplam: faturaToplam,
      faturaAdet: faturaAdet,
      gelirToplam: gelirToplam,
      giderToplam: giderToplam,
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
  lines.push('Dönem: ' + d.range.baslangicTr + ' – ' + d.range.bitisTr + ' (önceki hafta)');
  lines.push('');
  lines.push(
    'Bu hafta toplam ' +
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
 * @param {Object=} opts
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

  return {
    ok: true,
    message: 'Haftalık özet hazır. ' + mailNote,
    mailed: mailed,
    digest: digest
  };
}

/**
 * Zamanlayıcı girişi.
 */
function triggerWeeklyDigest() {
  runWeeklyDigest({ fromTrigger: true, sendEmail: true });
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
      'Haftalık özet tetikleyicisi kuruldu: her Pazartesi 09:00 Europe/Istanbul → triggerWeeklyDigest.'
  };
}
