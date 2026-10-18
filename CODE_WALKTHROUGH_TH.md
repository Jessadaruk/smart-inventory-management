# คู่มือไล่โค้ด Smart Inventory V1 ทีละไฟล์

ฉบับ Final Audit สำหรับวันที่ 19 ตุลาคม 2569 อ่านจากข้อมูล → กติกา → API → หน้าจอ → การทดสอบ ใช้โครงสร้างจริงหลังตรวจรอบสุดท้าย ไม่จำเป็นต้องเปิด `.env` ที่มี secret

## 1. เริ่มจากข้อมูล

### `prisma/schema.prisma`

ดูโมเดล User, Category, Product, StockMovement ตามลำดับ `@id` คือรหัสหลัก `@unique` ป้องกันซ้ำ และ `@relation` เชื่อมตาราง Product.price เป็นสตางค์ จำนวนเป็น Int ไม่ใช้ float เก็บเงิน `isArchived` ซ่อนสินค้าที่ต้องรักษาประวัติ ส่วน `sessionVersion` ใช้ยกเลิก session เก่า

พูดว่า: “หนึ่งหมวดมีหลายสินค้า และหนึ่งสินค้ามีหลายความเคลื่อนไหว โดยประวัติชี้กลับไปผู้ทำรายการได้ครับ/ค่ะ”

### `prisma/migrations/20261018115731_init/migration.sql`

ดู CREATE TABLE, foreign keys แบบ RESTRICT และ unique indexes ป้องกันข้อมูลอ้างอิงเสียหายและ SKU/email/name ซ้ำ

### `prisma/migrations/20261018123000_integrity_guards/migration.sql`

ดู triggers ป้องกันจำนวน/ราคาติดลบ ตรวจ role และขนาดการเคลื่อนไหว เงื่อนไขธุรกิจยังตรวจที่ API ด้วย SQL trigger เป็นแนวป้องกันเพิ่ม ไม่ได้สร้างประวัติให้อัตโนมัติหากมีคนแก้ SQLite โดยตรง

### `prisma/migrations/migration_lock.toml`

บอก provider เป็น SQLite ให้ Prisma ใช้ประวัติ migrations กับฐานข้อมูลชนิดเดียวกัน รอบ audit ไม่เปลี่ยน schema หรือ migrations

### `prisma/seed.ts`

ดู `seed`, `upsert` และการข้าม SKU ที่มีอยู่ บัญชีใหม่อ่าน password จาก environment ไม่เปลี่ยนบัญชีที่มีแล้ว สร้าง opening movement พร้อมสินค้าภายใน transaction ไม่ต้องรัน seed กับฐานข้อมูลจริงก่อนนำเสนอหากมีข้อมูลครบอยู่แล้ว

### `lib/prisma.ts`

ดู `PrismaClient` และการนำ instance กลับมาใช้ตอน development เพื่อไม่สร้าง client ใหม่ทุก hot reload ทุก service import `prisma` จากไฟล์นี้

## 2. ตรวจข้อมูลและสิทธิ์ก่อนทำงาน

### `lib/validations.ts`

ดู `productSchema`, `updateProductSchema`, `categorySchema`, `userSchema`, `userUpdateSchema`, `stockSchema` ตามลำดับ Product API ใช้ number จริง ไม่แปลง missing เป็น 0; update schema ตัด quantity ออกและ strict ปฏิเสธ field นอกสัญญา Password ตรวจอย่างน้อย 10 ตัวอักษรและไม่เกิน 72 ไบต์ UTF-8 เพราะข้อจำกัด bcrypt

พูดว่า: “TypeScript ตรวจตอนพัฒนา ส่วน Zod ตรวจข้อมูลจริงที่เข้ามาตอนโปรแกรมทำงานครับ/ค่ะ”

### `lib/auth.ts`

ไล่ `authorize` → `jwt` → `session` → `getCurrentUser`:

1. หาอีเมลในฐานข้อมูลและตรวจ active
2. ใช้ `compare` เปรียบเทียบกับ bcrypt hash
3. ใส่ id และ sessionVersion ใน token ที่ NextAuth ดูแล
4. ทุก API อ่าน user ล่าสุดจาก DB และตรวจ version ไม่อาศัย role ที่ค้างใน token

