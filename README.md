# Aqua Tekel — Faz 1 iskelet (test)

**Aqua Tekel** test paneli. Gerçek muhasebe hesabı yapmaz.  
Canlı muhasebe dosyasına **bağlanmayın**.

Test tablosu: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur. CRUD `getActiveSpreadsheet` kullanır; `YOUR_SPREADSHEET_ID` zorunlu değil.)

Depo: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel)

---

## Paneli kurmak (tek yol)

Adım adım kopyala-yapıştır rehberi:

**→ [PANEL-KURULUM.md](./PANEL-KURULUM.md)**

Orada: Sheet → Uzantılar → Apps Script, her dosyanın nereye yapıştırılacağı, Web App (Only myself), beklenen ekran (**Merhaba Aqua Tekel** + **Test ortamı** + sekmeler).

Tablo menüsü: **Aqua Tekel (Test)** → test sayfalarını kur / panel talimatı.

---

## PC kapalıyken / eve dönüş

Kısa özet: [docs/PC-KAPALI-ILERLEME.md](./docs/PC-KAPALI-ILERLEME.md)

---

## Ne var?

| Bölüm | Açıklama |
|--------|----------|
| `sheets/SEMASI.md` | Gelir–Gider–Tedarikçi–Fatura–Ödeme–Kullanıcı sütunları; kalan borç; çift kayıt |
| `src/Main.gs` | Web App + tablo menüsü |
| `src/Bootstrap.gs` | Test sayfalarını oluşturur (aktif tablo; ID yok) |
| `src/Config.gs` | Sayfa adları, başlıklar, yetki e-posta listeleri (placeholder) |
| `src/Auth.gs` | Patron / personel / misafir |
| `src/Income.gs` / `Expense.gs` / `Suppliers.gs` | Sandbox CRUD (aktif tablo) |
| `src/Dedup.gs` | Çift kayıt kontrolü |
| `ui/` | Mobil panel: Özet / Gelir / Gider / Tedarikçi |

---

## Güvenlik

- Canlı Spreadsheet / Script ID yazmayın.
- Web App: **Only myself**.
- `.clasp.json` paylaşmayın (yalnızca `.clasp.json.example` vardır).
- Config’deki `patron@example.com` / `personel@example.com` örnektir; gerçek hesap değildir.

---

## Klasör yapısı

```
aqua-tekel/
├── PANEL-KURULUM.md
├── README.md
├── appsscript.json
├── .clasp.json.example
├── .gitignore
├── docs/
│   └── PC-KAPALI-ILERLEME.md
├── sheets/
│   └── SEMASI.md
├── src/
│   ├── Main.gs
│   ├── Bootstrap.gs
│   ├── Config.gs
│   ├── Auth.gs
│   ├── Income.gs
│   ├── Expense.gs
│   ├── Suppliers.gs
│   ├── Dedup.gs
│   └── Utils.gs
└── ui/
    ├── Index.html
    ├── Styles.html
    └── Client.html
```
