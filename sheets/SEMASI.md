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
| Kullanici | İşlemi yapan panel kullanıcısı |

### Gider

| Sütun | Açıklama |
|--------|----------|
| Tarih | İşlem tarihi |
| Tutar | Pozitif sayı (TL) |
| Açıklama | Kısa metin |
| Kategori | `CONFIG.GIDER_KATEGORILERI` — Yemek, Mutfak, Temizlik, Market, Muhasebe, Kira, Elektrik, Su, Diğer |
| Not | İsteğe bağlı |
| Kullanici | İşlemi yapan |

> Gider **tedarikçi kullanmaz**. Tedarikçi borçları Faturalar − Ödemeler ile hesaplanır.

### Tedarikçiler

| Sütun | Açıklama |
|--------|----------|
| Ad | Benzersiz tedarikçi adı (eşleştirme anahtarı) |
| Telefon | İletişim |
| Not | İsteğe bağlı |
| KalanBorc | **Hesaplanan alan** — elle güvenilir kaynak değil |
| Aktif | Evet / Hayır (soft delete) |

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
| Yöntem | Nakit / Kredi kartı / Vadeli (girişte) |
| Kullanici | İşlemi yapan |
| OnayDurum | Bekliyor / Onaylandi / Red |
| DekontFileId | Drive dosya id |
| DekontUrl | Drive URL |

### Odemeler

| Sütun | Açıklama |
|--------|----------|
| Tarih | Ödeme tarihi |
| Tedarikçi | `Tedarikçiler!Ad` |
| Tutar | Ödenen / vadeli tutar |
| Yöntem | **Nakit** / **Kredi kartı** / **Vadeli** |
| FaturaNo | İsteğe bağlı |
| Not | İsteğe bağlı |
| Kullanici | İşlemi yapan |
| OnayDurum | Bekliyor / Onaylandi / Red |
| DekontFileId | Drive dosya id |
| DekontUrl | Drive URL |

### Onaylar

| Sütun | Açıklama |
|--------|----------|
| Id | Benzersiz onay id |
| Tip | fatura / odeme |
| RefId | Satır numarası |
| Kullanici | İşlemi yapan |
| Tarih | Kayıt tarihi |
| Durum | Bekliyor / Onaylandi / Red |
| Ozet | Kısa özet |

### Kullanicilar

| Sütun | Açıklama |
|--------|----------|
| Id | Panel kullanıcı id (`test-fatih` …) |
| E-posta | Placeholder / Google e-posta |
| Rol | `patron` veya `personel` |
| Ad | Görünen ad |
| Aktif | Evet / Hayır |
| Kod | Erişim kodu — **test only** (düz metin OK) |

> `Config.TEST_USERS` ile senkron. Kodlar sandbox kolaylığı içindir; üretime taşınmaz.

### GirisLog

| Sütun | Açıklama |
|--------|----------|
| Tarih | Giriş tarihi |
| Saat | Giriş saati |
| UserId | Panel kullanıcı id |
| Ad | Görünen ad |
| Rol | patron / personel |

> `Config.SHEETS.GIRIS_LOG` / `HEADERS.GIRIS_LOG` ile Bootstrap aynı olmalı. Haftalık özet için kullanılır.

---

## Tedarikçi kalan borç kuralı

```
KalanBorc(tedarikçi) = Σ Faturalar.Tutar − Σ Odemeler.Tutar(yöntem ∈ {Nakit, Kredi kartı})
```

- **Vadeli** ödemeler kayda geçer ama borç düşümünde **sayılmaz**.
- Aynı **Ad** yazımı kullanılmalı.
- `refreshSupplierBalances()` fatura/ödeme eklenince çağrılır.

### CRUD dosyaları

| Sayfa | Dosya | Fonksiyonlar |
|--------|--------|--------------|
| Faturalar | `src/Invoices.gs` | `addInvoice`, `listInvoices`, `updateInvoice` |
| Odemeler | `src/Payments.gs` | `addPayment`, `listPayments`, `updatePayment` |
| Tedarikçiler | `src/Suppliers.gs` | `addSupplier`, `updateSupplier`, `deleteSupplier`, … |
| Onaylar | `src/Approvals.gs` | `listApprovals`, `decideApproval` |
| Kullanicilar | `src/Users.gs` | `listUsersAdmin`, `addUserAdmin`, … |
| Dekont | `src/Attachments.gs` | `uploadDekont`, `getDekontFolder` |
| Yönetici | `src/Admin.gs` | `getAdminTodaySummary`, grafikler, filtre |

---

## Çift kayıt anahtarı

| Tür | Anahtar |
|-----|---------|
| Gelir / Gider | `Tarih` + `Tutar` + `Açıklama` |
| Fatura | `FaturaNo` + `Tedarikçi` |
| Ödeme | `Tarih` + `Tedarikçi` + `Tutar` + `Yöntem` + `FaturaNo` (yalnız tam eşleşme) |

---

## Kurulum

Tablo menüsü: **Aqua Tekel (Test)** → **Test sayfalarını kur**  
veya `setupTestSheets()`. Eksik sayfalar (Onaylar dahil) oluşturulur.

Örnek satırlar: **Örnek test verisi yükle**.  
Dekontlar: Drive `Aqua Tekel TEST / Dekontlar` (getOrCreate).
