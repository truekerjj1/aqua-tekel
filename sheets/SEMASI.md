# Aqua Tekel — Sayfa şeması (sandbox)

Yalnızca **Aqua TEKEL TEST PROJESİ** test tablosu için.  
Canlı muhasebe dosyasına uygulanmaz.

Başlık satırları `Bootstrap.gs` / `Config.gs` ile aynı olmalıdır.

---

## Sayfalar ve sütunlar

### Gelir

| Sütun | Açıklama |
|--------|----------|
| Tarih | İşlem tarihi (`dd.MM.yyyy` veya Sheet tarih) |
| Tutar | Pozitif sayı (TL) |
| Açıklama | Kısa metin |
| Kategori | Örn. Satış, Diğer |
| Kaynak | Nakit / Kart / Havale vb. |
| Not | İsteğe bağlı |

### Gider

| Sütun | Açıklama |
|--------|----------|
| Tarih | İşlem tarihi |
| Tutar | Pozitif sayı (TL) |
| Açıklama | Kısa metin |
| Tedarikçi | `Tedarikçiler!Ad` ile aynı yazım |
| Kategori | Örn. Mal, Kira, Diğer |
| Not | İsteğe bağlı |

### Tedarikçiler

| Sütun | Açıklama |
|--------|----------|
| Ad | Benzersiz tedarikçi adı (eşleştirme anahtarı) |
| Telefon | İletişim |
| Not | İsteğe bağlı |
| KalanBorc | **Hesaplanan alan** — elle güvenilir kaynak değil (aşağıdaki kural) |

### Faturalar

| Sütun | Açıklama |
|--------|----------|
| FaturaNo | Tedarikçiye özgü fatura numarası |
| Tarih | Fatura tarihi |
| Tedarikçi | `Tedarikçiler!Ad` |
| Tutar | Fatura tutarı (borç artırır) |
| Vade | Son ödeme tarihi |
| Durum | Açık / Kısmi / Kapalı |
| Not | İsteğe bağlı |

### Odemeler

| Sütun | Açıklama |
|--------|----------|
| Tarih | Ödeme tarihi |
| Tedarikçi | `Tedarikçiler!Ad` |
| Tutar | Ödenen tutar (borç azaltır) |
| Yöntem | Nakit / Havale / Çek vb. |
| FaturaNo | İsteğe bağlı; ilgili fatura |
| Not | İsteğe bağlı |

### Kullanicilar

| Sütun | Açıklama |
|--------|----------|
| E-posta | Google hesabı e-postası |
| Rol | `patron` veya `personel` |
| Ad | Görünen ad |
| Aktif | Evet / Hayır |

> Not: Sandbox yetkisi şimdilik `Config.gs` içindeki `PATRON_EMAILS` / `PERSONEL_EMAILS` listelerinden okunur. Bu sayfa ileride senkron için tutulur.

---

## Tedarikçi kalan borç kuralı

```
KalanBorc(tedarikçi) = Σ Faturalar.Tutar(tedarikçi) − Σ Odemeler.Tutar(tedarikçi)
```

- Aynı **Ad** yazımı kullanılmalı (büyük/küçük harf ve boşluk farkı borç hesabını bozar).
- `Tedarikçiler!KalanBorc` sütunu özet içindir; resmi kaynak Faturalar − Odemeler toplamıdır.
- Negatif sonuç: fazla ödeme / avans (ileride ayrı işaretlenebilir).

---

## Çift kayıt anahtarı (öneri)

`Dedup.gs` şu anahtarları kullanır:

| Tür | Anahtar |
|-----|---------|
| Gelir / Gider | `Tarih` + `Tutar` + `Açıklama` (normalize: trim, küçük harf) |
| Fatura | `FaturaNo` + `Tedarikçi` |

Aynı anahtar zaten varsa yeni kayıt eklenmez; Türkçe uyarı döner.

---

## Kurulum

Tablo menüsü: **Aqua Tekel (Test)** → **Test sayfalarını kur**  
veya `setupTestSheets()` çalıştırın. Eksik sayfalar ve başlık satırları oluşturulur.
