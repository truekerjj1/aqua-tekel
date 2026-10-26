# Aqua Tekel — Faz 1 iskelet (test)

**Aqua Tekel** test paneli. Gerçek muhasebe hesabı yapmaz.  
Canlı muhasebe dosyasına **bağlanmayın**.

Test tablosu: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur; `YOUR_SPREADSHEET_ID` yer tutucu.)

Depo: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel)

---

## Paneli kurmak / güncellemek

- İlk kurulum: **[PANEL-KURULUM.md](./PANEL-KURULUM.md)**
- Yetki + UI güncellemesi (Windows yapıştırma sırası): **[docs/PANEL-GUNCELLEME.md](./docs/PANEL-GUNCELLEME.md)**

Beklenen ilk ekran: **Güvenli giriş** + **TEST MODU** rozeti (açık yeşil mobil Web App).  
Test: Fatih `TEST4567` (patron) · Sercan `TEST2345` (personel) — `Config.TEST_USERS` (canlı şifre değil).

**Yetki:** Tedarikçi / fatura ekleme / ayar → yalnız **patron**. Personel gelir, gider, ödeme (tedarikçi dropdown) yapar; tedarikçi kaydı oluşturamaz. Kontroller sunucuda (`Auth.gs`).

Tablo menüsü: **Aqua Tekel (Test)** → test sayfalarını kur / örnek veri / panel talimatı.

---

## Ne var?

| Bölüm | Açıklama |
|--------|----------|
| `src/Main.gs` | Web App + tablo menüsü |
| `src/Bootstrap.gs` | Test sayfalarını oluşturur (aktif tablo; ID yok) |
| `src/Config.gs` | Ayarlar + `TEST_USERS` (test only kodlar) |
| `src/Auth.gs` | Giriş / oturum / patron–personel |
| `src/SampleData.gs` | Örnek test verisi |
| `ui/` | Mobil panel HTML (giriş + sekmeler) |

---

## Güvenlik

- Canlı Spreadsheet / Script ID yazmayın.
- Web App: **Only myself**.
- Erişim kodları yalnızca sandbox (`TEST_USERS`); üretime taşımayın.
- `.clasp.json` paylaşmayın (yalnızca `.clasp.json.example` vardır).

---

## Klasör yapısı

```
aqua-tekel/
├── PANEL-KURULUM.md
├── README.md
├── docs/PANEL-GUNCELLEME.md
├── appsscript.json
├── .clasp.json.example
├── .gitignore
├── src/
│   ├── Main.gs
│   ├── Bootstrap.gs
│   ├── Config.gs
│   ├── Auth.gs
│   ├── Income.gs
│   ├── Expense.gs
│   ├── Suppliers.gs
│   ├── Invoices.gs
│   ├── Payments.gs
│   ├── SampleData.gs
│   ├── Dedup.gs
│   └── Utils.gs
└── ui/
    ├── Index.html
    ├── Styles.html
    └── Client.html
```
