# Oyuncu Detay Modalı İstatistik ve Görsel Polish Tasarımı

## Amaç

Mevcut oyuncu detay modalını veri yoğunluğunu artırmadan daha okunaklı ve daha anlamlı hale getirmek. Çalışma yalnızca türetilmiş oyuncu istatistiklerini ve modalın sunumunu değiştirir. Canlı state, API şeması, maçlar, oyuncular, edit akışı ve `Standings` sıralama davranışı değişmez.

## Veri güvenliği ve kapsam

- Bütün yeni değerler mevcut state'ten tarayıcı belleğinde hesaplanır; state'e yeni alan yazılmaz.
- `PUT /api/state`, local storage, session storage veya migration kullanılmaz.
- Production deploy öncesinde `/api/state` exact JSON yedeği ve SHA-256 özeti alınır. Deploy sonrasında state tekrar indirilir ve byte-level karşılaştırılır.
- Mevcut `Matches` ve `Standings` oyuncu tetikleyicileri, dialog açma/kapatma davranışı, scroll koruması ve focus dönüşü korunur.
- `Standings` satırındaki arma, oyuncunun geçmişte en çok seçtiği uygarlık değeri olmaya devam eder.

## Modal başlığı ve oyuncu arması

Modal başlığındaki arma, oyuncunun son oynadığı veya en yüksek başarı oranına sahip uygarlığı göstermez. `Standings` ile aynı kaynak ve aynı tie-break davranışı kullanılır: oyuncunun tüm geçmişinde en çok seçtiği uygarlık değeri.

`Standings` hesabı `Random` seçimlerini de geçmiş kullanıma dahil ettiği için modal başlığı aynı sonucu birebir kullanır. Eşit kullanım sayısında mevcut deterministik sıralama korunur. Hiç geçmiş uygarlık verisi yoksa mevcut `Random`/fallback arması gösterilir.

Bu değişiklik `Standings` armasının mevcut hesabını veya görünümünü değiştirmemelidir; modal aynı hesap sonucunu yeniden kullanmalıdır.

## En iyi uygarlık istatistikleri

`Best Civ` bölümü, uygarlıkları iki farklı başarı ölçütüyle değerlendirebilir:

1. `Most Wins`: Oyuncunun en fazla galibiyet aldığı uygarlık.
2. `Best Rate`: Kazanma oranı en yüksek olan, `Most Wins` satırından farklı uygarlık.

Her iki ölçüt için yalnızca oyuncunun en az 3 maç oynadığı gerçek uygarlıklar uygundur. `Random` aday değildir. Üç maç eşiği katıdır; daha az oynanan uygarlıklar sonuçlarda gösterilmez.

`Most Wins` sıralaması:

1. Galibiyet sayısı azalan
2. Kazanma oranı azalan
3. Oynanan maç sayısı azalan
4. Uygarlık adı artan

`Best Rate` sıralaması:

1. Kazanma oranı azalan
2. Galibiyet sayısı azalan
3. Oynanan maç sayısı azalan
4. Uygarlık adı artan

`Best Rate` seçilirken `Most Wins` uygarlığı aday listesinden çıkarılır. Böylece aynı uygarlık iki kez gösterilmez. Yalnız bir uygun uygarlık varsa yalnız `Most Wins` satırı görünür. Üç maç şartını karşılayan uygarlık yoksa bölüm `No data` gösterir.

Her sonuç uygarlık arması, İngilizce uygarlık adı, `wins/played` ve yuvarlanmış kazanma yüzdesini içerir. Satırların kategori etiketleri `Most Wins` ve `Best Rate` olur.

## En iyi ikili istatistikleri

`Best Duo` bölümü, takım arkadaşlarını iki farklı başarı ölçütüyle değerlendirir:

1. `Most Wins`: Oyuncunun birlikte en fazla maç kazandığı takım arkadaşı.
2. `Best Rate`: Ortak kazanma oranı en yüksek olan, `Most Wins` satırından farklı takım arkadaşı.

Her iki ölçüt için minimum 3 ortak maç şartı vardır. Bu eşik katıdır; üçten az ortak maçı olan takım arkadaşları sonuçlarda gösterilmez.

`Most Wins` sıralaması:

1. Ortak galibiyet sayısı azalan
2. Ortak kazanma oranı azalan
3. Ortak maç sayısı azalan
4. Oyuncu adı artan

`Best Rate` sıralaması:

1. Ortak kazanma oranı azalan
2. Ortak galibiyet sayısı azalan
3. Ortak maç sayısı azalan
4. Oyuncu adı artan

`Best Rate` seçilirken `Most Wins` oyuncusu aday listesinden çıkarılır. Böylece aynı takım arkadaşı iki kez gösterilmez. Yalnız bir uygun takım arkadaşı varsa yalnız `Most Wins` satırı görünür. Üç ortak maç şartını karşılayan takım arkadaşı yoksa bölüm `No data` gösterir.

Her sonuç takım arkadaşı adı, `wins/played` ve yuvarlanmış ortak kazanma yüzdesini içerir. Satırların kategori etiketleri `Most Wins` ve `Best Rate` olur.

## Galibiyet serisi sunumu

`Win Streak` bölümünde iki ayrı değer bulunur:

- `Current Streak`: En yeni maçtan geriye doğru ilk mağlubiyete kadar olan galibiyet sayısı.
- `Best Streak`: Oyuncunun bütün maç geçmişindeki en uzun galibiyet serisi.