### `lib/login-limit.ts`

ดู `canAttemptLogin` และ `clearLoginAttempts` จำกัดการลอง 10 ครั้งต่ออีเมลใน 15 นาที ตัวนับอยู่ memory เหมาะกับ local เครื่องเดียว รีสตาร์ทแล้วตัวนับหาย ไม่ควรอธิบายว่าเป็นระบบป้องกัน brute force แบบกระจายหลาย server

### `lib/permissions.ts`

ดู `requiresAdmin` กติกาสั้น ๆ: users ต้อง Admin, categories ต้อง Admin เมื่อไม่ใช่ GET, products ต้อง Admin เมื่อ DELETE ส่วนหน้าเว็บซ่อนปุ่มเพื่อช่วยผู้ใช้เท่านั้น

### `types/next-auth.d.ts` และ `types/styles.d.ts`

เพิ่ม type ของ id/sessionVersion ให้ NextAuth และบอก TypeScript ว่า import CSS ได้ ทั้งสองไฟล์ไม่ได้ทำ authentication เอง

## 3. บริการสินค้าและสต็อก

### `lib/products.ts`

| ฟังก์ชัน | อธิบายตามลำดับ |
|---|---|
| getProducts | ตรวจ query → where ค้น name/sku → category/lowStock → skip/take → items+total |
| getProduct | หา id ที่ไม่ archive → ไม่พบส่ง 404 |
| updateProduct | transaction → ตรวจสินค้า/หมวดหมู่ → update รายละเอียดโดยไม่มี quantity |
| deleteProduct | transaction → นับ history → archive ถ้ามีประวัติ หรือ delete จริงถ้าไม่มี |

ชี้ `prisma.product.fields.minStock` ว่าเป็นการเปรียบเทียบสองคอลัมน์ในแต่ละแถว ไม่ใช่ตัวเลขแจ้งเตือนค่าเดียวกันทุกสินค้า

### `lib/inventory.ts`

ดู `createProduct` สร้างสินค้าและ opening movement เมื่อจำนวนมากกว่า 0 แล้วดู `changeStock` ซึ่งเปลี่ยน nested ternary ให้เป็น if ที่อ่านตามโจทย์ได้:

```typescript
let target = input.quantity;
if (input.type === "IN") target = product.quantity + input.quantity;
if (input.type === "OUT") target = product.quantity - input.quantity;
```

ADJUST จึงใช้ input เป็นยอดใหม่ทั้งหมด ตรวจ target ไม่ติดลบ → updateMany มี quantity เดิมใน where → ตรวจ count=1 → บันทึก movement ใน transaction เดียวกัน ถ้าขั้นใดผิดจะ rollback

`getDashboard` อ่านข้อมูลจริงเพื่อคำนวณจำนวน/มูลค่า/ใกล้หมด ส่วน `databaseError` แปลง Zod/Prisma/domain error เป็น status กับข้อความไทย ไม่เปิดเผย stack trace ใน response

พูดว่า: “จำนวนใน Product คือยอดตอนนี้ แต่จำนวนใน StockMovement คือขนาดของส่วนต่างครับ/ค่ะ”

### `lib/format.ts`

ดู `money` แปลงสตางค์เป็นบาท, `dateTime` กำหนด Asia/Bangkok และ `movementName` แปลง IN/OUT/ADJUST เป็นไทย เป็นการจัดรูปแบบ ไม่เปลี่ยนข้อมูลในฐานข้อมูล

## 4. ไล่ HTTP request ผ่าน API รวม

### `app/api/[...path]/route.ts`

คง catch-all เดิมหลังประเมินความเสี่ยง ไม่สร้าง wrapper ซ้ำหรือย้าย guard ไปหลายไฟล์ ใช้ comment เลขขั้นตอนช่วยไล่:

1. `getCurrentUser` ไม่พบตัวตนคืน 401
2. แยก `resource`, `id`, `method` และตรวจ Origin ของการแก้ข้อมูล
3. `requiresAdmin` ปฏิเสธ Staff ด้วย 403 ก่อนแก้ DB
4. เลือก resource และ method, Zod parse แล้วเรียก service หรือ Prisma
5. คืน `{success:true,data}` และ status; catch คืน `{success:false,message}`

