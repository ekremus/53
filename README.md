# 53

Haftalık Age of Empires II 4v4 maçları için ortak skor defteri.

## Kaydedilen veri

Her maç tek bir JSON kaydıdır:

```json
{
  "id": "stable-id",
  "date": "2026-07-25",
  "redTeam": ["Oyuncu 1", "Oyuncu 2", "Oyuncu 3", "Oyuncu 4"],
  "blueTeam": ["Oyuncu 5", "Oyuncu 6", "Oyuncu 7", "Oyuncu 8"],
  "winner": "red"
}
```

Takım skorları ve oyuncu istatistikleri bu maçlardan otomatik hesaplanır. Kaydedilen JSON, D1 içindeki tek revizyonlu uygulama durumunda tutulur. Böylece tüm ziyaretçiler aynı sonucu görür ve aynı anda yapılan düzenlemeler sessizce birbirinin üstüne yazılmaz.

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Yerel düzenleme parolası varsayılan olarak `53` değeridir. Üretimde `EDIT_PASSWORD` ortam değişkeni kullanılır.

## Doğrulama

```bash
npm test
```
