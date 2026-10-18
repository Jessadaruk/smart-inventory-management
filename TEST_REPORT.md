# รายงานผลทดสอบจริง

> รายงานนี้เก็บผลการพัฒนารอบแรก (10 ชุด) สำหรับ mapping ข้อกำหนด 25 ข้อ ผล regression **ล่าสุดหลัง Final Audit เป็น 11 ชุด** อยู่ใน [FINAL_AUDIT.md](FINAL_AUDIT.md) และ `docs/final-audit/` ปัจจุบัน `npm test` ใช้ฐานข้อมูลทดสอบแยกตาม README แล้ว

ทดสอบวันที่ **18 ตุลาคม 2569 (Asia/Bangkok)** บน Windows PowerShell, Node.js 24.18.0, npm 11.16.0, Next.js 15.5.28, Prisma 6.19.3 และ Chromium ของ Playwright 1.64.1

## ผลสุดท้าย

**Playwright 10 ชุดทดสอบผ่านทั้งหมด (10 passed, 18.8s)** เป็นการเรียก HTTP จริงและเปิด Chromium จริง ใช้ production server จาก `npm start` ไม่ใช่ mock API หลักฐาน console อยู่ `docs/test-run.txt` และผล JSON อยู่ `docs/test-results.json`

| คำสั่งที่รันจริง | ผล |
|---|---|
| node --version / npm --version | v24.18.0 / 11.16.0 |
| npm install ตามรายการใน package.json | สำเร็จ มี lockfile |
| npx prisma generate | สำเร็จ Prisma Client v6.19.3 |
| npx prisma migrate dev --name init | สำเร็จหลังสร้างไฟล์ SQLite เปล่า (ดูปัญหาที่แก้ด้านล่าง) |
| npm run db:migrate | สำเร็จ 2 migrations รวม integrity guards |
| npx prisma migrate status | Database schema is up to date |
| npm run db:seed | สำเร็จ 2 ผู้ใช้ 5 หมวดหมู่ 20 สินค้า 20 opening movements |
| npm run typecheck | ผ่าน ไม่มี TypeScript error |
| npm run lint | ผ่าน ไม่มี error หรือ warning ใน source ที่ตรวจ |
| npm run build | ผ่าน optimized production build และสร้างทุกหน้าที่กำหนด |
| npx playwright install chromium | สำเร็จ ติดตั้ง Chromium/headless shell |
| npm test | 10 passed (18.8s) |
| cmd.exe /d /c "call .\start.bat" | เริ่ม Next.js สำเร็จ Ready in 520ms; GET /login ได้ 200 |
| npm start ระหว่างพอร์ต 3000 มีโปรแกรมใช้งาน | ออกจากโปรแกรมด้วย code 1 และข้อความอธิบายพอร์ตชนถูกต้อง |
| node work/verify-fresh.cjs (เครื่องมือชั่วคราวใน workspace) | ฐานข้อมูลใหม่ apply migrations แล้ว seed สองครั้ง ยังมี 2/5/20/20 ไม่ซ้ำ ดู docs/fresh-database.txt |
| npm audit | ยังพบ 8 high ใน dependency chains ของ braces และ deepmerge-ts ไม่มี critical |
| npm audit --omit=dev | ยังพบ 3 high ใน Prisma/config/deepmerge-ts chain ไม่ใช่ผล 0 vulnerabilities |

`npm audit fix` รันแล้วแต่ยังเหลือคำแนะนำเปลี่ยน major จึงไม่ใช้ `--force` ข้าม major โดยไม่ได้ทดสอบ stack ใหม่ เพิ่ม override PostCSS 8.5.30 แล้วรายการ Next/PostCSS ที่เคยแจ้งเตือนหายไป รายละเอียดจริงอยู่ `docs/audit-all.json` และ `docs/audit-production.json` Prisma CLI chain ปรากฏแม้ omit dev เนื่องจาก dependency graph ของ Prisma Client จึงไม่อ้างว่าชุด production ไม่มีคำเตือน

## Mapping ข้อกำหนด 25 ข้อ

ตัวเลข 01–10 คือ prefix ของ test ใน `tests/system.spec.ts` หนึ่งชุดมีหลาย assertion ไม่ใช่ 25 test cases แยกกัน

