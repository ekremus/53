# Bu Ecof Empires — 53

Haftalık Age of Empires II: Definitive Edition 4v4 maçları için telefon öncelikli ortak meydan defteri.

**Canlı adres:** [https://ekremus.github.io/53/](https://ekremus.github.io/53/)

Uygulama, veri ve bütün görsel varlıklar `main/docs` üzerinden GitHub Pages’ta yayınlanır. Çalışma zamanında ayrı bir sunucu, veritabanı, framework, analytics veya harici script kullanılmaz.

## Neler tutuluyor?

- maç tarihi;
- Cortinyanlar’ın dört oyuncusu ve uygarlıkları;
- Bakracoğulları’nın dört oyuncusu ve uygarlıkları;
- kazanan takım;
- merkezi oyuncu listesi.

Takım skorları ile oyuncuların maç, galibiyet, mağlubiyet ve kazanma oranları tarayıcıda otomatik hesaplanır. Kaynak veri [`docs/data/state.json`](docs/data/state.json) dosyasındadır; Git geçmişi değişiklik kaydıdır.

Özet şema:

```json
{
  "schemaVersion": 1,
  "revision": 3,
  "updatedAt": "2026-07-26T01:12:29.527Z",
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
      "id": "stable-id",
      "date": "2026-07-26",
      "teams": {
        "cortinyanlar": [
          { "playerId": "buyukekrem", "civilization": "Huns" },
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

Gerçek kayıtta her takım dizisi tam dört farklı oyuncu içerir. `Random` dahil 54 uygarlık seçeneği vardır.

## Telefondan düzenleme

Sağ alttaki yuvarlak düğmeden `GitHub bağlantısı` açılır.

1. Yalnızca `ekremus/53` reposu için geçerli, **Contents: Read and write** iznine sahip dar kapsamlı bir GitHub tokenı oluştur.
2. Tokenı bu cihazda bir kez yapıştır.
3. PIN alanına `53` yaz.

Token, Web Crypto ile AES-GCM kullanılarak cihazın `localStorage` alanında şifreli saklanır. Anahtar PBKDF2/SHA-256 ve 250.000 turla PIN’den türetilir; açık token repoya veya uygulama verisine yazılmaz.

`53` yalnızca cihazdaki şifreli bağlantıyı açan kolaylık PIN’idir. Gerçek yazma yetkisi GitHub tokenının repo iznidir. Tokenı kaynak koda, issue’ya veya mesaja koyma. Ortak bir cihazda menüden `Kilitle`; gerekirse bağlantı penceresinden bu cihazdaki kaydı tamamen sil.

Tarayıcı kaydı, en son dosya SHA’sını kontrol ederek tek Git commit’i oluşturur. Başka biri önce kaydettiyse eski veri sessizce ezilmez. GitHub Pages yeni commit’i yayınlayana kadar diğer cihazlarda kısa bir gecikme olabilir.

## Oyuncu davranışı

- Bir isim bir kez eklenince sonraki maçlarda dropdown’dan seçilir.
- Yeniden adlandırma kimlik üzerinden çalışır; eski maçlarda da yeni isim görünür.
- Hiç kullanılmamış oyuncu tamamen silinir.
- Geçmiş maçta kullanılmış oyuncu silinmek yerine pasif yapılır; geçmiş kayıt korunur.
- Pasif oyuncu daha sonra tekrar etkinleştirilebilir.

## Yerel geliştirme ve test

Node.js 22 veya üzeri gerekir.

```bash
npm ci
npm run dev
```

Uygulama `http://127.0.0.1:4173/` adresinde açılır.

```bash
npm test
```

Bu komut veri modeli, istatistikler, güvenli GitHub istemcisi, HTML kabuğu, görünümler, editör ve mobil CSS sözleşmelerini çalıştırır. Görsel QA aracı yerel Chrome DevTools Protocol bağlantısı bekler; `scripts/visual-qa.mjs` içinde 320 px, iPhone ve masaüstü yüzeyleri tanımlıdır.

Uygarlık armalarını kaynak projeden yeniden eşitlemek için:

```bash
npm run assets:civs
```

## Varlık lisansları

Uygarlık PNG’leri MIT lisanslı [Siege Engineers AoE2 Tech Tree](https://github.com/SiegeEngineers/aoe2techtree) projesinden yerel olarak vendored edilmiştir; bildirim [`docs/assets/civs/NOTICE.md`](docs/assets/civs/NOTICE.md) içindedir. Alegreya ve Alegreya Sans fontları SIL Open Font License altındadır ve lisans metinleri font klasöründe bulunur. `53` hero görseli ve `random.svg` bu repoya aittir.

## Yayın

GitHub Pages kaynağı `main` dalındaki `/docs` klasörüdür. `main`’e gelen her veri veya uygulama commit’i aynı GitHub Pages iş akışıyla yayınlanır.
