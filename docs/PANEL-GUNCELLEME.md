# Panel güncelleme — gider / fatura / tedarikçi listesi (Windows)

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
| 3 | `Bootstrap` | `src/Bootstrap.gs` |
| 4 | `Expense` | `src/Expense.gs` |
| 5 | `Invoices` | `src/Invoices.gs` |
| 6 | `Suppliers` | `src/Suppliers.gs` |
| 7 | `SampleData` | `src/SampleData.gs` |
| 8 | `Main` | `src/Main.gs` |
| 9 | `ui/Styles` | `ui/Styles.html` |
| 10 | `ui/Index` | `ui/Index.html` |
| 11 | `ui/Client` | `ui/Client.html` |

`ui/...` adını **tam böyle** yazın (eğik çizgi dahil). HTML yoksa: **+ → HTML**.

`Styles` değişmediyse bile Index/Client ile birlikte kontrol edin.

---

## Gider sayfası başlığı (önemli)

Eski Gider sekmesinde **Tedarikçi** sütunu varsa:

1. Test tablosunda **Gider** sayfasını silin **veya** 1. satırı  
   `Tarih | Tutar | Açıklama | Kategori | Not` olacak şekilde düzeltin  
2. Menü → **Aqua Tekel (Test)** → **Test sayfalarını kur** (eksikse oluşturur)  
3. İsteğe bağlı: **Örnek test verisi yükle**

Yeni şema tedarikçi sütunu kullanmaz; kategori zorunlu.

---

## Sonra

1. Kaydet → tabloyu yenile → menü **Aqua Tekel (Test)** → isteğe bağlı **Örnek test verisi yükle**
2. **Deploy → Manage deployments → Edit (kalem) → New version → Deploy**  
   (veya ilk kez: New deployment → Web app · **Me** · **Only myself**)
3. Web App linkini açın

**Beklenen:** personel fatura formu görür · giderde kategori select · tedarikçi listesinde boş satır yok

---

## Yetki (kısa)

| | Patron | Personel |
|--|--------|----------|
| Gelir / Gider / Ödeme | evet | evet |
| Fatura ekle | evet | **evet** |
| Tedarikçi sekmesi | evet | **yok** |
| Ayarlar | evet | **yok** |

Sunucu da kontrol eder. Tedarikçi ekleme hâlâ yalnız patron.

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
