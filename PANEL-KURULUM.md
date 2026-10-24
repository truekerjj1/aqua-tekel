# Aqua Tekel — Panel kurulumu (kopyala-yapıştır)

Yalnızca test. Canlı muhasebe tablosuna dokunmayın.  
Tablo adı: **Aqua TEKEL TEST PROJESİ**

---

## 1) Apps Script’i açın

1. Google’da **Aqua TEKEL TEST PROJESİ** tablosunu açın.
2. Üst menü: **Uzantılar** → **Apps Script**.
3. Sol tarafta varsayılan `Code.gs` dosyası görünür. İçini silin (boş bırakın veya silin).

---

## 2) Kod dosyalarını ekleyin (`.gs`)

Her dosya için: sol panelde **+** → **Script** → adı aşağıdaki gibi yazın → içeriği GitHub’daki dosyadan **tümüyle kopyalayıp yapıştırın** → kaydedin (disk ikonu veya Ctrl+S).

| Apps Script’te dosya adı | GitHub’dan kopyalanacak dosya |
|--------------------------|-------------------------------|
| `Main` | `src/Main.gs` |
| `Config` | `src/Config.gs` |
| `Auth` | `src/Auth.gs` |
| `Bootstrap` | `src/Bootstrap.gs` |
| `Income` | `src/Income.gs` |
| `Expense` | `src/Expense.gs` |
| `Suppliers` | `src/Suppliers.gs` |
| `Dedup` | `src/Dedup.gs` |
| `Utils` | `src/Utils.gs` |

Kod kaynağı: [https://github.com/truekerjj1/aqua-tekel](https://github.com/truekerjj1/aqua-tekel) → `src/` klasörü.  
Dosyaya tıklayın → **Raw** → tüm metni seçip kopyalayın.

> İpucu: İlk `Code.gs` dosyasını silip yerine `Main` ekleyebilirsiniz; veya `Code.gs`’i `Main` diye yeniden adlandırıp `Main.gs` içeriğini yapıştırın.

---

## 3) HTML dosyalarını ekleyin

Sol panelde **+** → **HTML** → adı **tam olarak** şöyle yazın (eğik çizgi dahil):

| Apps Script’te dosya adı | GitHub’dan kopyalanacak dosya |
|--------------------------|-------------------------------|
| `ui/Index` | `ui/Index.html` |
| `ui/Styles` | `ui/Styles.html` |
| `ui/Client` | `ui/Client.html` |

Yine: dosyayı açın → Raw → tümünü kopyala → yapıştır → kaydet.

---

## 4) Saat dilimi (bir kez)

1. Sol tarafta **Proje ayarları** (dişli).
2. **Show "appsscript.json" manifest file in editor** işaretleyin.
3. Editöre dönün; `appsscript.json` dosyasını açın.
4. GitHub’daki `appsscript.json` içeriğini **tümüyle** yapıştırıp kaydedin  
   (içinde `Europe/Istanbul` ve Web App: Only myself ayarları vardır).

---

## 5) Web App’i yayınlayın (yalnızca siz)

1. Sağ üst: **Deploy** → **New deployment**.
2. Dişli ikon → tip: **Web app**.
3. Description: `Test`.
4. **Execute as:** Me.
5. **Who has access:** Only myself.
6. **Deploy** → izin isterse hesabınızla onaylayın.
7. Çıkan **Web app URL** linkine tıklayın (telefonda da açılabilir).

### Beklenen ekran

- **Aqua Tekel**
- **Test ortamı**
- **Merhaba Aqua Tekel**

---

## 6) Test sayfalarını kurun (isteğe bağlı, tablo içinden)

Tabloyu yenileyin. Üstte menü: **Aqua Tekel (Test)** → **Test sayfalarını kur**.

Oluşur (yoksa): Gelir, Gider, Tedarikçiler, Faturalar, Odemeler, Kullanicilar.  
Varsa dokunulmaz.

**Paneli aç (talimat)** menüsü, Web App linkini nasıl bulacağınızı hatırlatır.

---

## Yapmayın

- Canlı muhasebe tablosunu / script’ini açmayın.
- “Anyone” / herkese açık erişim seçmeyin.
- Spreadsheet veya Script ID uydurmayın; Config’deki `YOUR_SPREADSHEET_ID` şimdilik kalsın.
