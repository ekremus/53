# Mobil Oyuncu İstatistik Detayı Tasarımı

## Amaç

Mevcut maç ve sıralama yüzeylerini kalabalıklaştırmadan oyuncular hakkında daha anlamlı istatistikler göstermek. Public `Matches` ekranındaki dolu oyuncu hücresine veya `Standings` ekranındaki oyuncu kimliğine dokunmak, aynı mobil öncelikli detay modalını açar. Özellik yalnızca mevcut maçlardan türetilen verileri okur; canlı state, API şeması, edit akışı ve kayıt sırası değişmez.

## Kapsam ve veri güvenliği

- Modal yalnızca public `Matches` ve public `Standings` görünümünde açılır. Edit modundaki oyuncu ve uygarlık seçimleri mevcut davranışını korur.
- Hesaplanan detaylar tarayıcı belleğinde oluşturulur. `PUT /api/state`, local storage, session storage veya URL parametresi kullanılmaz.
- Oyuncu, maç, takım ve uygarlık kayıtlarına alan eklenmez. Pasif fakat geçmiş maçlarda bulunan oyuncular da detay modalından açılabilir.
- Deploy öncesinde production state'in exact JSON yedeği ve SHA-256 özeti alınır. Deploy sonrasında aynı state tekrar indirilip byte-level karşılaştırılır.

## İngilizce arayüz etiketleri

Bu çalışmayla public navigasyon ve sıralama tablosunun veri etiketleri İngilizce olur:

- `Maçlar` → `Matches`
- `Sıralama` → `Standings`
- `Oyuncu` → `Player`
- `O / G / M / %` → `P / W / L / %`

Sıralama başlıklarının erişilebilir adları da `Played`, `Wins`, `Losses` ve `Win rate` olur. Takım ve oyuncu özel adları çevrilmez. Edit modunun kayıt, silme, şifre ve hata metinleri bu özelliğin kapsamında değildir.

## Açılış davranışı

Public maç hücresindeki uygarlık arması, oyuncu adı ve uygarlık adı tek bir gerçek `button` içinde kalır. `Standings` tablosundaki oyuncu arması ve adı da aynı biçimde bir `button` olur. Her iki kontrol en az 44px dokunma yüksekliğine, oyuncunun adını içeren bir erişilebilir etikete ve `data-player-details` oyuncu kimliğine sahiptir.

Kontrole dokunmak `playerId` için detayları hesaplar, modal içeriğini render eder ve native `dialog.showModal()` ile açar. Edit modunda bu kontroller render edilmez. Modal kapatıldığında:

- `Standings` sıralama ölçütü ve yönü korunur.
- `Matches` yatay scroll pozisyonu korunur.
- Açan kontrol yeniden focus alır.

Modal sağ üst kapatma düğmesi, backdrop dokunuşu ve `Escape` ile kapanır. Modal açıkken sayfa arkası native dialog davranışıyla etkileşime kapalıdır.

## İstatistik hesapları

Yeni `calculatePlayerDetails(state, playerId)` saf fonksiyonu doğrulanmış state'i ve kayıtlı bir oyuncu kimliğini alır. Maçlar tarih azalan, aynı tarihte array index azalan biçimde sıralanır; bu mevcut maç matrisindeki yeni-eski sırasıyla aynıdır.

### Son beş maç

Oyuncunun bulunduğu en yeni beş maç `W` veya `L` dizisi olarak döner. Oyuncunun takımı kazandıysa `W`, kaybettiyse `L` kullanılır. Beşten az maçı olan oyuncuda yalnızca mevcut sonuçlar, hiç maçı olmayanda `—` gösterilir.

### Galibiyet serileri

`currentWinStreak`, en yeni maçtan başlayarak ilk mağlubiyete kadar olan ardışık galibiyet sayısıdır. En yeni sonuç mağlubiyetse değer `0` olur. `longestWinStreak`, oyuncunun tüm kronolojik geçmişindeki en uzun ardışık galibiyet dizisidir. Modal bunları aynı `Win Streak` bölümünde `Current` ve `Best` değerleriyle gösterir.

### En iyi uygarlık

Oyuncunun her dolu maç slotu uygarlık adına göre maç ve galibiyet toplamına eklenir. `Random`, gerçek oynanan uygarlığı belirtmediği için aday sıralamasına girmez.

Önce en az 3 kez oynanmış uygarlıklar değerlendirilir. Adaylar sırasıyla kazanma oranı azalan, galibiyet azalan, maç sayısı azalan ve uygarlık adı artan olarak sıralanır. Üç maç eşiğini geçen aday yoksa aynı sıralama tüm gerçek uygarlıklara uygulanır ve sonuç `Small sample` olarak işaretlenir. Hiç gerçek uygarlık verisi yoksa bölüm `No data` gösterir. Görselde uygarlık arması, İngilizce uygarlık adı, `wins/played` ve yuvarlanmış yüzde birlikte yer alır.

### En iyi ikili

