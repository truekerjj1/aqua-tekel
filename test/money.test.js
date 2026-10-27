'use strict';

/**
 * Node birim testleri — parseTutar / sanitizeDekontUrl / formatTutarTr
 * Çalıştır: node test/money.test.js
 * GAS runtime çalıştırılmaz.
 */

var money = require('../local/money');
var parseTutar = money.parseTutar;
var formatTutarTr = money.formatTutarTr;
var sanitizeDekontUrl = money.sanitizeDekontUrl;

var failed = 0;
var passed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    return;
  }
  failed++;
  console.error('FAIL:', msg);
}

function assertEq(actual, expected, msg) {
  var ok =
    (typeof expected === 'number' && isNaN(expected) && isNaN(actual)) ||
    actual === expected;
  assert(ok, msg + ' (beklenen=' + expected + ', gelen=' + actual + ')');
}

// --- parseTutar ---
assertEq(parseTutar(1234.5), 1234.5, 'number');
assertEq(parseTutar('1234.5'), 1234.5, 'düz ondalık nokta');
assertEq(parseTutar('1.234,56'), 1234.56, 'TR binlik+ondalık');
assertEq(parseTutar('1234,56'), 1234.56, 'TR yalnız virgül');
assertEq(parseTutar('1,234.56'), 1234.56, 'US binlik+ondalık');
assertEq(parseTutar('1.234'), 1234, 'TR binlik nokta (ondalık yok)');
assertEq(parseTutar('1.234.567'), 1234567, 'çoklu TR binlik');
assertEq(parseTutar('₺1.250,00'), 1250, 'TL sembolü');
assertEq(parseTutar('1 250,5'), 1250.5, 'boşluk');
assert(isNaN(parseTutar('')), 'boş → NaN');
assert(isNaN(parseTutar(null)), 'null → NaN');
assert(isNaN(parseTutar(undefined)), 'undefined → NaN');
assert(isNaN(parseTutar('abc')), 'metin → NaN');
assert(isNaN(parseTutar('-')), 'tire → NaN');
assert(isNaN(parseTutar('12,')), 'eksik ondalık → NaN');
assertEq(parseTutar(0), 0, 'sıfır sayı');
assertEq(parseTutar('0'), 0, 'sıfır metin');
assert(isNaN(parseTutar(Infinity)), 'Infinity → NaN');

// --- formatTutarTr ---
assert(formatTutarTr(1234.5).indexOf('1') >= 0, 'format sayı içerir');
assertEq(formatTutarTr(NaN), '—', 'NaN → —');
assertEq(formatTutarTr(null), '—', 'null → —');

// --- sanitizeDekontUrl ---
assertEq(sanitizeDekontUrl('https://drive.google.com/x'), 'https://drive.google.com/x', 'https');
assertEq(sanitizeDekontUrl('http://localhost/uploads/a.pdf'), 'http://localhost/uploads/a.pdf', 'http');
assertEq(sanitizeDekontUrl('/uploads/x.pdf'), '/uploads/x.pdf', 'relative uploads');
assertEq(sanitizeDekontUrl('javascript:alert(1)'), '', 'javascript engeli');
assertEq(sanitizeDekontUrl('data:text/html,x'), '', 'data engeli');
assertEq(sanitizeDekontUrl(''), '', 'boş');
assertEq(sanitizeDekontUrl(null), '', 'null url');

console.log('Sonuç: ' + passed + ' geçti, ' + failed + ' kaldı');
process.exit(failed ? 1 : 0);