İki değer eşit genişlikte alanlarda gösterilir. Başlıklar küçük, güçlü ve büyük harfli; sayılar modal içindeki ikincil metinlerden belirgin biçimde daha büyük olur. Mevcut seri hesapları değişmez.

## Görsel düzen

Modal mevcut AoE2 parşömen, mürekkep ve bronz çizgi dilini korur; yeni kartlar veya iç içe container'lar eklenmez.

- Modal arka planındaki belirgin desen yalnız bu dialog için azaltılır. Parşömen hissi kalır fakat metinlerin arkasındaki desen yaklaşık yüzde 12–15 görünürlükte, sakin bir yüzey oluşturur.
- Modal mevcut sürümden dikey olarak daha ferah olabilir; hedef içerik yüksekliği yaklaşık 460–500px'tir. Bununla birlikte dialog her zaman safe-area dahil viewport içinde kalır ve gerekirse yalnız içeriği dikey scroll eder.
- Sol bölüm etiketi kolonu yaklaşık 56px olur. Etiketler zorunlu olarak iki satıra bölünür: `LAST / 5`, `WIN / STREAK`, `BEST / CIV`, `BEST / DUO`.
- Sağ içerik alanı, iki uygarlık veya iki takım arkadaşı satırını kırpmadan taşıyacak şekilde kullanılır.
- `wins/played · rate` gibi istatistik metinleri mevcut sürümden daha güçlü olur; mobilde yaklaşık 11–12px ve `700` ağırlık hedeflenir.
- Uygarlık ve oyuncu isimleri istatistiklerden daha baskın kalır. Yeni gölge, gradient, dekoratif kart veya navigasyon eklenmez.

## Mobil davranış ve erişilebilirlik

- 320–430px ekranlarda dialog viewport'un iki yanında en az 12px boşluk bırakır ve yatay taşma üretmez.
- 320×700 gibi kısa mobil viewport'larda başlık ve içerik erişilebilir kalır; gerekiyorsa dialog gövdesi kendi içinde scroll eder.
- Bölüm ve alt kategori etiketleri görsel hiyerarşi dışında anlamı da taşır; sonuçlar yalnız renk veya arma ile açıklanmaz.
- Kapatma düğmesi, backdrop, `Escape`, açan kontrole focus dönüşü ve en az 44px dokunma hedefleri korunur.
- Modal input içermediğinden iOS focus zoom oluşmaz.

## Mimari

- `docs/lib/model.js`: Oyuncunun en çok seçtiği uygarlığı modal verisine ekler; `Most Wins` ve `Best Rate` için birbirini dışlayan uygarlık ve ikili sonuçlarını saf olarak hesaplar.
- `docs/lib/views.js`: Modal başlığına favori uygarlık armasını, iki satırlı bölüm etiketlerini, seri alt başlıklarını ve uygarlık/ikili sonuç satırlarını render eder.
- `docs/styles.css`: Yalnız oyuncu detay dialoguna özel daha sakin parşömen yüzeyi, dar etiket kolonu, güçlü istatistik tipografisi ve daha yüksek responsive düzeni tanımlar.
- `docs/app.js`, state controller ve API katmanı ancak mevcut entegrasyonu korumak için gerekli olması halinde değişir; veri yazma davranışı eklenmez.

## Test ve kabul ölçütleri

- Model testleri modal başlık armasının `Standings` ile aynı en çok kullanılan uygarlık olduğunu doğrular; en son oynanan veya en yüksek oranlı uygarlığın yanlışlıkla kullanılmasını engeller.
- Uygarlık testleri minimum 3 maç şartını, `Random` hariç tutulmasını, `Most Wins` ve `Best Rate` sıralamalarını, tie-break sırasını ve iki sonuçta aynı uygarlığın bulunmamasını doğrular.
- Uygarlık testleri yalnız bir aday, sıfır aday ve 3 maç eşiğinin altındaki kayıtların dışarıda bırakılmasını doğrular.
- İkili testleri minimum 3 ortak maç şartını, yalnız aynı takımdaki oyuncuların sayılmasını, `Most Wins` ve `Best Rate` sıralamalarını, tie-break sırasını ve iki sonuçta aynı oyuncunun bulunmamasını doğrular.
- İkili testleri yalnız bir aday, sıfır aday ve 3 ortak maç eşiğinin altındaki kayıtların dışarıda bırakılmasını doğrular.
- View testleri `Best Civ`, `Most Wins`, `Best Rate`, `Current Streak` ve `Best Streak` etiketlerini; en fazla iki farklı uygarlık ve iki farklı takım arkadaşı render edilmesini doğrular.
- CSS testleri modalın düşük desen yoğunluğunu, yaklaşık 56px etiket kolonunu, zorunlu iki satırlı etiketleri, güçlü istatistik yazısını, mobil kenar boşluğunu ve viewport maksimum yüksekliğini doğrular.
- Tam test paketi geçer. Production QA 320×700, 390×844 ve desktop boyutlarında iki public görünümden modal açılışını, içerik okunabilirliğini, iç scroll davranışını, focus/scroll korunmasını, sıfır document overflow'u, sıfır kırık görseli ve sıfır runtime hatasını doğrular.
- Deploy öncesi ve sonrası production `/api/state` byte içeriği, SHA-256, revision, updatedAt, oyuncu sayısı ve maç sayısı birebir aynı kalır.