| Resource | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| products | รายการ/รายละเอียด | createProduct + 201 | updateProduct | deleteProduct (Admin) |
| categories | รายการ | เพิ่ม (Admin) | แก้ (Admin) | ลบหมวดว่าง (Admin) |
| stock | ประวัติ 100 รายการ | changeStock + 201 | ไม่มี | ไม่มี |
| dashboard | getDashboard | ไม่มี | ไม่มี | ไม่มี |
| users | safeUser fields (Admin) | สร้าง STAFF เท่านั้น | ตรวจ Admin คนสุดท้าย/เปลี่ยนบัญชี | ไม่มี |

ท้ายไฟล์ `export { handle as GET, handle as POST, handle as PUT, handle as DELETE }` เป็น Route Handler ของ Next.js จริง เส้นทาง API และ response contract ยังเหมือนเดิม `safeUser` ไม่เลือก passwordHash; update user เพิ่ม sessionVersion เพื่อเพิกถอน session เก่า

### `app/api/auth/[...nextauth]/route.ts`

เชื่อม NextAuth กับ authOptions และ export GET/POST ให้ NextAuth จัดการ CSRF/session/signin/signout ไม่อยู่ใน business catch-all

## 5. จากหน้าเว็บไป API

### `components/ui/api.ts`

ดู `api`: fetch → ตรวจ JSON → ตรวจ response.ok → คืน data Error network/JSON ถูกแปลงเป็นไทย ส่วน server validation ใช้ข้อความเดิม เพิ่ม optional AbortSignal เฉพาะฝั่ง client เพื่อหยุดคำค้นเก่า ไม่เปลี่ยน HTTP API contract

### `components/products/product-form.tsx`

เริ่มดู `handleSubmit` ก่อน JSX: FormData → แปลงบาทเป็นสตางค์ → safeParse → POST/PUT → ฝากข้อความสำเร็จ → กลับรายการ จากนั้นชี้ `<form onSubmit={handleSubmit}>` เพื่อเชื่อมปุ่มกับฟังก์ชัน โค้ดหน้าจอและขั้นตอนบันทึกแยกกันอ่านง่ายขึ้น

### `components/products/product-list.tsx`

ดู state ที่ประกาศทีละตัว → `load` → useEffect รอ 250ms → input/filter → ตาราง → pagination → dialog DELETE เมื่อเปลี่ยนคำค้น cleanup ใช้ AbortController ยกเลิกคำขอก่อนหน้า ป้องกันผลเก่าที่ช้ากว่าทับผลใหม่

### `components/categories.tsx`

ดู `load`, ฟอร์มเพิ่ม/แก้, editing state และ dialog ลบ ปุ่มจัดการแสดงเฉพาะ Admin แต่ server ยังตรวจซ้ำ จำนวนสินค้านับรวม archive ตามป้ายในตาราง

### `components/stock.tsx`

ดู `load` ที่อ่านสินค้าทีละหน้าเพื่อเติม select แล้วอ่านประวัติ ฟอร์มส่ง productId/type/quantity/note ไม่ส่ง userId เพราะ server ใช้ actor จาก session ปุ่ม disabled ระหว่างบันทึก

### `components/users.tsx`

ดูฟอร์มสร้างบัญชี Staff, editing/pending และ dialog ยืนยัน ใช้ PUT เปลี่ยน role/status/password ไม่มี DELETE ผู้ใช้ เพราะต้องรักษาการอ้างอิงในประวัติ

### `components/login-form.tsx`

ดู `signIn('credentials', {redirect:false,...})` แสดง error ไทยและ loading แล้วไป dashboard เมื่อสำเร็จ ไม่มี registration

### `components/layout/shell.tsx`

ดู links, usePathname, เมนูมือถือ และ signOut เมนู users แสดง Admin เท่านั้น ไม่ได้ใช้แทน guard ใน API

### `components/ui/confirm.tsx` และ `components/ui/toast.tsx`

Confirm ใช้ native dialog ให้ยืนยัน/ยกเลิก Toast ใช้ role=status พร้อมปุ่มปิด ทำหน้าที่แสดงผล ไม่เขียนฐานข้อมูล

## 6. Next.js pages และหน้าตา

