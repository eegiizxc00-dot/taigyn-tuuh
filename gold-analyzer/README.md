# XAU/USD Gold Scalping Analyzer — v0.1

Cloudflare Pages + vanilla JavaScript. Энэ бол арилжааны **туршилтын анализын хэрэгсэл**, арилжаа гүйцэтгэгч бот биш.

## Нээх

Хэрэв одоогийн Cloudflare Pages төсөл main салбараас автоматаар deploy хийдэг бол:

https://taigyn-tuuh.pages.dev/gold-analyzer/

Шинээр GitHub repo үүсгээгүй — `taigyn-tuuh` репод `gold-analyzer/` тусдаа веб апп, `functions/api/gold/candles.js` API нэмсэн.

## Одоогоор ажиллах зүйл

- Mobile-responsive dashboard, M1/M5 candle canvas chart, UTC time axis
- DEMO: тодорхой тэмдэглэгдсэн зохиомол candle генератор; оролтын үнэ бодит ханш биш
- OANDA: server-side read-only M1/M5 candle API (complete candles only), тайлбар бүхий алдааны мэдээлэл
- M5 EMA50/200 тренд, M1 EMA20/50, RSI14, ATR14, previous-13 candle breakout, basic liquidity-sweep heuristic, candle body filter
- Weight-based 0–100 setup grade; 85+ ба заавал нөхцлүүд зэрэг биелсэн тохиолдолд BUY/SELL; бусад үед WAIT
- Entry = last completed M1 close; stop distance >= 1.5 × ATR14; TP = 1.8R (spread/slippage-г тооцоогүй)
- Дансны эрсдэлийн хувь тооцоолол, 60 секунд тутам live refresh (tab visible)
- Арилжаа хийх, брокер руу order илгээх, мөнгө шилжүүлэх функц огт байхгүй

**Анхаарах:** setup score нь win rate биш. Зохиомол demo горим дээр гарсан үзүүлэлтүүдийг бодит арилжааны үр дүн гэж үзэж болохгүй. Backtest болон forward-test хийгдээгүй.

## OANDA live/practice feed идэвхжүүлэх

1. Cloudflare Dashboard → Workers & Pages → `taigyn-tuuh` → Settings → Variables and Secrets
2. `OANDA_API_TOKEN` нэртэй **Secret** нэмж OANDA v20 API токеноо оруул.
3. `OANDA_ENV=practice` environment variable нэм. (Токен practice бол `practice`, live бол `live`.)
4. Production binding-д тохируулж, шинэ deploy хийх шаардлагатай бол deploy хий.
5. Analyzer дээр **OANDA ханш** сонго.

API токеныг JS/HTML/GitHub-д бүү бич. XAU_USD бүтээгдэхүүн OANDA данс/бүс нутгаас хамаарч боломжгүй байж болно; OANDA лиценз/нөхцөлийг шалгана уу. Токен үгүй бол live endpoint HTTP 503 өгнө, зохиомол өгөгдөл рүү чимээгүй шилжихгүй.

Албан ёсны API: https://developer.oanda.com/rest-live-v20/instrument-df/
Cloudflare Secrets: https://developers.cloudflare.com/pages/functions/bindings/

## Файлууд

- `gold-analyzer/index.html` — UI/CSS
- `gold-analyzer/app.js` — анализ, демо дата, canvas chart
- `functions/api/gold/candles.js` — OANDA read-only API, токеныг нууцалсан

## Дараагийн хувилбар

- 1–2 жилийн бодит candle data дээр in-sample / out-of-sample backtest
- Commission/spread/slippage, news filter, multi-session filters, losing streak, max drawdown
- Signal history, Telegram alert, rate limiting, automated unit and integration tests
- Тусдаа GitHub репо болон тусдаа Cloudflare Pages төсөлд салгах
