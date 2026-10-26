# Aqua Tekel — Faz 1 iskelet (test)

**Aqua Tekel** test paneli. Gerçek muhasebe hesabı yapmaz.  
Canlı muhasebe dosyasına **bağlanmayın**.

Test tablosu: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur; `YOUR_SPREADSHEET_ID` yer tutucu.)

Depo: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel)

---

## Bilgisayarda dene (önerilen — yapıştırma yok)

Google’a kod yapıştırmadan önce paneli kendi bilgisayarınızda açın:

1. [Node.js](https://nodejs.org/) kurun (LTS sürüm yeterli).
2. Bu depoyu bilgisayara indirin (`git clone` veya ZIP).
3. Klasörde terminal açıp:

```bash
npm start
```

4. Tarayıcıda açın: **http://localhost:8787**
5. Giriş: **Fatih** / `TEST4567` (patron) veya **Sercan** / `TEST2345` (personel)

Veriler bilgisayarda kalır (`local/data/`). Dekontlar `local/uploads/` klasörüne yazılır.  
Canlı muhasebe veya Google Sheets’e bağlanmaz.

Ayrıntılı Windows adımları: store dokümanı veya `local/README.md`.

---

## Paneli Google’da kurmak / güncellemek

- İlk kurulum: **[PANEL-KURULUM.md](./PANEL-KURULUM.md)**
- Yönetici / onay / ödeme yöntemi / dekont: **[docs/PANEL-GUNCELLEME.md](./docs/PANEL-GUNCELLEME.md)**

Beklenen ilk ekran: **AQUA TEKEL** markası + **Güvenli giriş** + siyah/sarı **LOCALHOST TEST** rozeti.  
Test: Fatih `TEST4567` (patron) · Sercan `TEST2345` (personel) — `Config.TEST_USERS` (canlı şifre değil).

**Yetki:** Yönetici / onay / tedarikçi düzenle-sil → yalnız **patron**. Personel gelir, gider, ödeme, fatura ekler (onaya düşer); profilinde son işlemlerini görür.

Tablo menüsü: **Aqua Tekel (Test)** → test sayfalarını kur / örnek veri / **haftalık özet tetikleyicisi (Pzt 09:00)** / panel talimatı.

**Haftalık Özet (patron):** önceki Pzt–Paz ödemeler, firma kırılımı, fatura/gelir/gider, giriş sayıları. Localhost: Yönetici menüsünde **Haftalık Özet** → «Özeti simüle et» → `local/data/weekly-digest.json` (gerçek e-posta yok).

### İleride: `clasp push` (isteğe bağlı)

Kod hazır olunca Google’a elle yapıştırmak yerine [clasp](https://github.com/google/clasp) ile `clasp push` kullanılabilir.  
**Şimdiki öncelik localhost testtir**; clasp kurulumu zorunlu değildir.

---

## Ne var?

| Bölüm | Açıklama |
|--------|----------|
| `local/` | Localhost mock sunucu + JSON veri + dekont klasörü |
| `src/Main.gs` | Web App + tablo menüsü |
| `src/Bootstrap.gs` | Test sayfalarını oluşturur (Onaylar dahil) |
| `src/Config.gs` | Ayarlar + `TEST_USERS` + ödeme yöntemleri |
| `src/Auth.gs` | Giriş / oturum / patron–personel |
| `src/Approvals.gs` | Onay kuyruğu |
| `src/Admin.gs` | Yönetici özet / filtre / grafik |
| `src/Digest.gs` | Pazartesi 09:00 Istanbul haftalık özet (ödeme / firma / giriş) |
| `src/Attachments.gs` | Dekont → Drive (Google’da) |
| `src/Users.gs` | Kullanıcı yönetimi + sheet senkron |
| `src/SampleData.gs` | Örnek test verisi |
| `ui/` | Mobil panel HTML (logo, hamburger menü, Haftalık Özet) |

---

## Güvenlik

- Canlı Spreadsheet / Script ID yazmayın.
- Web App: **Only myself**.
- Erişim kodları yalnızca sandbox (`TEST_USERS` / sheet Kod — test only).
- `.clasp.json` paylaşmayın (yalnızca `.clasp.json.example` vardır).
- Localhost yalnızca test içindir; canlı cariye bağlanmaz.

---

## Klasör yapısı

```
aqua-tekel/
├── PANEL-KURULUM.md
├── README.md
├── package.json          ← npm start
├── docs/PANEL-GUNCELLEME.md
├── appsscript.json
├── .clasp.json.example
├── .gitignore
├── local/                ← localhost mock (src/ui silinmez)
│   ├── server.js
│   ├── api.js, store.js, config.js
│   ├── data/             ← JSON store (ilk çalıştırmada örnek veri)
│   └── uploads/          ← dekont dosyaları
├── sheets/SEMASI.md
├── src/                  ← Google Apps Script (production sandbox)
└── ui/
    ├── Index.html, Styles.html, Client.html
```
