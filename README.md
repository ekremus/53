# Bu Ecof Empires — 53

Haftalık Age of Empires II: Definitive Edition 3v3 ve 4v4 maçları için telefon öncelikli ortak maç defteri.

**Canlı adres:** [https://53aoe.vercel.app](https://53aoe.vercel.app)

Uygulama tek bir yatay haftalık matristir: en yeni maç soldadır, eski haftalar sağa doğru devam eder. Cortinyanlar ve Bakracoğulları için en fazla dört oyuncu, oyuncuların uygarlıkları, maç tarihi ve kazanan takım tutulur. Boş slotlar `-` olarak kalır. Takım skorları ile oyuncu istatistikleri otomatik hesaplanır.

## Görünümler

- `/` — bütün maçları bir kez gösteren ortak matris;
- `/?view=standings` — oyuncu sıralaması, galibiyet, mağlubiyet ve kazanma oranı;
- kalem düğmesi — `1453` ortak şifresi doğrulandıktan sonra açık görünümü yerinde düzenler; maçlarda yalnız maç alanları, sıralamada yalnız oyuncular değişir.

Eski `/edit/` ve `/stats/` bağlantıları aynı tek sayfalı uygulamadaki ilgili görünüme yönlenir.

Oyuncu bir kez eklenir ve sonraki maçlarda listeden seçilir. Takım içindeki gerçek oyuncular Türkçe ada göre sıralanır, boş slotlar sonda kalır. Oyuncu seçildiğinde en son oynadığı uygarlık otomatik gelir; sıralamada kayıtlı bütün oyuncular, en sık oynadıkları uygarlığın arması ve tekrarsız sıra numarasıyla görünür. Hiç kullanılmamış oyuncu silinir; geçmiş maçta kullanılan oyuncu ise kayıtları bozmamak için pasif yapılır.

## Mimari

HTML, CSS ve tarayıcı ES modülleri `docs/` klasöründedir. `api/state.js`, aynı Vercel projesindeki private Blob deposunda bulunan sabit `state.json` dosyasını okur ve yazar. Tarayıcı Blob anahtarını görmez. Paylaşımlı editör basit, bilinçli bir son-yazan-kazanır modeli kullanır; eski revizyon uyarısı yoktur.

GitHub yalnızca kaynak kod ve geri dönüş geçmişidir. Çalışma zamanında GitHub tokenı, kullanıcı hesabı, Cloudflare ya da harici veritabanı yoktur. Görüntüleme herkese açıktır; düzenleme arayüzü ve `PUT /api/state` çağrısı yalnızca sunucudaki `EDIT_PASSWORD` ortam değişkeniyle doğrulanan ortak şifreyle açılır. Şifre kaynak koda veya tarayıcı depolamasına yazılmaz.

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

Uygarlık PNG’leri MIT lisanslı [Siege Engineers AoE2 Tech Tree](https://github.com/SiegeEngineers/aoe2techtree) projesinden yerel olarak vendored edilmiştir; bildirim `docs/assets/civs/NOTICE.md` içindedir. Merriweather fontu SIL Open Font License altındadır. Tabler tabanlı arayüz ikonlarının bildirimi `docs/assets/icons/NOTICE.md` içindedir; `random.svg` bu repoya aittir.
