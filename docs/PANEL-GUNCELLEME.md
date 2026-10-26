# Panel güncelleme — giriş ekranı (Windows)

Yalnızca **test**. Canlı muhasebe tablosuna bağlanmayın.  
Tablo: **Aqua TEKEL TEST PROJESİ** → **Uzantılar → Apps Script**

Bu turda değişen dosyaları **üzerine yazın** (silmeyin; içeriği tamamen yenileyin).  
GitHub’da dosyaya tıklayın → **Raw** → tümünü kopyala → Apps Script’te yapıştır → kaydet.

---

## Yeniden yapıştırılacaklar (kısa sıra)

| # | Apps Script adı | GitHub dosyası |
|---|-----------------|----------------|
| 1 | `Config` | `src/Config.gs` |
| 2 | `Auth` | `src/Auth.gs` |
| 3 | `Utils` | `src/Utils.gs` |
| 4 | `Main` | `src/Main.gs` |
| 5 | `SampleData` | `src/SampleData.gs` |
| 6 | `ui/Styles` | `ui/Styles.html` |
| 7 | `ui/Index` | `ui/Index.html` |
| 8 | `ui/Client` | `ui/Client.html` |

`ui/...` adını **tam böyle** yazın (eğik çizgi dahil). HTML yoksa: **+ → HTML**.

---

## Sonra

1. Kaydet → tabloyu yenile → menü **Aqua Tekel (Test)** → isteğe bağlı **Örnek test verisi yükle**
2. **Deploy → Manage deployments → Edit (kalem) → New version → Deploy**  
   (veya ilk kez: New deployment → Web app · **Me** · **Only myself**)
3. Web App linkini açın

**Beklenen:** açık yeşil giriş · **AQUA TEKEL** · **TEST MODU** rozeti · kullanıcı seç · kod · **Giriş Yap**

---

## Test kodları (sandbox — canlı değil)

`Config.TEST_USERS` içinde (örnek):

| Kullanıcı | Rol | Kod (test only) |
|-----------|-----|-----------------|
| Yalçın Özeke | patron | `TEST1234` |
| Sercan Toprak | personel | `TEST2345` |
| Aleyna Toprak | personel | `TEST3456` |
| Fatih Toprak | patron | `TEST4567` |

Personelde silme / ayar yoktur. `SPREADSHEET_ID` yer tutucu kalsın; aktif tablo kullanılır.
