# Bu Ecof Empires — GitHub Meydan Defteri Tasarımı

## Sonuç

`Bu Ecof Empires🏹🪓⚔️`, haftalık Age of Empires II: Definitive Edition 4v4 maçlarını tutan, telefon öncelikli tek sayfalık bir meydan defteri olacak. Eski sabit sidebar, header, footer, bottom navigation ve dashboard kart yığını tamamen kaldırılacak. Ana sayfa, iPhone Safari’de üstten alta kesintisiz akan tek bir belge gibi çalışacak; yalnızca sağ alttaki yuvarlak düzenleme düğmesi sabit kalacak.

Ürün, kaynak kodu, uygarlık armaları, veri dosyası, düzenleme geçmişi ve yayın süreciyle birlikte tamamen `ekremus/53` GitHub reposunda yaşayacak. Üretim adresi doğrudan `https://ekremus.github.io/53/` olacak; başka bir siteye yönlendirme veya çalışma zamanı API bağımlılığı olmayacak.

## Ürün dili

- Görünen ürün adı tam olarak `Bu Ecof Empires🏹🪓⚔️` olacak.
- Birinci takımın adı `Cortinyanlar`, ikinci takımın adı `Bakracoğulları` olacak.
- `Kırmızı Takım` ve `Mavi Takım` kullanıcıya gösterilmeyecek. Renkler yalnızca görsel ayrım için kullanılacak.
- Gereksiz slogan, dostluk metni, pazarlama kopyası, onboarding turu veya açıklayıcı hero paragrafı olmayacak.
- Arayüz dili Türkçe olacak; uygarlıkların resmî İngilizce adları korunacak.

## Görsel dünya

Seçilen yön **Meydan Defteri**’dir. Üst yüzey, daha önce oluşturulan `53` ahşap/parşömen görselini kullanır. Bu yüzeyin altında ürün adı ve haftalık sezon bilgisi görünür. Devamında açık parşömen zemin üzerinde AoE2 maç sonrası ekranlarının yoğunluğu ile spor sonuç sitelerinin taranabilir satır düzeni birleşir.

Görsel malzemeler:

- koyu ceviz ve yanık meşe arka plan;
- sıcak parşömen ana yüzey;
- bronz ve eskitilmiş altın ayırıcılar;
- Cortinyanlar için kontrollü mavi, Bakracoğulları için kontrollü turuncu;
- başlıklarda karakterli bir serif, veri ve kontrollerde son derece okunaklı bir sans-serif;
- Siege Engineers AoE2 Tech Tree deposundaki yerel olarak vendored uygarlık armaları;
- çok hafif kâğıt dokusu, ince iç çizgi ve küçük gölge; glassmorphism, neon, gradient yazı ve iç içe kartlar yok.

Hero’dan sonra tüm ekran tek bir bilgi akışıdır. Hero veya skor alanı sticky olmayacak. Sayfa aşağı kayarken normal belgenin parçası gibi kaybolacak.

## Ana sayfa bilgi mimarisi

Ana sayfa şu sırada akar:

1. `53` görseli, ürün adı ve hafta etiketi.
2. Cortinyanlar–Bakracoğulları toplam galibiyet skoru ve toplam maç sayısı.
3. Son maç: tarih, kazanan, sekiz oyuncu, her oyuncunun uygarlık arması ve adı.
4. Son maçlar: en yeniden eskiye kompakt sonuç satırları. İlk beş maç doğrudan görünür; `Tüm maçlar` arşiv diyaloğunu açar.
5. Oyuncu sıralaması: sıra, oyuncu, maç, galibiyet, mağlubiyet ve kazanma oranı. İlk sekiz oyuncu görünür; tamamı aynı diyaloğun sıralama görünümünde açılır.
6. Sayfanın doğal son boşluğu. Footer veya alt navigasyon bulunmaz.

Veri azsa yapay demo satırı gösterilmez. Mevcut tek maç gerçek haliyle görünür; uygarlık bilgisi olmayan eski oyuncular `Random` armasıyla sunulur.

