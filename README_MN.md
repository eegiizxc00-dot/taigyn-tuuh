# Тайгын Түүх — төлбөртэй үргэлжлэл (starter)

## Төлбөрийн дүрэм
- Нэг зохиолын эхлэл үнэгүй (`preview_text`).
- Үлдсэн хэсгийг нэг удаа 1,500₮ төлөөд тухайн хэрэглэгчид бүрмөсөн нээнэ.
- Нээлтийн эрх `unlocks` хүснэгтэд `(user_id, story_id)` хосоор хадгалагдана.
- Үлдсэн текстийг browser-д анхнаасаа илгээхгүй. Зөвхөн сервер эрхийг шалгасны дараа буцаана.

## Багцын бүтэц
- `index.html` — одоогийн статик загвар (API-тэй холбох ажил шаардлагатай)
- `functions/api/auth/*` — имэйл/нууц үгийн бүртгэл, нэвтрэлт, гаралт, session
- `functions/api/stories/*` — нийтэд нээлттэй жагсаалт ба эрх шалгасан зохиол унших API
- `functions/api/payments/*` — QPay нэхэмжлэх болон callback баталгаажуулалт
- `migrations/0001_schema.sql` — Cloudflare D1 өгөгдлийн сангийн схем

## Байршуулахын өмнөх шаардлагатай алхмууд
1. Cloudflare Dashboard → Workers & Pages → D1 SQL Database үүсгэнэ.
2. D1 дээр `migrations/0001_schema.sql` ажиллуулна.
3. Pages Functions ашиглахын тулд энэ төслийг GitHub repo-той холбож deploy хийнэ. **Direct Upload нь Functions-ийг дэмждэггүй.**
4. Pages Settings → Bindings дээр D1 binding нэрийг `DB` гэж тохируулж redeploy хийнэ.
5. Settings → Variables and Secrets дээр дараах secrets тохируулна:
   - `SESSION_SECRET`: дор хаяж 32 санамсаргүй тэмдэгтийн нууц түлхүүр
   - `QPAY_CLIENT_ID`
   - `QPAY_CLIENT_SECRET` (Secret)
   - `QPAY_INVOICE_CODE`
   - `PUBLIC_BASE_URL`: жишээ нь `https://taigyntuuh.pages.dev`
   - `QPAY_BASE_URL`: sandbox туршилтад `https://merchant-sandbox.qpay.mn`, production-д `https://merchant.qpay.mn`
6. QPay мерчантын эрх авч sandbox дээр invoice → callback → payment/check урсгалыг туршина. Дараа нь production credentials тавина.
7. Нэг тест хэрэглэгч, нэг туршилтын зохиол оруулж туршина. Доорх SQL жишээг ашиглаж болно.

## Туршилтын зохиол оруулах SQL
`YOUR_STORY_ID`-г өөрийн UUID болгон солино.
```sql
INSERT INTO stories(id,slug,title,author_name,synopsis,preview_text,continuation_text,price_mnt,published)
VALUES('YOUR_STORY_ID','taigyn-nuuts','Тайгын нууц','Тайгын Түүх','Нууцлаг роман',
'Энэ бол үнэгүй унших эхлэл. Эндээс сонирхолтой хэсэг хүртэлх текстээ оруулна.',
'ЭНД ТӨЛБӨРТЭЙ ҮРГЭЛЖЛЭЛИЙН БҮХ ТЕКСТ БАЙРЛАНА.',1500,1);
```

## API
- `POST /api/auth/register` `{ "email":"...", "password":"10+ тэмдэгт" }`
- `POST /api/auth/login` `{ "email":"...", "password":"..." }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/stories`
- `GET /api/stories/taigyn-nuuts`
- `POST /api/payments/create` `{ "slug":"taigyn-nuuts" }`
- `POST /api/payments/callback` — QPay callback URL

## Аюулгүй байдал / production checklist
- QPay credentials-ийг HTML, GitHub, клиент кодод хэзээ ч бүү байрлуул; зөвхөн Cloudflare Secrets.
- QPay callback ирсэн гэдгээр нь шууд нээхгүй: сервер `/v2/payment/check` дуудаж, төлсөн дүнг шалгана.
- HTTPS, Cloudflare rate limiting/WAF, abuse monitoring нэмнэ.
- Нууц үг сэргээх имэйл, имэйл баталгаажуулалт, CSRF хамгаалалт, админы эрхийн удирдлага, контент удирдах самбар, нууц үг солих урсгал, нууцлал/үйлчилгээний нөхцөл, зохиогчийн эрхийн зөвшөөрөл, буцаалтын бодлогыг launch-аас өмнө нэмнэ.
- Session нь HttpOnly + SameSite=Lax cookie; production-д Secure cookie хэрэглэнэ. Сайт HTTPS дээр ажиллуулах ёстой.
- Энэ нь эхлэлийн scaffold; бүрэн production-ready гэж үзэж болохгүй. Нэвтрэлт ба төлбөрийн аюулгүй байдлын туршилт хийсний дараа бодит хэрэглэгчид нээнэ.