| # | สิ่งที่ต้องตรวจ | หลักฐาน / ผล |
|---|---|---|
| 1 | Admin login ถูกต้อง | 03, 07: API 200, browser เข้า dashboard — ผ่าน |
| 2 | รหัสผ่านผิด | 02, 07: API ยัง 401, UI ข้อความไทย — ผ่าน |
| 3 | protected page ไม่มี login | 01, 07: ไป login — ผ่าน |
| 4 | API ไม่มี login | 01: GET products ได้ 401 — ผ่าน |
| 5 | Staff ลบไม่ได้ | 04: DELETE ได้ 403, 08 ไม่มีปุ่มลบ — ผ่าน |
| 6 | Admin สร้างสินค้า | 03 POST 201, 07 กรอกฟอร์ม — ผ่าน |
| 7 | สินค้าอยู่ DB และ UI | 03 อ่าน Prisma ตรง, 07 ตรวจแถว SKU — ผ่าน |
| 8 | Admin แก้สินค้า | 03 PUT 200, 07 แก้ผ่าน UI — ผ่าน |
| 9 | ลบ/เก็บถาวร | 03 archive และคง 4 movements, 05/07 ลบจริงสินค้ายอดศูนย์ — ผ่าน |
| 10 | SKU ซ้ำ | 03 ได้ 409 — ผ่าน |
| 11 | ราคาติดลบ | 03 ได้ 400 — ผ่าน |
| 12 | จำนวนติดลบ | 03 ได้ 400 — ผ่าน |
| 13 | Search | 03 พบ SKU เดียว, 07 ค้นผ่าน UI — ผ่าน |
| 14 | Category filter | 03 ตรวจ categoryId ทุกแถวในผลลัพธ์ — ผ่าน |
| 15 | Low-stock filter | 03 ตรวจ quantity<=minStock ทุกแถว — ผ่าน |
| 16 | GET ส่งข้อมูลจริง | 03 เปรียบ SKU และ 01/04 ตรวจสิทธิ์ — ผ่าน |
| 17 | POST สร้างจริง | 03 ตรวจ DB หลัง 201 — ผ่าน |
| 18 | PUT แก้จริง | 03 และ 07 ตรวจชื่อใหม่ — ผ่าน |
| 19 | DELETE ตามสิทธิ์ | 03/04/05: archive/hard delete/403 — ผ่าน |
| 20 | เบิกเกินยอด | 03 ได้ 409, 09 UI แจ้งไม่เพียงพอ — ผ่าน |
| 21 | Stock concurrent ไม่ติดลบ | 03: ส่ง OUT 7 พร้อมกันสองคำขอจากยอด 10 สำเร็จหนึ่ง 201 อีกหนึ่ง 409 ยอดสุดท้าย 3 — ผ่าน |
| 22 | History มี actor ก่อน/หลัง | 03 ตรวจ email Admin, 10→3 และ magnitude 7; 09 ตรวจ 5→3 ใน UI — ผ่าน |
| 23 | Dashboard ตรง DB | 03 เทียบ count, sum(price×quantity), low count กับ Prisma query — ผ่าน |
| 24 | refresh ยัง login | 07 reload dashboard แล้วยังเห็น heading — ผ่าน |
| 25 | logout ยกเลิกการเข้าถึง | 07 logout แล้ว API 401 และ protected page กลับ login — ผ่าน |

## การตรวจเพิ่มเติม

- 03: ค่าว่าง/ชนิดตัวเลขผิด/quantity หาย/category ไม่มีจริงได้ 400 และ PUT แอบส่ง quantity ถูกปฏิเสธ
- 03: รับเข้าและ adjustment สำเร็จ ปรับยอดเท่าเดิมถูกปฏิเสธ; หมวดหมู่ที่มีสินค้าลบไม่ได้
- 05: category POST/PUT/DELETE และสินค้าไม่มี history ลบจริง
- 06: ลดสิทธิ์หรือปิด Admin คนสุดท้ายไม่ได้, API ไม่คืน passwordHash, reset password ทำให้ session เดิม 401, ปิดบัญชีแล้ว session ใช้ไม่ได้
- 08: Staff login และหน้า /users ถูกส่งไป unauthorized; viewport 390×844 แสดงผลได้
- 09: browser ทำ category CRUD, stock OUT, แสดง error เบิกเกิน, สร้างและปิด Staff; ไม่มี `pageerror` ระหว่าง flow นี้
- 10: malformed JSON, query ผิด, cross-origin mutation, not found และ Staff POST/PUT สินค้าได้
- ตัวอย่างผู้ใช้และรายการทดสอบถูกล้างหลังทดสอบ โดยไม่มี reset ฐานข้อมูล demo

