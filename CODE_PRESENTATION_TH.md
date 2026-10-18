# คู่มือเปิด Source Code ให้ดูขณะนำเสนอ

ใช้ลำดับจากข้อมูลไปสู่หน้าจอ แล้วตามการไหลกลับเข้าสู่ฐานข้อมูล ใช้ประมาณ 5–8 นาทีแยกจากการสาธิตหน้าเว็บ ถ้ามีเวลาน้อยให้เปิดลำดับ 1, 2, 4, 6, 7

| ลำดับ | ไฟล์ | ชี้ส่วนไหน | คำพูดที่แนะนำ |
|---|---|---|---|
| 1 | prisma/schema.prisma | Product, Category และ relation | หนึ่งหมวดมีหลายสินค้า หนึ่งสินค้ามีหลายประวัติ ใช้ id เชื่อมกัน ราคาเป็น Int หน่วยสตางค์ |
| 2 | lib/validations.ts | productSchema, updateProductSchema, stockSchema | ตรวจชื่อ รหัส ราคาและจำนวนก่อนบันทึก โดย update ตัด quantity ออกและ strict ปฏิเสธการแอบส่ง |
| 3 | lib/prisma.ts | prisma singleton | สร้าง Prisma Client เพื่อให้ TypeScript ติดต่อ SQLite และนำ instance กลับมาใช้ตอน hot reload |
| 4 | lib/products.ts | getProducts, getProduct, updateProduct, deleteProduct | อ่านด้วย findMany แก้ด้วย update ลบจริงเมื่อไม่มีประวัติ และเก็บถาวรเมื่อมีประวัติ |
| 5 | lib/inventory.ts | createProduct, changeStock | create ทำสินค้าและ opening movement พร้อมกัน ส่วน stock ใช้ transaction กับ conditional update |
| 6 | app/api/[...path]/route.ts | handle ช่วงแรกและ export ท้ายไฟล์ | อ่าน session ตรวจสิทธิ์ รับ JSON ตรวจ Zod เรียก service และคืน status โดยใช้สี่ HTTP methods |
| 7 | lib/auth.ts | authorize, jwt, session, getCurrentUser | ตรวจ bcrypt แล้วออก session ที่เข้ารหัส และอ่านสิทธิ์/สถานะล่าสุดจากฐานข้อมูลทุกคำขอ |
| 8 | lib/permissions.ts | requiresAdmin | เก็บกติกาที่ server เรียกจริง ไม่ได้ป้องกันด้วยการซ่อนปุ่มอย่างเดียว |
| 9 | components/products/product-form.tsx | handleSubmit, safeParse, api | ฟอร์มเรียก handleSubmit ที่แยกจาก JSX รับ FormData แปลงบาทเป็นสตางค์ ตรวจ client แล้วส่ง POST หรือ PUT |
| 10 | components/products/product-list.tsx | load, useEffect, filters | เมื่อค่าค้นหาเปลี่ยน ส่ง query string ไป API และแสดงผล แก้ตัวกรองกลับหน้า 1 |
| 11 | components/ui/api.ts | api | ฟังก์ชัน fetch กลางที่รับผล JSON ถ้า status ผิดจะโยนข้อความให้หน้าจอแสดง |
| 12 | app/(protected)/layout.tsx | getCurrentUser และ redirect | หน้า protected ตรวจ login ก่อนแสดง shell ส่วน users/page ตรวจ Admin อีกครั้ง |
| 13 | app/(protected)/dashboard/page.tsx และ lib/inventory.ts | getDashboard | ข้อมูลบน KPI มาจากผลรวมและจำนวนในฐานข้อมูลจริง |
| 14 | tests/system.spec.ts | test 03, 07 และ 08 | มีการเรียก API จริง ทดสอบเบิกพร้อมกัน และเปิด Chromium กดปุ่มจริง |
| 15 | TEST_REPORT.md | ตาราง 25 ข้อ | ผลที่รายงานตรงกับคำสั่งที่รันจริง มีข้อจำกัดและ audit warnings แจ้งไว้ |

## ตัวอย่างตอบเมื่อต้องไล่การทำงาน

“เมื่อกดบันทึกสินค้า React รับ FormData ใน product-form แล้วตรวจด้วย Zod ถ้าถูกต้องเรียก api ซึ่งใช้ fetch ส่ง POST ไป Route Handler จากนั้น server ตรวจ session และ role ตรวจ Zod ซ้ำ แล้วเรียก createProduct เพื่อทำ transaction ผ่าน Prisma ไป SQLite เมื่อสำเร็จตอบ 201 และหน้าเว็บกลับไปโหลดรายการใหม่ครับ/ค่ะ”

## จุดที่ต้องเข้าใจก่อนตอบ

- `async/await` รอฐานข้อมูลโดยไม่เขียน callback ซ้อนหลายชั้น
- `where` เป็นเงื่อนไข, `data` เป็นค่าที่จะเขียน, `include` อ่านข้อมูล relation, `select` เลือกฟิลด์ที่เปิดเผยได้
- `safeParse` ส่ง success/error ให้ UI; `parse` ฝั่ง API โยน error แล้ว catch กลางแปลงเป็น 400
- `quantity` ใน Product คือยอดปัจจุบัน ส่วน quantity ใน StockMovement คือขนาดความเปลี่ยนแปลง
- `updateMany` ในสต็อกใช้เพื่อตรวจจำนวนแถวที่อัปเดตสำเร็จ ไม่ได้ตั้งใจเปลี่ยนสินค้าหลายรายการ
- JWT มีอายุ แต่สิทธิ์/สถานะยังต้องอ่านจาก DB เพื่อไม่ใช้ role เก่าที่ฝังใน token
- Route group ใช้จัดไฟล์ ไม่ใช่ URL จริง; catch-all route ใช้รับหลาย URL ตาม path
- ไม่เปิด `.env` ที่มี secret จริงบนจอ แสดง `.env.example` แทน

คู่มือทีละไฟล์ฉบับล่าสุด: [CODE_WALKTHROUGH_TH.md](CODE_WALKTHROUGH_TH.md) และหลักฐาน regression: [FINAL_AUDIT.md](FINAL_AUDIT.md)
