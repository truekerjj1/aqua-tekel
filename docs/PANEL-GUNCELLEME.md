# Panel güncelleme — yönetici / onay / ödeme yöntemi / dekont (Windows)

Yalnızca **test**. Canlı muhasebe tablosuna bağlanmayın.  
Tablo: **Aqua TEKEL TEST PROJESİ** → **Uzantılar → Apps Script**

Bu turda değişen dosyaları **üzerine yazın** (silmeyin; içeriği tamamen yenileyin).  
GitHub’da dosyaya tıklayın → **Raw** → tümünü kopyala → Apps Script’te yapıştır → kaydet.

Yeni `.gs` dosyaları için: **+ → Script** ve adı tam yazın (`Approvals`, `Admin`, `Attachments`, `Users`).

---

## Yeniden yapıştırılacaklar (sıra)

| # | Apps Script adı | GitHub dosyası |
|---|-----------------|----------------|
| 1 | `Config` | `src/Config.gs` |
| 2 | `Auth` | `src/Auth.gs` |
| 3 | `Bootstrap` | `src/Bootstrap.gs` |
| 4 | `Utils` | `src/Utils.gs` |
| 5 | `Income` | `src/Income.gs` |
| 6 | `Expense` | `src/Expense.gs` |
| 7 | `Suppliers` | `src/Suppliers.gs` |
| 8 | `Invoices` | `src/Invoices.gs` |
| 9 | `Payments` | `src/Payments.gs` |
| 10 | `Approvals` | `src/Approvals.gs` **(yeni)** |
| 11 | `Attachments` | `src/Attachments.gs` **(yeni)** |
| 12 | `Users` | `src/Users.gs` **(yeni)** |
| 13 | `Admin` | `src/Admin.gs` **(yeni)** |
| 14 | `SampleData` | `src/SampleData.gs` |
| 15 | `Main` | `src/Main.gs` |
| 16 | `ui/Styles` | `ui/Styles.html` |
| 17 | `ui/Index` | `ui/Index.html` |
| 18 | `ui/Client` | `ui/Client.html` |

`ui/...` adını **tam böyle** yazın. HTML yoksa: **+ → HTML**.

---

## Sheet başlıkları (önemli)

Eski sekmelerde sütun eksikse:

1. Menü → **Aqua Tekel (Test)** → **Test sayfalarını kur** (yeni `Onaylar` sayfası)
2. Mevcut sayfaların 1. satırını `sheets/SEMASI.md` / `Config.HEADERS` ile hizalayın **veya** ilgili sayfayı silip yeniden kurun
3. İsteğe bağlı: **Örnek test verisi yükle**

Yeni / genişleyen alanlar: `Kullanici`, `OnayDurum`, `Yöntem` (fatura), `Aktif` (tedarikçi), `Dekont*`, `Onaylar` sayfası, `Kullanicilar` → Id + Kod (test only).

---

## Sonra

1. Kaydet → tabloyu yenile → menü **Test sayfalarını kur** → **Örnek test verisi yükle**
2. **Deploy → Manage deployments → Edit → New version → Deploy**  
   (Web App: **Me** · **Only myself**)
3. Web App linkini açın

**Beklenen:** ödeme yöntemi select · vadeli borç düşmez · personel onaya düşer · patron Onay / Yönetici · dekont yükleme · profil son işlemler · CSS grafik

---

## Yetki (kısa)

| | Patron | Personel |
|--|--------|----------|
| Gelir / Gider / Ödeme / Fatura | evet | evet |
| Profil (son işlemler) | evet | evet |
| Tedarikçi düzenle / sil | evet | **yok** |
| Onay kuyruğu | evet | **yok** |
| Yönetici paneli | evet | **yok** |

---

## Ödeme yöntemleri

- **Nakit / Kredi kartı** → gerçek ödeme; `kalanBorc` azalır  
- **Vadeli** → cari işlem kaydı; borç hesabında ödeme **sayılmaz**

Dekont: Drive `Aqua Tekel TEST / Dekontlar` (getOrCreate). Max ~5 MB. URL sheet’e yazılır.

---

## Test kodları (sandbox — canlı değil)

| Kullanıcı | Rol | Kod |
|-----------|-----|-----|
| Yalçın Özeke | patron | `TEST1234` |
| Sercan Toprak | personel | `TEST2345` |
| Aleyna Toprak | personel | `TEST3456` |
| Fatih Toprak | patron | `TEST4567` |

`SPREADSHEET_ID` yer tutucu kalsın; aktif tablo kullanılır. Canlı muhasebeye bağlanmayın.
