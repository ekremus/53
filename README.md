# Bu Ecof Empires — 53

Haftalık Age of Empires II: Definitive Edition 4v4 maçları için telefon öncelikli ortak maç defteri.

**Canlı adres:** [https://53aoe.vercel.app](https://53aoe.vercel.app)

Uygulama tek bir yatay haftalık matristir: en yeni maç soldadır, eski haftalar sağa doğru devam eder. Cortinyanlar ve Bakracoğulları için dört oyuncu, oyuncuların uygarlıkları, maç tarihi ve kazanan takım tutulur. Takım skorları ile oyuncu istatistikleri otomatik hesaplanır.

## Ekranlar

- `/` — bütün maçları bir kez gösteren ortak defter;
- `/edit/` — şifresiz, tokensız ve herkese açık düzenleme;
- `/stats/` — oyuncu sıralaması, galibiyet, mağlubiyet ve kazanma oranı.

Oyuncu bir kez eklenir ve sonraki maçlarda listeden seçilir. Hiç kullanılmamış oyuncu silinir; geçmiş maçta kullanılan oyuncu ise kayıtları bozmamak için pasif yapılır.

## Mimari

HTML, CSS ve tarayıcı ES modülleri `docs/` klasöründedir. `api/state.js`, aynı Vercel projesindeki private Blob deposunda bulunan sabit `state.json` dosyasını okur ve yazar. Tarayıcı Blob anahtarını görmez. Yazma işlemleri ETag ve `If-Match` ile çakışma kontrolü yapar; başka biri önce yayınladıysa eski veri sessizce ezilmez.

GitHub yalnızca kaynak kod ve geri dönüş geçmişidir. Çalışma zamanında GitHub tokenı, PIN, kullanıcı hesabı, Cloudflare ya da harici veritabanı yoktur. Açık editör bilinçli bir ürün kararıdır: linki bilen herkes ortak veriyi değiştirebilir.

`docs/data/state.json`, ilk seed ve acil geri yükleme kopyasıdır. Canlı veri Vercel Blob’dadır.

## Yerel geliştirme

Node.js 22 veya üzeri ve Vercel CLI gerekir.

```bash
npm ci
vercel link --project 53aoe
vercel env pull .env.local
npm run dev:vercel
```

Uygulama `http://127.0.0.1:4173/` üzerinde açılır. Testler:

```bash
npm test
```

Blob boşsa mevcut iki maç ve on oyuncuyu seed etmek için:

```bash
npm run data:seed
```

Seed komutu canlı revizyon yerel dosyadan yeniyse üzerine yazmayı reddeder. Bilinçli geri yükleme için önce canlı veriyi yedekle, `docs/data/state.json` revizyonunu güncelle ve seed komutunu tekrar çalıştır.

## Yayın

```bash
vercel deploy
vercel deploy --prod
```

Vercel Hobby planı bu küçük uygulama için yeterlidir. Tek private Blob dosyası ve bir Node Function kullanılır; proje hiçbir ücretli servis gerektirmez.

## Varlık lisansları

Uygarlık PNG’leri MIT lisanslı [Siege Engineers AoE2 Tech Tree](https://github.com/SiegeEngineers/aoe2techtree) projesinden yerel olarak vendored edilmiştir; bildirim `docs/assets/civs/NOTICE.md` içindedir. Alegreya ve Alegreya Sans fontları SIL Open Font License altındadır. `53` görselleri ve `random.svg` bu repoya aittir.
