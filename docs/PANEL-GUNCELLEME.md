# Panel güncelleme — yetki + UI (Windows)

Yalnızca **test**. Canlı muhasebe tablosuna bağlanmayın.  
Tablo: **Aqua TEKEL TEST PROJESİ** → **Uzantılar → Apps Script**

Bu turda değişen dosyaları **üzerine yazın** (silmeyin; içeriği tamamen yenileyin).  
GitHub’da dosyaya tıklayın → **Raw** → tümünü kopyala → Apps Script’te yapıştır → kaydet.

---

## Yeniden yapıştırılacaklar (sıra)

| # | Apps Script adı | GitHub dosyası |
|---|-----------------|----------------|
| 1 | `Config` | `src/Config.gs` |
| 2 | `Auth` | `src/Auth.gs` |
| 3 | `Utils` | `src/Utils.gs` |
| 4 | `Income` | `src/Income.gs` |
| 5 | `Expense` | `src/Expense.gs` |
| 6 | `Payments` | `src/Payments.gs` |
| 7 | `Suppliers` | `src/Suppliers.gs` |
| 8 | `Invoices` | `src/Invoices.gs` |
| 9 | `Main` | `src/Main.gs` |
| 10 | `ui/Styles` | `ui/Styles.html` |
| 11 | `ui/Index` | `ui/Index.html` |
| 12 | `ui/Client` | `ui/Client.html` |

`ui/...` adını **tam böyle** yazın (eğik çizgi dahil). HTML yoksa: **+ → HTML**.

`Config` değişmediyse bile Auth ile birlikte kontrol edin (`TEST_USERS` aynı kalır).

---

## Sonra

1. Kaydet → tabloyu yenile → menü **Aqua Tekel (Test)** → isteğe bağlı **Örnek test verisi yükle**
2. **Deploy → Manage deployments → Edit (kalem) → New version → Deploy**  
   (veya ilk kez: New deployment → Web app · **Me** · **Only myself**)
3. Web App linkini açın

**Beklenen:** açık yeşil mobil panel · **AQUA TEKEL** · **TEST MODU** · giriş · rolüne göre sekmeler

---

## Yetki (kısa)

| | Patron | Personel |
|--|--------|----------|
| Gelir / Gider / Ödeme | evet | evet |
| Fatura ekle | evet | hayır (liste OK) |
| Tedarikçi sekmesi | evet | **yok** |
| Ayarlar | evet | **yok** |

Sunucu da kontrol eder (`requirePatron` / `requirePersonelOrPatron`). UI gizlemek yetmez.

---

## Test kodları (sandbox — canlı değil)

`Config.TEST_USERS`:

| Kullanıcı | Rol | Kod |
|-----------|-----|-----|
| Yalçın Özeke | patron | `TEST1234` |
| Sercan Toprak | personel | `TEST2345` |
| Aleyna Toprak | personel | `TEST3456` |
| Fatih Toprak | patron | `TEST4567` |

`SPREADSHEET_ID` yer tutucu kalsın; aktif tablo kullanılır. Canlı muhasebeye bağlanmayın.
