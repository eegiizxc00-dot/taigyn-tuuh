# Тайгын Түүх — Cloudflare Pages + D1 + QPay starter

## Сайтын удирдлагын самбар
- `admin.html` — `/admin.html` хаягаар орж өгүүллэг нэмэх, засах, нийтлэх/нуух, устгах боломжтой.
- `functions/api/admin/stories/*` — админ API; зөвхөн `ADMIN_EMAIL`-тэй таарсан, нэвтэрсэн имэйлд зөвшөөрөл өгнө.
- `index.html` — D1 дээрх нийтлэгдсэн зохиолуудыг API-аас татаж нүүр хуудсанд харуулна.
- `functions/api/payments/status.js` — QPay төлбөрийг сервер талаас шалгаж, баталгаажсан үед тухайн өгүүллэгийг нээнэ.

## Cloudflare дээр заавал хийх тохиргоо
1. **Workers & Pages → D1 SQL Database** дээр өгөгдлийн сан үүсгэнэ.
2. D1 Console дээр `migrations/0001_schema.sql` файлын SQL-ийг бүтнээр нь ажиллуулна. Хэрэв аль хэдийн ажиллуулсан бол дахин ажиллуулах шаардлагагүй.
3. Pages project → **Settings → Bindings → Add → D1 database** дээр binding name-ийг яг `DB` болгоод үүсгэсэн database-аа сонгоно. Дараа нь redeploy хийнэ.
4. Pages project → **Settings → Variables and Secrets** дээр:
   - `ADMIN_EMAIL` — админ самбарт ашиглах имэйл. Бүртгэлдээ энэ имэйлийг ашиглана.
   - `SESSION_SECRET` — урт, санамсаргүй нууц түлхүүр (32+ тэмдэгт).
   - `PUBLIC_BASE_URL` — Cloudflare Pages сайтын бүтэн HTTPS URL.
   - QPay ашиглах үед: `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET` (Secret), `QPAY_INVOICE_CODE`, `QPAY_BASE_URL`.
5. `ADMIN_EMAIL` болон `SESSION_SECRET` тохируулсны дараа redeploy хийнэ.
6. Сайтын `https://ТАНЫ-ХАЯГ.pages.dev/admin.html` хаягаар орж `ADMIN_EMAIL`-тэй ижил имэйлээр бүртгэл үүсгээд нэвтэрнэ. `Админ бүртгэл үүсгэх` товчийг эхний удаа ашиглана. Бүртгэл аль хэдийн үүссэн бол `Нэвтрэх` товчийг ашиглана.
7. Нийтлэл нэмэхдээ нэр, slug (латин жижиг үсэг/тоо/зураас), үнэгүй эхлэл, төлбөртэй үргэлжлэлийг бөглөж хадгална. Нийтлэх сонголт идэвхтэй бол нүүр хуудсанд гарна.

## GitHub руу оруулах
ZIP-ийг задлаад `taigyn-platform` хавтасны **доторх бүх файл, хавтсыг** GitHub repository-ийн үндсэн түвшинд байрлуулна. `index.html`-ийг шинэ хувилбараар солино; шинэ `admin.html`, `functions/api/admin/stories/` болон `functions/api/payments/status.js` файлуудыг нэмнэ. GitHub дээр Commit хийсний дараа Cloudflare автоматаар deploy хийнэ.

## Төлбөрийн чухал анхааруулга
- QPay мерчантын жинхэнэ эрх, тохиргоо хэрэгтэй. Эхлээд sandbox орчинд туршина.
- `QPAY_CLIENT_SECRET` болон `SESSION_SECRET`-ийг GitHub кодод огт бичиж болохгүй; Cloudflare Secrets-д хадгална.
- Бодит мөнгө авахаас өмнө QPay invoice → төлбөр шалгалт → нэг өгүүллэгийн unlock урсгалыг өөрийн тест хэрэглэгчээр шалгаж, буцаалт/нууцлал/үйлчилгээний нөхцөлийг бэлдэнэ.
- Энэ бол эхлэлийн төсөл бөгөөд аюулгүй байдлын бүрэн аудит хийгдээгүй. Production launch-аас өмнө туршилт, rate limiting, нууц үг сэргээх, имэйл баталгаажуулалт зэрэг хамгаалалтыг нэмэх шаардлагатай.