## Mobil davranış

- Temel tasarım genişliği 320–480 piksel arasıdır.
- `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-top)` ve `env(safe-area-inset-bottom)` kullanılır.
- Arka plan rengi Safari’nin üst ve alt taşma alanlarıyla aynı olur; overscroll sırasında beyaz boşluk görünmez.
- Yatay kaydırma hiçbir ana yüzeyde oluşmaz.
- Dokunma hedefleri en az 44×44 pikseldir.
- Sağ alt FAB, `safe-area-inset-bottom` üzerinde konumlanır; açıkken üç işlemlik küçük bir menü gösterir.
- 720 piksel üstünde aynı bilgi mimarisi korunur; içerik en fazla 1040 piksel olur, son maç ve sıralama iki sütuna geçebilir. Ayrı desktop navigasyonu eklenmez.

## Düzenleme kontrolü

Sağ alttaki tek yuvarlak düğme şu eylemleri açar:

1. `Yeni maç`
2. `Oyuncular`
3. `GitHub bağlantısı` veya bağlantı aktifse `Kilitle`

Menü dışında sürekli görünen başka bir edit kontrolü olmayacak. Diyalog açıkken arka plan kaydırması kilitlenir; Escape, dış alana dokunma ve görünür kapatma düğmesi desteklenir.

## Tam GitHub düzenleme mimarisi

GitHub Pages sunucu kodu çalıştırmadığı için gerçek yetkilendirme GitHub repo yazma iznidir. `53` tek başına güvenlik sınırı değildir; yetkisiz bir GitHub hesabı veri dosyasına commit atamaz.

Editör kurulumu:

1. Repo sahibi arkadaşını `ekremus/53` reposuna write collaborator olarak ekler.
2. Editör yalnızca bu repo için `Contents: Read and write` yetkili fine-grained personal access token üretir.
3. Token ilk kurulumda sayfaya bir kez girilir.
4. Tarayıcı tokenı 250.000 iterasyonlu PBKDF2-SHA-256 ile `53` PIN’inden türetilen 256-bit anahtarla, rastgele salt ve IV kullanarak AES-GCM ile şifreler.
5. Yalnızca şifreli paket cihazın `localStorage` alanında tutulur. Açık token hiçbir dosyaya, loga, URL’ye veya analytics sistemine yazılmaz.
6. Sonraki düzenlemelerde `53` PIN’i cihazdaki paketi açar. `Kilitle` bellekteki açık tokenı siler; `GitHub bağlantısını kaldır` şifreli paketi de cihazdan siler.

Üçüncü taraf script, analytics veya reklam olmayacak. Böylece tokenın tarayıcı içinde maruz kalma yüzeyi minimumda kalır. Token GitHub API `/user` ve repo erişim uç noktalarıyla doğrulanır; write izni olmayan kullanıcı edit moduna giremez.

## Veri modeli

