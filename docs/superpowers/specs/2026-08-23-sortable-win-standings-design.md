# Galibiyet Odaklı Sıralama Tasarımı

## Amaç

Sıralamayı varsayılan olarak galibiyet sayısına göre göstermek ve `O`, `G`, `M`, `%` sütun başlıklarını mobilde rahatça dokunulabilen sıralama kontrollerine dönüştürmek. Çalışan maç/oyuncu verisi, API, edit akışı ve sayfanın geri kalan görsel sistemi değişmeyecek.

## Güvenlik ve kapsam

- Canlı revision 39 verisinin tam JSON yedeği `.qa/production-state-before-standings-sort-2026-08-23.json` içinde tutulur.
- Çalışan kod GitHub etiketi `backup/pre-standings-sort-20260823` ile geri alınabilir durumda kalır.
- Bu özellik yalnızca türetilmiş istatistikleri ve tarayıcıdaki geçici sıralama durumunu değiştirir; `PUT /api/state` çağrısı yapmaz.
- Şema, oyuncular, maçlar, medeniyetler, edit modu ve maç tablosu değişmez.

## Sıralama davranışı

Sıralama ekranı ilk açıldığında `G` sütunu seçili ve azalan sıradadır. Bu nedenle en çok galibiyeti olan oyuncu `#1` görünür. Eşit galibiyetlerde daha az mağlubiyet, ardından Türkçe oyuncu adı kullanılır.

`O`, `G`, `M` ve `%` başlıklarının tamamı gerçek `button` kontrolleridir. Başka bir başlığa ilk dokunuş o değeri büyükten küçüğe sıralar. Seçili başlığa tekrar dokunmak yönü küçükten büyüğe çevirir; sonraki dokunuş tekrar büyükten küçüğe döner. Her sıralamada görünen satırlara benzersiz ve ardışık `#1…#N` numarası yeniden atanır.

Diğer ölçütlerde eşitlikler galibiyet sayısı azalan, mağlubiyet sayısı artan ve Türkçe oyuncu adı sırasıyla çözülür. Sıralama tercihi yalnızca açık sayfanın belleğinde tutulur; URL’ye, local storage’a veya canlı veriye yazılmaz.

## Görsel ve erişilebilirlik

- `O`, `G`, `M`, `%` etiketleri mevcut 12px metinden daha güçlü 14px ağırlıklı başlıklara çıkar.
- Her başlık tüm 44px tablo başlık yüksekliğini ve kendi sütun genişliğini kullanan dokunma alanına sahip olur.
- Seçili başlığın altında altın renkli net bir çizgi görünür. Küçük yön işareti `↓` veya `↑` sıralama yönini belirtir.
- `aria-sort` seçili sütunda `ascending` veya `descending`, diğerlerinde `none` olur. Butonların erişilebilir etiketleri ölçütü ve bir sonraki dokunuşun yapacağı işlemi açıklar.
- Sayısal sütunlar 44px olur; rank sütunu daraltılarak 390px ve 320px düzeninde tablo genişliği korunur. Oyuncu sütunu kalan alanı kullanmaya devam eder.

## Mimari

`docs/lib/model.js` saf ve yeniden kullanılabilir bir `sortPlayerStatistics(players, key, direction)` fonksiyonu sağlar. `calculateStatistics` varsayılan `wins/desc` sırasını bununla üretir. `docs/lib/views.js`, seçilen ölçüt ve yönü alarak sıralı oyuncuları ve etkileşimli başlıkları render eder. `docs/app.js` yalnızca `{ key: "wins", direction: "desc" }` biçimindeki geçici UI durumunu tutar ve başlık dokunuşlarında değiştirir.

## Test ve kabul ölçütleri

- Model testi, yüksek win-rate fakat az galibiyetli oyuncunun çok galibiyetli oyuncunun üstüne çıkmadığını kanıtlar.
- Her ölçüt için azalan/artma sırası, eşitlik çözümü ve ardışık rank numaraları test edilir.
- View testi dört sıralama butonunu, varsayılan seçili `G` durumunu, alt çizgi sınıfını ve `aria-sort` değerlerini doğrular.
- Uygulama testi başlık dokunuşunun ölçütü değiştirdiğini ve aynı başlıktaki ikinci dokunuşun yönü çevirdiğini doğrular.
- CSS testi 14px başlık, 44px yükseklik, seçili alt çizgi ve 44px sayısal sütun sözleşmesini doğrular.
- Tam test paketi geçer. Production 390×844 QA’da 15 satır, `#1…#15`, varsayılan `G ↓`, dokunma sonrası değişen sıralama, sıfır kırık görsel, sıfır runtime hatası ve sıfır yatay document overflow görülür.
- Deploy öncesi ve sonrası `/api/state` içeriğinin SHA-256 değeri ve revision/updatedAt/oyuncu/maç sayıları aynı kalır.
