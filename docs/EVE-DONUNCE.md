# Eve dönünce — Aqua Tekel test paneli (Windows)

Bu rehber, eve gelince **Windows** bilgisayarda test panelini kurmak içindir.  
Canlı muhasebe tablosuna **dokunmayın**. Yalnızca **Aqua TEKEL TEST PROJESİ** tablosunu kullanın.

Kod kaynağı: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel) → dal: **main**

Ayrıntılı kopyala-yapıştır notları için ayrıca: [PANEL-KURULUM.md](../PANEL-KURULUM.md)

---

## 1) GitHub’dan güncel dosyaları açın

1. Tarayıcıda depo sayfasını açın: [aqua-tekel / main](https://github.com/truekerjj1/aqua-tekel).
2. Üstte dalın **main** olduğunu kontrol edin.
3. Aşağıdaki her dosyayı tek tek açın → **Raw** (ham metin) → tümünü seçin (Ctrl+A) → kopyalayın (Ctrl+C).

### Kod dosyaları (`src/` — hepsi)

| Apps Script’te dosya adı | GitHub dosyası |
|--------------------------|----------------|
| `Main` | `src/Main.gs` |
| `Config` | `src/Config.gs` |
| `Auth` | `src/Auth.gs` |
| `Bootstrap` | `src/Bootstrap.gs` |
| `Income` | `src/Income.gs` |
| `Expense` | `src/Expense.gs` |
| `Suppliers` | `src/Suppliers.gs` |
| `Invoices` | `src/Invoices.gs` |
| `Payments` | `src/Payments.gs` |
| `SampleData` | `src/SampleData.gs` |
| `Dedup` | `src/Dedup.gs` |
| `Utils` | `src/Utils.gs` |

### Ekran dosyaları (`ui/` — hepsi)

| Apps Script’te dosya adı | GitHub dosyası |
|--------------------------|----------------|
| `ui/Index` | `ui/Index.html` |
| `ui/Styles` | `ui/Styles.html` |
| `ui/Client` | `ui/Client.html` |

İsterseniz bir kez daha: GitHub’daki `appsscript.json` içeriğini de kopyalayın (saat dilimi `Europe/Istanbul`).

---

## 2) Apps Script’e yapıştırın

1. Google’da **Aqua TEKEL TEST PROJESİ** tablosunu açın (canlı muhasebe değil).
2. Üst menü: **Uzantılar** → **Apps Script**.
3. Sol taraftaki varsayılan `Code.gs` dosyasının içini silin.  
   Ya silin, ya da adını `Main` yapıp `Main.gs` içeriğini yapıştırın.
4. Her kod dosyası için: sol panelde **+** → **Script** → yukarıdaki adı yazın → kopyaladığınız metni yapıştırın → kaydedin (disk ikonu veya Ctrl+S).
5. Her ekran dosyası için: **+** → **HTML** → adı **tam olarak** `ui/Index`, `ui/Styles`, `ui/Client` olsun → yapıştırın → kaydedin.
6. (İsteğe bağlı) Sol tarafta dişli → **Proje ayarları** → “appsscript.json göster” işaretleyin → GitHub’daki `appsscript.json` içeriğini yapıştırıp kaydedin.

**Önemli:** Eksik dosya bırakmayın. Özellikle `SampleData`, `Invoices` ve `Payments` yeni eklenen dosyalardır; unutulursa menü veya panel eksik kalır.

---

## 3) Test sayfalarını kurun + örnek veri yükleyin

1. Tabloya geri dönün ve sayfayı yenileyin (F5).
2. Üstte menü görünür: **Aqua Tekel (Test)**.
3. **Aqua Tekel (Test)** → **Test sayfalarını kur**  
   - Oluşur (yoksa): Gelir, Gider, Tedarikçiler, Faturalar, Odemeler, Kullanicilar.  
   - Zaten varsa dokunulmaz.
4. Aynı menüden: **Örnek test verisi yükle**  
   - Birkaç örnek tedarikçi, fatura, ödeme, gelir ve gider satırı ekler.  
   - Aynı örnekler ikinci kez basılırsa çoğu satır tekrar eklenmez.

---

## 4) Web App’i yalnızca kendiniz için yayınlayın

1. Apps Script editörüne dönün.
2. Sağ üst: **Deploy** → **New deployment**  
   (Daha önce yayınladıysanız: **Deploy** → **Manage deployments** → kalem → **New version**.)
3. Dişli ikon → tip: **Web app**.
4. Description: `Test` (veya istediğiniz kısa yazı).
5. **Execute as:** Me (ben).
6. **Who has access:** **Only myself** (yalnızca ben).
7. **Deploy** → Google izin isterse hesabınızla onaylayın.
8. Çıkan **Web app URL** linkine tıklayın.

**Yapmayın:** “Anyone” / herkese açık seçmeyin.

---

## 5) Config’e kendi e-postanızı patron olarak yazın

1. Apps Script’te `Config` dosyasını açın.
2. Şu satırları bulun:

```javascript
PATRON_EMAILS: [
  'patron@example.com'
],
```

3. `patron@example.com` yerine **kendi Google e-postanızı** yazın (tabloda / Apps Script’te oturum açtığınız adres).  
   Örnek: `'adiniz@gmail.com'`
4. Kaydedin.
5. Web App’i yeniden yayınlayın (Deploy → Manage deployments → New version) ki değişiklik geçerli olsun.
6. `YOUR_SPREADSHEET_ID` doldurmak **zorunlu değildir**; test paneli bağlı tabloyu kullanır. Canlı muhasebe ID’si yazmayın.

Personel deneyecekseniz `PERSONEL_EMAILS` içindeki örneği de gerçek bir test e-postasıyla değiştirin. Değiştirmezseniz panelde rol **Misafir** kalır ve yazma çalışmaz.

---

## 6) Beklenen ekran kontrolleri

Paneli (Web App linkini) açınca şunları görmelisiniz:

1. Üstte rozet: **Test ortamı**
2. Marka: **Aqua Tekel**
3. Selamlama: **Merhaba Aqua Tekel**
4. Sekmeler: **Özet** · **Gelir** · **Gider** · **Tedarikçi**
5. **Özet** sekmesinde:
   - Rol: **Patron** (e-postayı Config’e doğru yazdıysanız)
   - Kullanıcı: kendi e-postanız
   - Yazma: açık / yazabilir (veya benzeri olumlu ifade)
   - Gelir toplamı, gider toplamı, tedarikçi borç toplamı (örnek veri yüklendiyse sayılar dolu)
6. Tabloda sekmeler: Gelir, Gider, Tedarikçiler, Faturalar, Odemeler, Kullanicilar — örnek satırlar görünür.

Bir şey eksikse: dosya listesini (bölüm 1) tekrar kontrol edin → kaydedin → Web App’e **yeni sürüm** yayınlayın → tabloyu yenileyip menüden test sayfası / örnek veriyi tekrar deneyin.

---

## Kısa hatırlatma

| Yapın | Yapmayın |
|-------|----------|
| Yalnızca **Aqua TEKEL TEST PROJESİ** | Canlı muhasebe tablosu / script |
| Web App: **Only myself** | Herkese açık erişim |
| Config’e **kendi** e-postanız | Canlı Spreadsheet / Script ID uydurmak |
