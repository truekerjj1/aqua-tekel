'use strict';

/**
 * Ortak tutar / URL yardımcıları (Node + local mock).
 * GAS tarafı: src/Utils.gs — aynı kurallar; senkron tutun.
 */

function parseTutar(deger) {
  if (typeof deger === 'number') {
    return isFinite(deger) ? deger : NaN;
  }
  if (deger === null || deger === undefined || deger === '') {
    return NaN;
  }
  var s = String(deger)
    .replace(/\s/g, '')
    .replace(/₺/g, '')
    .replace(/TL/gi, '');
  if (!s || s === '-' || s === '.' || s === ',') {
    return NaN;
  }
  var lastComma = s.lastIndexOf(',');
  var lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    var afterC = s.length - lastComma - 1;
    if (afterC <= 0) return NaN;
    if (afterC <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    return NaN;
  }
  var n = Number(s);
  return isFinite(n) ? n : NaN;
}

function formatTutarTr(n) {
  if (n == null || isNaN(Number(n))) {
    return '—';
  }
  return (Math.round(Number(n) * 100) / 100).toLocaleString('tr-TR');
}

function sanitizeDekontUrl(url) {
  var u = String(url == null ? '' : url).trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf('/uploads/') === 0) return u;
  return '';
}

module.exports = {
  parseTutar: parseTutar,
  formatTutarTr: formatTutarTr,
  sanitizeDekontUrl: sanitizeDekontUrl
};
