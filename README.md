# Aqua Tekel — Faz 1 iskelet (test)

Bu klasör, **Aqua Tekel** için başlangıç iskeletidir.  
Henüz gerçek muhasebe hesabı hesaplamaz; panelde **“Merhaba Aqua Tekel”** görürsünüz.  
**Canlı muhasebe dosyasına bağlanmayın.** Şimdilik yalnızca test.

Test tablonuzun adı: **Aqua TEKEL TEST PROJESİ**  
(Bu iskelette tablo ID’si yoktur; siz sonra yazarsınız.)

GitHub hesabı (hedef): **truekerjj1**

---

## Ne var, ne yok?

**Var**

- Mobil uyumlu basit Web App paneli (Türkçe)
- Ayar yerleri (Config)
- Patron / personel yetkisi için boş çerçeve (Auth)
- Gelir, gider, tedarikçi, çift kayıt için boş fonksiyonlar (sonra doldurulacak)

**Yok (bilerek)**

- Canlı Google Sheet bağlantısı
- Gerçek gelir/gider motoru
- Herkese açık yayın

---

## 1) Bu klasörü GitHub’a alma

Kodunuzu bilgisayarda veya bulutta saklamak için GitHub kullanırız.

1. Tarayıcıda [https://github.com](https://github.com) açın ve **truekerjj1** ile giriş yapın.
2. Sağ üstten **New repository** (yeni depo) deyin.
3. Repository name: `aqua-tekel` veya `aqua-tekel-test`
4. **Private** (gizli) seçebilirsiniz — önerilir.
5. “Add a README” işaretlemeyin (bizde zaten README var).
6. Create repository deyin.
7. Bu `aqua-tekel` klasörünün içindeki dosyaları o depoya yükleyin:
   - GitHub sayfasındaki **uploading an existing file** ile sürükleyip bırakabilir,
   - veya bilgisayarınızda Git kuruluysa klasörde şu komutları kullanabilirsiniz:

```bash
cd aqua-tekel
git init
git add .
git commit -m "Aqua Tekel Faz 1 iskelet"
git branch -M main
git remote add origin https://github.com/truekerjj1/aqua-tekel.git
git push -u origin main
```

> Bu ortamda GitHub girişi (auth) yoksa depo sizin için otomatik oluşturulamaz.  
> Kullanıcı adınız hazır: **truekerjj1** — depoyu siz oluşturup dosyaları yükleyin.

---

## 2) Test sheet (Google tablo)

Sizde zaten şu isimde bir test tablosu olmalı:

**Aqua TEKEL TEST PROJESİ**

- Canlı muhasebe tablosunu **açmayın / bağlamayın**.
- Tablonun adres çubuğundaki uzun kod (ID) şöyledir:  
  `https://docs.google.com/spreadsheets/d/` **BURASI_ID** `/edit`
- Bu ID’yi şimdilik not alın. Kodda yer tutucu var: `YOUR_SPREADSHEET_ID`  
  (`src/Config.gs` içinde). Doldurmayı bilerek sonraya bırakabilirsiniz; panel yine açılır.

---

## 3) Google’da Apps Script projesi oluşturma

İki yoldan birini seçin.

### Yol A — Kopyala-yapıştır (en basit)

1. [https://script.google.com](https://script.google.com) açın.
2. **Yeni proje** oluşturun. Adını örneğin `Aqua Tekel Test` koyun.
3. Sol taraftaki varsayılan `Code.gs` içeriğini silin.
4. Bu klasördeki `src/` altındaki her `.gs` dosyasının içeriğini  
   Scripts’te ayrı dosyalar olarak ekleyin (dosya adları: `Main`, `Config`, `Auth`, …).
5. `ui/` altındaki `Index.html`, `Styles.html`, `Client.html` dosyalarını  
   HTML dosyası olarak ekleyin. Klasör kullanıyorsanız yollar şöyle kalmalı: `ui/Index`, `ui/Styles`, `ui/Client`.
6. Proje ayarlarından `appsscript.json` içeriğini (saat dilimi `Europe/Istanbul`) uygulayın  
   veya Manifest’i düzenleyerek aynı ayarları verin.

### Yol B — clasp (bilgisayardan gönderme)

1. Bilgisayarda Node.js kurulu olsun.
2. Terminalde:

```bash
npm install -g @google/clasp
clasp login
```

3. Google’da boş bir Apps Script projesi oluşturun; proje ayarlarından **Script ID**’yi kopyalayın.
4. Bu klasörde:

```bash
cp .clasp.json.example .clasp.json
```

5. `.clasp.json` içindeki `YOUR_SCRIPT_ID` yerine kendi Script ID’nizi yazın.
6. Sonra:

```bash
clasp push
```

**Önemli:** Gerçek `.clasp.json` dosyasını GitHub’a koymayın (`.gitignore` bunu engeller).

---

## 4) Web App’i yalnızca kendinize açma (test)

Canlı müşteri / tüm personele açmayın. Sadece siz test edin.

1. Apps Script editöründe **Deploy** → **New deployment**
2. Tip: **Web app**
3. Açıklama: örneğin `Faz1 test`
4. **Execute as:** Me (ben)
5. **Who has access:** Only myself (yalnızca ben)
6. Deploy deyin; çıkan linki tarayıcıda açın.

Telefonda da aynı linki açabilirsiniz (mobil uyumlu panel).

Görmeniz gerekenler:

- Marka: **Aqua Tekel**
- Etiket: **Test ortamı**
- Yazı: **Merhaba Aqua Tekel**

---

## 5) Sonra ne gelecek? (şimdilik boş)

| Dosya | Ne için (ileride) |
|--------|-------------------|
| `Income.gs` | Gelir kayıtları |
| `Expense.gs` | Gider kayıtları |
| `Suppliers.gs` | Tedarikçiler |
| `Dedup.gs` | Çift kayıt önleme |
| `Auth.gs` | Patron / personel yetkisi |

Bunlar bilerek **stub** (boş iskelet): çalışır gibi görünür ama sheet’e yazmaz.

---

## Güvenlik hatırlatması

- Canlı muhasebe Spreadsheet / Script ID’sini buraya **yazmayın**.
- `YOUR_SPREADSHEET_ID` ve `YOUR_SCRIPT_ID` yer tutucudur.
- Web App erişimini **Only myself** bırakın; canlıya taşıma yok.
- `.clasp.json` ve şifre/token dosyalarını paylaşmayın.

---

## Klasör yapısı

```
aqua-tekel/
├── appsscript.json
├── .clasp.json.example
├── .gitignore
├── README.md
├── src/
│   ├── Main.gs
│   ├── Config.gs
│   ├── Auth.gs
│   ├── Income.gs
│   ├── Expense.gs
│   ├── Suppliers.gs
│   ├── Dedup.gs
│   └── Utils.gs
└── ui/
    ├── Index.html
    ├── Styles.html
    └── Client.html
```

Sorun olursa önce paneli “Only myself” ile yeniden deploy edin; hâlâ boşsa `src/Main.gs` ve `ui/Index.html` dosyalarının projede olduğundan emin olun.
