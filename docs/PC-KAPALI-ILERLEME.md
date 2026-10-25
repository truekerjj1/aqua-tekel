# PC kapalıyken ilerleme — eve dönüş notu

Bu dosya, bilgisayar kapalıyken GitHub’da yapılan sandbox işlerini ve eve dönünce Windows’ta ne kopyalanacağını özetler.

**Yapılmadı (bilinçli):** Google Sheets / Apps Script’e bağlanma, deploy, canlı ID.

---

## PC kapalıyken ne yapıldı?

| Konu | Durum |
|------|--------|
| Sayfa şeması | `sheets/SEMASI.md` — sütunlar, kalan borç, çift kayıt |
| Bootstrap / Config | Test başlıkları şema ile uyumlu; `PATRON_EMAILS` / `PERSONEL_EMAILS` placeholder |
| Gelir / Gider / Tedarikçi | Aktif tabloya yazan sandbox CRUD (`getActiveSpreadsheet`) |
| Fatura / Ödeme | `Invoices.gs` / `Payments.gs` CRUD; kalan borç = Faturalar − Ödemeler |
| Bakiye | `refreshSupplierBalances()` → `Tedarikçiler!KalanBorc` |
| Çift kayıt | `Dedup.gs` — tarih+tutar+açıklama veya faturaNo+tedarikçi |
| Yetki | Patron tam; personel yazma; misafir salt okuma |
| Panel UI | Özet / Gelir / Gider / Tedarikçi (+ fatura/ödeme formları, kalan borç) |

Kaynak: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel) — `main`.

---

## Eve dönünce (Windows) — kopyala / deploy

1. **Aqua TEKEL TEST PROJESİ** tablosunu açın (canlı muhasebe değil).
2. **Uzantılar → Apps Script**.
3. GitHub `main`’deki `src/*.gs` ve `ui/*.html` dosyalarını Apps Script’e **yeniden kopyalayın** (veya clasp kullanıyorsanız çekin).  
   Adım adım: [PANEL-KURULUM.md](../PANEL-KURULUM.md)
4. Tabloda menü: **Aqua Tekel (Test) → Test sayfalarını kur** (başlıklar güncellendiyse eski sayfalar atlanır; gerekirse sütunları `SEMASI.md` ile elle hizalayın).
5. **Deploy → Manage deployments → Edit → New version** (veya ilk kez New deployment → Web app, Only myself).
6. `Config.gs` içinde `PATRON_EMAILS` / `PERSONEL_EMAILS` örneklerini **kendi Google e-postanızla** değiştirin.
7. `YOUR_SPREADSHEET_ID` doldurmak **zorunlu değil**; CRUD aktif tabloyu kullanır.

Ubuntu / VirtualBox yolu da aynı kopya-yapıştır adımlarıyla çalışır (“ubuntu devam” veya “windows devam”).
