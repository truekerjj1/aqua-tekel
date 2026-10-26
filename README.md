# Aqua Tekel — Faz 1 iskelet (test)

**Aqua Tekel** test paneli. Gerçek muhasebe hesabı yapmaz.  
Canlı muhasebe dosyasına **bağlanmayın**.

Test tablosu: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur; `YOUR_SPREADSHEET_ID` yer tutucu.)

Depo: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel)

---

## Paneli kurmak / güncellemek

- İlk kurulum: **[PANEL-KURULUM.md](./PANEL-KURULUM.md)**
- Yönetici / onay / ödeme yöntemi / dekont: **[docs/PANEL-GUNCELLEME.md](./docs/PANEL-GUNCELLEME.md)**

Beklenen ilk ekran: **Güvenli giriş** + **TEST MODU** rozeti (açık yeşil mobil Web App).  
Test: Fatih `TEST4567` (patron) · Sercan `TEST2345` (personel) — `Config.TEST_USERS` (canlı şifre değil).

**Yetki:** Yönetici / onay / tedarikçi düzenle-sil → yalnız **patron**. Personel gelir, gider, ödeme, fatura ekler (onaya düşer); profilinde son işlemlerini görür.

Tablo menüsü: **Aqua Tekel (Test)** → test sayfalarını kur / örnek veri / panel talimatı.

---

## Ne var?

| Bölüm | Açıklama |
|--------|----------|
| `src/Main.gs` | Web App + tablo menüsü |
| `src/Bootstrap.gs` | Test sayfalarını oluşturur (Onaylar dahil) |
| `src/Config.gs` | Ayarlar + `TEST_USERS` + ödeme yöntemleri |
| `src/Auth.gs` | Giriş / oturum / patron–personel |
| `src/Approvals.gs` | Onay kuyruğu |
| `src/Admin.gs` | Yönetici özet / filtre / grafik |
| `src/Attachments.gs` | Dekont → Drive |
| `src/Users.gs` | Kullanıcı yönetimi + sheet senkron |
| `src/SampleData.gs` | Örnek test verisi |
| `ui/` | Mobil panel HTML |

---

## Güvenlik

- Canlı Spreadsheet / Script ID yazmayın.
- Web App: **Only myself**.
- Erişim kodları yalnızca sandbox (`TEST_USERS` / sheet Kod — test only).
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
├── sheets/SEMASI.md
├── src/
│   ├── Main.gs, Bootstrap.gs, Config.gs, Auth.gs, Utils.gs
│   ├── Income.gs, Expense.gs, Suppliers.gs, Invoices.gs, Payments.gs
│   ├── Approvals.gs, Attachments.gs, Users.gs, Admin.gs
│   ├── SampleData.gs, Dedup.gs
└── ui/
    ├── Index.html, Styles.html, Client.html
```
