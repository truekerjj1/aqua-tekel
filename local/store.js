'use strict';

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const FILES = {
  users: 'users.json',
  income: 'income.json',
  expense: 'expense.json',
  suppliers: 'suppliers.json',
  invoices: 'invoices.json',
  payments: 'payments.json',
  approvals: 'approvals.json'
};

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function filePath(key) {
  return path.join(DATA_DIR, FILES[key]);
}

function readJson(key, fallback) {
  ensureDirs();
  const p = filePath(key);
  if (!fs.existsSync(p)) {
    writeJson(key, fallback);
    return structuredClone(fallback);
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    writeJson(key, fallback);
    return structuredClone(fallback);
  }
}

function writeJson(key, data) {
  ensureDirs();
  fs.writeFileSync(filePath(key), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function seedIfEmpty() {
  ensureDirs();

  const users = cfg.TEST_USERS.map(function (u) {
    return {
      id: u.id,
      email: u.id + '@example.com',
      rol: u.rol,
      ad: u.ad,
      aktif: true,
      kod: u.kod
    };
  });

  const suppliers = [
    { ad: 'Mavi Su Ltd', telefon: '0212 555 0101', not: 'Örnek tedarikçi', kalanBorc: 0, aktif: true },
    { ad: 'Kaynak Dağıtım', telefon: '0216 555 0202', not: 'Örnek tedarikçi', kalanBorc: 0, aktif: true },
    { ad: 'Tekel Ambalaj', telefon: '0312 555 0303', not: 'Örnek tedarikçi', kalanBorc: 0, aktif: true }
  ];

  const invoices = [
    {
      faturaNo: 'ORNEK-F001',
      tarih: '01.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 1500,
      vade: '15.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Vadeli',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi',
      dekontFileId: '',
      dekontUrl: ''
    },
    {
      faturaNo: 'ORNEK-F002',
      tarih: '05.10.2026',
      tedarikci: 'Kaynak Dağıtım',
      tutar: 820,
      vade: '20.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Nakit',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Onaylandi',
      dekontFileId: '',
      dekontUrl: ''
    },
    {
      faturaNo: 'ORNEK-F003',
      tarih: '10.10.2026',
      tedarikci: 'Tekel Ambalaj',
      tutar: 450,
      vade: '25.10.2026',
      durum: 'Açık',
      not: 'Örnek fatura',
      yontem: 'Kredi kartı',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi',
      dekontFileId: '',
      dekontUrl: ''
    }
  ];

  const payments = [
    {
      tarih: '08.10.2026',
      tedarikci: 'Mavi Su Ltd',
      tutar: 500,
      yontem: 'Nakit',
      faturaNo: 'ORNEK-F001',
      not: 'Örnek ödeme',
      kullanici: 'Fatih Toprak',
      onayDurum: 'Onaylandi',
      dekontFileId: '',
      dekontUrl: ''
    },
    {
      tarih: '12.10.2026',
      tedarikci: 'Kaynak Dağıtım',
      tutar: 320,
      yontem: 'Kredi kartı',
      faturaNo: 'ORNEK-F002',
      not: 'Örnek ödeme',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Onaylandi',
      dekontFileId: '',
      dekontUrl: ''
    },
    {
      tarih: '18.10.2026',
      tedarikci: 'Tekel Ambalaj',
      tutar: 200,
      yontem: 'Vadeli',
      faturaNo: 'ORNEK-F003',
      not: 'Vadeli kayıt — borç düşmez',
      kullanici: 'Sercan Toprak',
      onayDurum: 'Bekliyor',
      dekontFileId: '',
      dekontUrl: ''
    }
  ];

  const income = [
    {
      tarih: '03.10.2026',
      tutar: 2400,
      aciklama: 'Örnek satış — mağaza',
      kategori: 'Satış',
      kaynak: 'Nakit',
      not: 'Örnek gelir',
      kullanici: 'Fatih Toprak'
    },
    {
      tarih: '09.10.2026',
      tutar: 1100,
      aciklama: 'Örnek satış — kart',
      kategori: 'Satış',
      kaynak: 'Kart',
      not: 'Örnek gelir',
      kullanici: 'Sercan Toprak'
    },
    {
      tarih: '15.10.2026',
      tutar: 350,
      aciklama: 'Örnek diğer gelir',
      kategori: 'Diğer',
      kaynak: 'Havale',
      not: 'Örnek gelir',
      kullanici: 'Aleyna Toprak'
    }
  ];

  const expense = [
    {
      tarih: '04.10.2026',
      tutar: 200,
      aciklama: 'Örnek yemek',
      kategori: 'Yemek',
      not: 'Örnek gider',
      kullanici: 'Sercan Toprak'
    },
    {
      tarih: '11.10.2026',
      tutar: 85,
      aciklama: 'Örnek temizlik',
      kategori: 'Temizlik',
      not: 'Örnek gider',
      kullanici: 'Aleyna Toprak'
    },
    {
      tarih: '16.10.2026',
      tutar: 1200,
      aciklama: 'Örnek kira payı',
      kategori: 'Kira',
      not: 'Örnek gider',
      kullanici: 'Fatih Toprak'
    }
  ];

  const approvals = [
    {
      id: 'ON-SEED-001',
      tip: 'odeme',
      refId: 4,
      kullanici: 'Sercan Toprak',
      tarih: '18.10.2026',
      durum: 'Bekliyor',
      ozet: 'Vadeli · Tekel Ambalaj · 200 (vadeli — borç düşmez)'
    }
  ];

  const defaults = {
    users: users,
    income: income,
    expense: expense,
    suppliers: suppliers,
    invoices: invoices,
    payments: payments,
    approvals: approvals
  };

  Object.keys(FILES).forEach(function (key) {
    const p = filePath(key);
    if (!fs.existsSync(p)) {
      writeJson(key, defaults[key]);
      return;
    }
    // Boş users.json → giriş dropdown’u boş kalır; varsayılanları yaz.
    if (key === 'users') {
      try {
        var existing = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (!Array.isArray(existing) || existing.length === 0) {
          writeJson(key, defaults[key]);
        }
      } catch (e) {
        writeJson(key, defaults[key]);
      }
    }
  });
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  ensureDirs,
  readJson,
  writeJson,
  seedIfEmpty
};