Oyuncunun her maçındaki takım arkadaşları için ortak maç ve ortak galibiyet sayıları hesaplanır. Önce en az 5 ortak maç oynanmış ikililer değerlendirilir. Adaylar kazanma oranı azalan, galibiyet azalan, ortak maç azalan ve Türkçe oyuncu adı artan olarak sıralanır. Beş maç eşiğini geçen ikili yoksa aynı sıralama mevcut ikililere uygulanır ve `Small sample` işareti gösterilir. Hiç takım arkadaşı kaydı yoksa bölüm `No data` gösterir.

## Modal düzeni ve mobil davranış

Modal mevcut AoE2 tasarım sistemindeki parşömen, koyu mürekkep, bronz kural çizgileri ve uygarlık armalarını kullanır; yeni bir görsel dil oluşturmaz. İçerik sırası şöyledir:

1. Uygarlık armasıyla oyuncu adı ve kapatma düğmesi
2. `Last 5` sonuç işaretleri
3. `Win Streak` için `Current` ve `Best`
4. `Best Civilization`
5. `Best Duo`

320–430px ekranlarda modal viewport'un iki yanında en az 12px boşluk bırakır, genişliği `calc(100vw - 24px)` değerini aşmaz ve içerik kadar yüksek kalır. Maksimum yüksekliği safe-area dahil viewport içinde tutulur; içerik bu sınırı aşarsa yalnız modal gövdesi dikey kayar. Input içermediği için iOS focus zoom üretmez. Sonuç işaretleri dekoratif büyük kartlara dönüşmez; tek satırlık kompakt `W`/`L` mühürleri olur. Modal kalıcı bottom navigation, footer veya yeni sayfa başlığı eklemez.

## Mimari

- `docs/lib/model.js`: `calculatePlayerDetails(state, playerId)` fonksiyonunu ve dosya içinde private kalan küçük saf istatistik sıralama yardımcılarını sağlar.
- `docs/lib/views.js`: İngilizce navigasyon/sıralama etiketlerini ve `renderPlayerDetails(details)` modal içeriğini üretir.
- `docs/lib/matrix.js`: public dolu oyuncu hücrelerini erişilebilir detay butonlarına dönüştürür; edit hücrelerine dokunmaz.
- `docs/index.html`: yalnızca tekrar kullanılabilir `player-details-dialog` kabuğunu ekler.
- `docs/app.js`: iki görünümden aynı `data-player-details` olayını yakalar, içeriği render eder, açan kontrolü saklar ve kapanışta focus'u geri verir. Bu olay state controller'ı mutate etmez.
- `docs/styles.css`: mevcut tokenlarla modalın ve oyuncu detay butonlarının responsive stillerini tanımlar.

## Hata ve boş durumları

- Kayıtlı olmayan `playerId`, model katmanında açık bir hata üretir; uygulama mevcut notice sistemiyle hatayı gösterir ve modalı açmaz.
- Sıfır maçlı oyuncu modalında `Last 5` değeri `—`, seri değerleri `0`, uygarlık ve ikili alanları `No data` olur.
- Eksik uygarlık görseli mevcut local asset davranışını izler; ağdan üçüncü taraf görsel çekilmez.
- Modal açılırken veya kapanırken hiçbir state kaydı, sıralama tercihi veya scroll konumu sıfırlanmaz.

## Test ve kabul ölçütleri

- Model testleri son beş maç sırasını, güncel/rekor seriyi, aynı tarih sırasını ve sıfır maç durumunu doğrular.
- Uygarlık testleri 3 maç eşiğini, oran/galibiyet/maç/ad tie-break sırasını, `Random` hariç tutmayı ve küçük örnek fallback'ini doğrular.
- İkili testleri yalnız aynı takım arkadaşlarını saymayı, 5 maç eşiğini, tie-break sırasını ve küçük örnek fallback'ini doğrular.
- View testleri `Matches`, `Standings`, `Player`, `P/W/L/%` metinlerini ve İngilizce erişilebilir sıralama etiketlerini doğrular.
- Matrix ve standings testleri dolu public oyuncuların `data-player-details` butonu olduğunu, boş slotların ve edit hücrelerinin olmadığını doğrular.
- Uygulama testi her iki görünümden modalın doğru oyuncuyla açıldığını, kapatma/backdrop/`Escape` davranışını ve focus dönüşünü doğrular.
- CSS testi 44px dokunma hedefini, 12px mobil kenar boşluğunu, viewport maksimum yüksekliğini ve yatay taşma olmamasını doğrular.
- Tam test paketi geçer. Production QA; 320×700, 390×844 ve geniş ekranlarda iki görünümden modal açılışını, görünür bütün içeriği, scroll/focus korunmasını, sıfır kırık görseli, sıfır runtime hatasını ve sıfır document overflow'u doğrular.
- Deploy öncesi ve sonrası `/api/state` byte içeriği, SHA-256, revision, updatedAt, oyuncu ve maç sayıları birebir aynı kalır.
