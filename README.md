# Aqua Tekel — Faz 1 iskelet (test)

**Aqua Tekel** test paneli. Gerçek muhasebe hesabı yapmaz.  
Canlı muhasebe dosyasına **bağlanmayın**.

Test tablosu: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur.)

Depo: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel)

---

## Paneli kurmak (tek yol)

Adım adım kopyala-yapıştır rehberi:

**→ [PANEL-KURULUM.md](./PANEL-KURULUM.md)**

Orada: Sheet → Uzantılar → Apps Script, her dosyanın nereye yapıştırılacağı, Web App (Only myself), beklenen ekran (**Merhaba Aqua Tekel** + **Test ortamı**).

Tablo menüsü: **Aqua Tekel (Test)** → test sayfalarını kur / panel talimatı.

---

## Ne var?

| Bölüm | Açıklama |
|--------|----------|
| `src/Main.gs` | Web App + tablo menüsü |
| `src/Bootstrap.gs` | Test sayfalarını oluşturur (aktif tablo; ID yok) |
| `src/Config.gs` | Ayarlar (yer tutucu ID) |
| `src/Auth.gs` … | Yetki / gelir / gider iskeleti (şimdilik stub) |
| `ui/` | Mobil panel HTML |

---

## Güvenlik

- Canlı Spreadsheet / Script ID yazmayın.
- Web App: **Only myself**.
- `.clasp.json` paylaşmayın (yalnızca `.clasp.json.example` vardır).

---

## Klasör yapısı

```
aqua-tekel/
├── PANEL-KURULUM.md
├── README.md
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
│   ├── Dedup.gs
│   └── Utils.gs
└── ui/
    ├── Index.html
    ├── Styles.html
    └── Client.html
```