| ไฟล์ | ทำอะไร |
|---|---|
| app/layout.tsx | html lang=th, metadata ไทย และ Prompt local |
| app/globals.css | สี spacing sidebar ตาราง skeleton toast และ responsive breakpoints |
| app/page.tsx | ส่งไป dashboard |
| app/login/page.tsx | ผู้ที่ login แล้วไป dashboard; นอกนั้นแสดง LoginForm |
| app/(protected)/layout.tsx | ตรวจตัวตนก่อนแสดง Shell ครอบ children |
| app/(protected)/dashboard/page.tsx | อ่าน getDashboard แสดง KPI/history/low-stock |
| app/(protected)/products/page.tsx | ส่ง isAdmin ให้ ProductList |
| app/(protected)/products/new/page.tsx | แสดง ProductForm ไม่มี id |
| app/(protected)/products/[id]/edit/page.tsx | await params แล้วส่ง id ให้ ProductForm |
| app/(protected)/categories/page.tsx | ส่ง isAdmin ให้ Categories |
| app/(protected)/stock/page.tsx | แสดง Stock |
| app/(protected)/users/page.tsx | ตรวจ Admin แล้วแสดง Users |
| app/unauthorized/page.tsx | ข้อความไม่มีสิทธิ์ภาษาไทยและกลับภาพรวม |
| app/not-found.tsx | หน้าไม่พบข้อมูลภาษาไทย |
| app/(protected)/loading.tsx | skeleton ระหว่างโหลด |
| app/(protected)/error.tsx | ข้อความผิดพลาดและปุ่มลองใหม่ |

วงเล็บ `(protected)` เป็น route group ไม่ปรากฏใน URL และ layout เพียงอย่างเดียวไม่แทนการตรวจ API

## 7. เริ่มระบบและทดสอบ

| ไฟล์ | จุดที่ควรอธิบาย |
|---|---|
| package.json / package-lock.json | คำสั่งและ dependency versions ที่ npm ci ใช้ |
| scripts/setup.mjs | สร้างไฟล์เมื่อยังไม่มี → generate → migrate → seed → build; ไม่ reset |
| scripts/start.mjs | ตรวจไฟล์ที่ต้องใช้และพอร์ต → เริ่ม Next.js ที่ loopback |
| start.bat | cd ไปโฟลเดอร์ตัวเอง ตรวจ Node/dependencies แล้ว npm start; CRLF สำหรับ Windows |
| scripts/test.mjs | สร้าง DB ใหม่ใน .test-data → migrations → seed เฉพาะ DB ทดสอบ → Playwright |
| playwright.config.ts | server ทดสอบใหม่เสมอ ไม่ reuse server สาธิตบนพอร์ตเดียวกัน |
| tests/system.spec.ts | HTTP จริง + Chromium; test 11 จำลอง network fault/response ล่าช้าโดยเจาะจง |
| scripts/audit-database.mjs | อ่าน counts, audit chain, demo password match และ fingerprint โดยไม่เขียนฐานข้อมูล |
| next.config.ts | security headers และปิด powered-by header |
| tsconfig.json / next-env.d.ts | TypeScript และ declarations ที่ Next สร้าง |
| eslint.config.mjs / postcss.config.mjs | ตรวจ source และเชื่อม Tailwind/PostCSS |
| .gitignore / .env.example | แยกไฟล์ส่วนตัวกับตัวอย่าง config; ไม่เปิด .env บนจอนำเสนอ |
| FINAL_AUDIT.md / docs/final-audit | ผลตรวจล่าสุดและหลักฐาน ไม่ใช่ผลที่สมมติขึ้น |

## คำตอบรวบรัดเมื่ออาจารย์ให้ไล่ทั้งระบบ

“ผมเริ่มจาก ProductForm.handleSubmit รับข้อมูลและตรวจ client แล้ว api ส่ง JSON ไป Route Handler ซึ่งตรวจ session และสิทธิ์ ตรวจ Zod ซ้ำ ก่อนเรียก createProduct ทำ transaction กับ SQLite ผ่าน Prisma เมื่อสำเร็จคืน 201 แล้วหน้าเว็บโหลดรายการใหม่ ถ้าเป็นการเบิกจะใช้ changeStock ที่ตรวจยอดเดิมพร้อมอัปเดตและบันทึกประวัติผู้ทำรายการครับ/ค่ะ”