## ตรวจภาพ UI ด้วยสายตา

เปิดภาพ PNG ที่ได้จาก browser เพื่อตรวจภาษาไทย การจัดวาง sidebar/KPI/ตาราง/ฟอร์ม และหน้าจอมือถือ ภาพอยู่ใน `docs/screenshots` (dashboard, products, mobile, categories, stock, users) การทดสอบคลิกและกรอกฟอร์มเป็น automated Chromium ส่วน visual QA เป็นการตรวจภาพที่ render จริง ไม่ได้อ้างว่ามนุษย์คลิกครบทุกขั้นตอนด้วยมือ

## ปัญหาที่พบและแก้

1. npm 11 ไม่รันบาง install scripts อัตโนมัติ: อนุญาต Prisma/engines/esbuild/unrs-resolver แบบเจาะจง แล้ว generate client สำเร็จ
2. Prisma migrate กับไฟล์ SQLite ที่ยังไม่มีแสดง schema engine error บน Windows นี้: สร้างไฟล์ว่างก่อน migrate โดยไม่ truncate ไฟล์เดิม เพิ่มใน setup
3. TypeScript ตรวจ side-effect CSS imports: เพิ่ม `types/styles.d.ts` และ Next.js declarations
4. ESLint ตรวจ next-env ที่ Next.js สร้างเอง: exclude generated file และ output directories จาก lint ไม่ได้ปิดการตรวจ source
5. Browser binaries ยังดาวน์โหลดไม่จบในรอบแรก: รอ install chromium จบแล้วรันทดสอบใหม่
6. Next.js streamed redirect ไม่เปลี่ยน URL ใน APIRequestContext ทันที: ตรวจ redirect ใน HTML และยืนยัน URL จริงด้วย browser test
7. Next route announcer มี role alert เหมือนข้อความผิดพลาด: test เลือก `.error[role=alert]` ชัดเจน
8. Test กดแก้ไขก่อน debounce search เสร็จทำให้พบหลายปุ่ม: scope locator ไปที่ row ของ SKU และเพิ่ม finally cleanup แล้วรันใหม่ผ่านทั้งหมด
9. สคริปต์ทดสอบ fresh DB ที่เรียก Prisma จาก Node ตรงไม่มี node_modules/.bin ใน PATH: เติม PATH ให้เครื่องมือทดสอบและทดสอบฐานข้อมูลใหม่สำเร็จ การเรียกผ่าน npm run มี PATH นี้อยู่แล้ว
10. Launcher .bat เดิมมี line ending แบบ LF: แปลงเป็น CRLF แล้วรันผ่าน cmd.exe ได้จริง

## ข้อจำกัดของผลทดสอบ

- ทดสอบบน Windows เครื่องปัจจุบันและ Chromium เท่านั้น ไม่ได้ทดสอบทุก Windows/browser
- ไม่มีการตัดการเชื่อมต่ออินเทอร์เน็ตระดับระบบปฏิบัติการขณะทดสอบ จึงไม่อ้างว่าได้ทดสอบ network-offline จริง แต่ runtime ไม่ใช้ API/CDN/font ภายนอก
- ไม่ใช่ penetration test หรือ load test; concurrency test เป็นสองคำขอจริง ไม่ใช่การรับรองจำนวนผู้ใช้ระดับ production
- ยังมี dependency audit warnings ตามด้านบน และ deprecation warning เรื่อง package.json#prisma ซึ่งยังรองรับใน Prisma 6 ที่ล็อกไว้
- ไม่มีตัวอย่าง auth ของอาจารย์ให้ตรวจ ไม่ได้เผยแพร่หรือ push GitHub
