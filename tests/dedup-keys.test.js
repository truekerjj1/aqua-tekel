/**
 * Yerel birim testleri — Dedup / tutar / HTML kaçış yardımcılarının
 * saf JS karşılıkları (Apps Script / Sheets çalıştırılmaz).
 *
 * Çalıştır: node tests/dedup-keys.test.js
 * Mantık src/Dedup.gs + src/Utils.gs ile senkron tutulmalıdır.
 */
'use strict';

var assert = require('assert');

function normalizeKeyPart(deger) {
  if (deger === null || deger === undefined) {
    return '';
  }
  if (Object.prototype.toString.call(deger) === '[object Date]') {
    var d = deger;
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '.' + mm + '.' + yyyy;
  }
  return String(deger).replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseTutar(deger) {
  if (typeof deger === 'number') {
    return deger;
  }
  if (deger === null || deger === undefined || deger === '') {
    return NaN;
  }
  var s = String(deger).replace(/\s/g, '').replace(',', '.');
  return Number(s);
}

function requirePositiveTutar(deger) {
  var tutar = parseTutar(deger);
  if (isNaN(tutar) || tutar <= 0) {
    return { ok: false, tutar: NaN };
  }
  return { ok: true, tutar: tutar };
}

function buildTxDedupKey(kayit) {
  kayit = kayit || {};
  return (
    normalizeKeyPart(kayit.tarih) +
    '|' +
    normalizeKeyPart(parseTutar(kayit.tutar)) +
    '|' +
    normalizeKeyPart(kayit.aciklama)
  );
}

function buildInvoiceDedupKey(kayit) {
  kayit = kayit || {};
  return (
    normalizeKeyPart(kayit.faturaNo) + '|' + normalizeKeyPart(kayit.tedarikci)
  );
}

function buildPaymentDedupKey(kayit) {
  kayit = kayit || {};
  return (
    normalizeKeyPart(kayit.tarih) +
    '|' +
    normalizeKeyPart(kayit.tedarikci) +
    '|' +
    normalizeKeyPart(parseTutar(kayit.tutar)) +
    '|' +
    normalizeKeyPart(kayit.faturaNo)
  );
}

function escapeHtml(deger) {
  if (deger === null || deger === undefined) {
    return '';
  }
  return String(deger)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isDuplicateInMemory(rows, target, rowKeyFn, excludeRow) {
  var skip = Number(excludeRow) || 0;
  for (var i = 0; i < rows.length; i++) {
    var rowNum = i + 2;
    if (skip && rowNum === skip) {
      continue;
    }
    if (rowKeyFn(rows[i]) === target) {
      return true;
    }
  }
  return false;
}

// --- tests ---

assert.strictEqual(
  buildTxDedupKey({ tarih: '25.10.2026', tutar: '100,5', aciklama: '  Satış  ' }),
  '25.10.2026|100.5|satış'
);

assert.strictEqual(
  buildInvoiceDedupKey({ faturaNo: 'F-1', tedarikci: 'Mavi Su Ltd' }),
  'f-1|mavi su ltd'
);

assert.strictEqual(
  buildPaymentDedupKey({
    tarih: '08.10.2026',
    tedarikci: 'Mavi Su Ltd',
    tutar: 500,
    faturaNo: 'ORNEK-F001'
  }),
  '08.10.2026|mavi su ltd|500|ornek-f001'
);

// SampleData paymentSampleExists_ ile aynı anahtar bileşenleri
assert.strictEqual(
  buildPaymentDedupKey({
    tarih: '12.10.2026',
    tedarikci: 'Kaynak Dağıtım',
    tutar: '320',
    faturaNo: 'ORNEK-F002'
  }),
  '12.10.2026|kaynak dağıtım|320|ornek-f002'
);

assert.ok(requirePositiveTutar(10).ok);
assert.ok(requirePositiveTutar('1,5').ok);
assert.ok(!requirePositiveTutar(0).ok);
assert.ok(!requirePositiveTutar(-5).ok);
assert.ok(!requirePositiveTutar('abc').ok);

assert.strictEqual(escapeHtml('<img src=x onerror=alert(1)>'),
  '&lt;img src=x onerror=alert(1)&gt;');
assert.strictEqual(escapeHtml('a&b"c\'d'), 'a&amp;b&quot;c&#39;d');

var paymentRows = [
  ['08.10.2026', 'Mavi Su Ltd', 500, 'Havale', 'ORNEK-F001', ''],
  ['12.10.2026', 'Kaynak Dağıtım', 320, 'Nakit', 'ORNEK-F002', '']
];

function rowPaymentKey(row) {
  return buildPaymentDedupKey({
    tarih: row[0],
    tedarikci: row[1],
    tutar: row[2],
    faturaNo: row[4]
  });
}

assert.ok(
  isDuplicateInMemory(
    paymentRows,
    buildPaymentDedupKey({
      tarih: '08.10.2026',
      tedarikci: 'mavi su ltd',
      tutar: 500,
      faturaNo: 'ornek-f001'
    }),
    rowPaymentKey
  )
);

assert.ok(
  !isDuplicateInMemory(
    paymentRows,
    buildPaymentDedupKey({
      tarih: '08.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 500,
      faturaNo: 'ORNEK-F001'
    }),
    rowPaymentKey,
    2
  ),
  'excludeRow kendi satırını hariç tutmalı'
);

assert.ok(
  !isDuplicateInMemory(
    paymentRows,
    buildPaymentDedupKey({
      tarih: '09.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 500,
      faturaNo: 'ORNEK-F001'
    }),
    rowPaymentKey
  )
);

console.log('OK — tests/dedup-keys.test.js (' + 12 + ' assertions passed)');