Tek üretim veri kaynağı `docs/data/state.json` dosyasıdır.

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "updatedAt": "2026-07-26T00:33:44.296Z",
  "teams": [
    { "id": "cortinyanlar", "name": "Cortinyanlar", "tone": "blue" },
    { "id": "bakracogullari", "name": "Bakracoğulları", "tone": "orange" }
  ],
  "players": [
    { "id": "buyukekrem", "name": "BuyukEkrem", "active": true },
    { "id": "emre", "name": "Emre", "active": true },
    { "id": "serkan", "name": "Serkan", "active": true },
    { "id": "alman-general", "name": "Alman General", "active": true },
    { "id": "neudzulab", "name": "Neudzulab", "active": true },
    { "id": "italyan-aygiri", "name": "Italyan Aygiri", "active": true },
    { "id": "mstfunsal", "name": "mstfunsal", "active": true },
    { "id": "orc-rist", "name": "OrC_RIST", "active": true }
  ],
  "matches": [
    {
      "id": "12131315-d162-4312-ab54-98570e741613",
      "date": "2026-07-26",
      "teams": {
        "cortinyanlar": [
          { "playerId": "buyukekrem", "civilization": "Random" },
          { "playerId": "emre", "civilization": "Random" },
          { "playerId": "serkan", "civilization": "Random" },
          { "playerId": "alman-general", "civilization": "Random" }
        ],
        "bakracogullari": [
          { "playerId": "neudzulab", "civilization": "Random" },
          { "playerId": "italyan-aygiri", "civilization": "Random" },
          { "playerId": "mstfunsal", "civilization": "Random" },
          { "playerId": "orc-rist", "civilization": "Random" }
        ]
      },
      "winner": "cortinyanlar"
    }
  ]
}
```

Üretim kayıtlarında her takım tam dört katılımcı içerir. Aynı oyuncu aynı maçta iki kez kullanılamaz. Oyuncu adı en fazla 40 karakter, tarih geçerli ISO `YYYY-MM-DD`, uygarlık ise `Random` veya tanımlı AoE2 DE listesinde olmalıdır.

Maçlar oyuncu adını değil `playerId` değerini saklar. Böylece oyuncu yeniden adlandırıldığında tüm tarih ve istatistikler otomatik güncellenir.

## Oyuncu yönetimi

Oyuncular diyaloğu aktif ve pasif oyuncuları ayrı gösterir.

- Yeni oyuncu eklenebilir.
- Oyuncu yeniden adlandırılabilir.
- Hiçbir maçta kullanılmamış oyuncu kalıcı olarak silinebilir.
- Geçmiş maçta kullanılmış oyuncu silinmez; `active: false` yapılarak yeni maç dropdown’ından saklanır.
- Pasif oyuncu tekrar aktifleştirilebilir.
- Aynı adı büyük/küçük harf farkıyla ikinci kez eklemek engellenir.

Yeni maç editöründeki oyuncu dropdown’unun son seçeneği `＋ Yeni oyuncu` olur. Bu seçenek inline ad alanını açar ve yeni oyuncuyu hem kadroya hem merkezi oyuncu listesine ekler.

## Maç düzenleme

Yeni maç veya mevcut maç editörü tam ekran mobil dialog olarak açılır.

- Tarih alanı üstte bulunur.
- Cortinyanlar ve Bakracoğulları ayrı parşömen bölümleridir.
- Her takımda dört sıra bulunur: oyuncu dropdown’u, uygarlık arması ve uygarlık dropdown’u.
- Kullanılan oyuncular diğer dropdown’larda devre dışı bırakılır.
- Kazanan iki seçenekli belirgin kontrolle seçilir.
- Mevcut maçta `Maçı sil` işlemi ayrı tehlikeli alandadır ve ikinci onay gerektirir.
- `Vazgeç` değişiklikleri bırakır; `Kaydet` önce yerel doğrulama, sonra GitHub commit’i yapar.

## GitHub kayıt akışı ve çakışmalar

Kaydetme işlemi seri yürür:

1. `docs/data/state.json` GitHub Contents API’den okunur ve blob SHA alınır.
2. Editör açıldığında görülen SHA ile son SHA karşılaştırılır.
3. SHA değişmişse commit yapılmaz; kullanıcıya `Veri başka biri tarafından güncellendi` mesajı ve son hâli yükleme eylemi gösterilir.
4. Değişmemişse doğrulanmış yeni JSON, `sha` ve `branch: main` ile Contents API’ye PUT edilir.
5. Commit mesajı işlem türünü içerir: `data: add match 2026-07-26`, `data: update players` veya `data: delete match 2026-07-26`.
6. Başarılı commit sonrası ekran yerel yeni state’i hemen gösterir; Pages yayın gecikmesi kullanıcıyı bekletmez.

GitHub API 401/403/409/422 cevapları ayrı ve anlaşılır Türkçe mesajlara çevrilir. Token hiçbir hata mesajında yer almaz.

## Uygarlık armaları

Standart AoE2 DE uygarlık listesi ve armaları `public` bir CDN’den hotlink edilmez. Siege Engineers `aoe2techtree` reposundaki ilgili 53 PNG dosyası `docs/assets/civs/` içine kopyalanır ve kaynak/lisans notu `docs/assets/civs/NOTICE.md` dosyasında tutulur. `Random` için projeye ait nötr soru işaretli bir arma oluşturulur.

Uygarlık arması public maç görünümünde 24–28 piksel, editörde 32 piksel gösterilir. Görsel yüklenmezse uygarlık adı görünmeye devam eder.

## Statik uygulama yapısı

- `docs/index.html`: semantik uygulama iskeleti, meta veriler, dialog kökleri.
- `docs/styles.css`: tasarım tokenları, mobile-first layout, safe-area ve responsive kurallar.
- `docs/app.js`: başlatma, render koordinasyonu ve event bağlama.
- `docs/lib/model.js`: state doğrulama, normalizasyon ve istatistik hesaplama.
- `docs/lib/github.js`: token şifreleme/açma ve GitHub Contents API istemcisi.
- `docs/lib/views.js`: public ledger, arşiv, leaderboard ve dialog HTML üretimi.
- `docs/lib/editor.js`: maç ve oyuncu editörleri ile draft yönetimi.
- `docs/data/state.json`: tek ortak veri kaynağı.
- `docs/assets/`: hero, PWA ikonları, fontlar ve uygarlık armaları.

Modüller ES module olarak yüklenir. Framework, runtime build veya harici UI kütüphanesi yoktur.

## Erişilebilirlik ve performans

- Semantik heading, table, button, form label ve native dialog yapıları kullanılır.
- Klavye odağı dialog içinde tutulur ve kapanınca FAB’a döner.
- Renk tek bilgi taşıyıcı değildir; kazanan metin ve simgeyle belirtilir.
- Kontrast normal metinde en az 4.5:1 olur.
- `prefers-reduced-motion` tüm geçişleri kapatır.
- İlk ekran JavaScript olmadan ürün adı ve yükleniyor durumu gösterir; veri hatasında retry sunulur.
- Tüm üretim varlıkları yerel olduğu için üçüncü taraf istek yapılmaz; yalnızca edit sırasında `api.github.com` çağrılır.
- Toplam ilk yük JavaScript’i gzip sonrası 50 KB altında hedeflenir; uygarlık armaları lazy-load edilir.

## Test ve doğrulama

- Model testleri: schema, tam 4v4, duplicate oyuncu, uygarlık doğrulaması, isim normalizasyonu, soft delete ve istatistik sıralaması.
- GitHub istemci testleri: AES-GCM roundtrip, yanlış PIN, tokenın kalıcı açık tutulmaması, SHA conflict ve API hata eşlemesi.
- DOM testleri: no header/footer/sidebar/bottom-nav, takım adları, son maç, player manager ve FAB menüsü.
- Statik güvenlik kontrolü: repo ve `docs/` içinde PAT biçimli sır bulunmaması, dış script olmaması, tokenın URL/loga yazılmaması.
- Görsel doğrulama: 390×844 iPhone ve 1440×1000 desktop ekran görüntüleri tek batched turda incelenir; gerekirse en fazla bir düzeltme turu yapılır.
- GitHub Pages yayını sonrası ana URL, state JSON, hero, uygarlık armaları, mobil viewport ve repo commit SHA doğrulanır.

## Göç ve yayın

Mevcut D1’daki tek maç JSON’a taşınır. Uygarlığı olmayan sekiz kayıt `Random` olur. GitHub Pages `/docs` kaynağı aynı kalır fakat yönlendirme dosyası gerçek uygulamayla değiştirilir. Yeni uygulama doğrulandıktan sonra ChatGPT Sites canlı adresi üretim bağımlılığı olmaktan çıkar; repo içinde hiçbir Sites URL’si veya runtime çağrısı kalmaz.
