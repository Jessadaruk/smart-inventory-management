# Final Audit — Smart Inventory V1

> ฉบับเผยแพร่ GitHub เก็บผลสรุปและภาพสาธิต ส่วนไฟล์หลักฐานดิบ `docs/final-audit/` และ log/JSON ภายในถูกกันออกจาก Git เนื่องจากอาจมี path และรายละเอียดเครื่องผู้พัฒนา ผลตรวจด้านล่างเป็นผลที่รันจริงก่อนเผยแพร่ ไม่ได้รันขึ้นใหม่เพียงเพื่อเขียน README

> ในขั้นเตรียมเผยแพร่ แก้เฉพาะ metadata license ของ package.json/package-lock.json จาก ISC ที่ npm init สร้างเป็น UNLICENSED โดยไม่เปลี่ยน dependency versions; ผลเปรียบเทียบ lockfile ด้านล่างเป็นผล ณ เวลาตรวจ Final Audit ก่อนแก้ metadata นี้

ตรวจวันที่ **18 ตุลาคม 2569 เวลาประมาณ 19:27–19:36 น. (Asia/Bangkok)** เพื่อเตรียมนำเสนอ 19 ตุลาคม 2569 ผลนี้มาจาก source ปัจจุบัน คำสั่งจริง HTTP tests และ Chromium จริง

**ผลรวม: PASS สำหรับแกนหลักและการสาธิต localhost / WARNING สำหรับ dependency และขอบเขต production** ไม่มี FAIL ที่ยังค้างใน regression รอบนี้ ไม่ได้หมายความว่าปลอดช่องโหว่ทุกกรณี

## เกณฑ์สถานะ

- **PASS** ตรวจ source และ/หรือรันการตรวจที่ระบุแล้วให้ผลถูกต้อง
- **WARNING** มีข้อจำกัดหรือความเสี่ยงที่ยังไม่แก้ ต้องอ่านขอบเขตที่อธิบาย
- **FAIL** การตรวจล้มเหลวหรือข้อกำหนดสำคัญยังทำงานไม่ได้

## Phase 1 — ขอบเขตการตรวจ

ตรวจ source ของแอปทุกส่วน ได้แก่ app pages/layouts/Route Handlers, components, lib, Prisma schema/migrations/seed, scripts, tests, config/types และเอกสาร README/รายงาน/คู่มือ เปรียบเทียบเส้นทาง API กับผู้เรียกจริง สำรวจการ import, validation, การเปิดเผยฟิลด์ และการแก้ยอดสต็อก ไม่ audit source ภายใน node_modules ทีละไฟล์ ใช้ npm audit และ dependency paths สำหรับ dependencies รายการไฟล์และ SHA-256 อยู่ `docs/final-audit/source-inventory.json`

| หัวข้อ | ผล | ไฟล์ที่เกี่ยวข้อง / หลักฐาน |
|---|---|---|
| CRUD สินค้า | PASS | lib/products.ts, lib/inventory.ts; tests 03/05/07/10 สร้าง อ่าน แก้ ลบจริงและเก็บถาวร |
| Validation | PASS | lib/validations.ts, product-form.tsx; tests 03/06/10 ตรวจค่าติดลบ missing ชนิดผิด SKU ซ้ำ category ไม่พบ และ password เกิน 72 ไบต์ |
| Authentication | PASS | lib/auth.ts, login-form.tsx, auth Route Handler; tests 01/02/07/08 login ถูก/ผิด ป้องกันหน้า refresh/logout และ API 401 |
| Authorization | PASS | lib/permissions.ts, business Route Handler, users/page.tsx; tests 04/06/08/10 Staff ได้ 403 ในงานที่ห้าม และ Admin คนสุดท้ายเปลี่ยนสถานะ/ลดสิทธิ์ไม่ได้ |
| ไม่มี public Admin signup | PASS | POST users อยู่หลัง Admin guard และ create role เป็น STAFF เสมอ ไม่มี public register |
| ไม่เปิดเผย hash | PASS | safeUser ใน API เลือกฟิลด์ ไม่มี passwordHash; test 06 ตรวจ response |
| Search + Filter | PASS | lib/products.ts, product-list.tsx; tests 03/11 ค้น SKU, category, lowStock, รวม filter และแบ่งหน้า |
| GET POST PUT DELETE | PASS | app/api/[...path]/route.ts export ครบ; tests 03/05/10 ตรวจ HTTP status และ DB จริง |
| รูปแบบ response/error | PASS | Route Handler + databaseError; 400/401/403/404/409 ทดสอบจริง, 500 มี handler ปิดรายละเอียดแต่ไม่ได้จงใจทำ DB ล่ม |
| ราคาและจำนวน | PASS | price เป็น Int สตางค์; UI แปลงบาทก่อนส่ง API ไม่เปลี่ยนค่าว่างเป็นศูนย์; PUT quantity ถูกปฏิเสธ |
| Stock transaction/concurrency | PASS | changeStock; test 03 ส่ง OUT 7 พร้อมกันสองคำขอจากยอด 10 ได้ 201 หนึ่งคำขอและ 409 อีกหนึ่ง ยอดเหลือ 3 ไม่ติดลบ |
| ประวัติและ actor | PASS | createProduct/changeStock ใช้ userId จาก session; tests 03/09 ตรวจ opening, before/after, magnitude และชื่อผู้ดำเนินการ |
| ความถูกต้อง DB สาธิต | PASS | audit-database.mjs: 2 ผู้ใช้, 5 หมวด, 20 สินค้า, 20 movements; audit chain/magnitude/direction/actor/current quantity ไม่มี issues |
| ไม่เปลี่ยนข้อมูลเดิม | PASS | database-before.json และ database-after.json มี fingerprint ตรงกัน ใช้ฐานข้อมูลทดสอบแยก ไม่ reset dev.db |
| Dashboard เป็นข้อมูลจริง | PASS | getDashboard + test 03 และ audit-http.mjs เทียบ Prisma; DB สาธิตมี 20 สินค้า มูลค่า 4,870,000 สตางค์ = 48,700 บาท |
| UI ไทย | PASS | อ่าน labels/messages ทุกหน้า; smoke เปิด login, dashboard, products/new/edit, categories, stock, users, unauthorized, not-found; html lang=th และไม่มี pageerror ระหว่าง flow |
| สถานะ loading/empty/error | PASS | skeleton, empty text, error, dialog/toast; test 11 ตรวจ empty และข้อความไทยเมื่อ network/JSON ผิด |
| start.bat | PASS | รันผ่าน cmd.exe จริง Next Ready in 535ms; smoke browser เข้าได้ และ npm start ซ้ำได้ code 1 พร้อมข้อความพอร์ตชน |
| README ตรง source | PASS | อัปเดตให้ npm test สร้าง .test-data และไม่ reuse demo server; API/roles/archive/หน่วยราคา/คำสั่งตรง source |
| เอกสารอธิบายโค้ด | PASS | CODE_WALKTHROUGH_TH และ CODE_EXPLANATION_TH อัปเดตชื่อ handleSubmit/abort/test runner; เอกสารเตรียมสอบเก็บส่วนตัวแยกจาก repository |
| แบบฝึก 10 ข้อ | PASS (ตรวจเอกสาร ณ รอบ audit) | เอกสารซ้อมส่วนตัวระบุไฟล์ จุดแก้ เฉลย และวิธีตรวจ ไม่ได้อ้างว่าลงเฉลยทุกข้อในแอปจริง และไม่รวมใน repository ที่เผยแพร่ |
| npm audit | WARNING | 8 high, 0 critical; omit dev ยัง 3 high ดูรายละเอียดด้านล่าง |
| การนำไปเปิดบริการภายนอก | WARNING | ไม่ใช่ penetration/load test; local rate limiter/SQLite/HTTP และ audit warnings ยังมีข้อจำกัด |

## ผลการประเมินความเสี่ยงก่อน Refactor

| ทางเลือก | ความเสี่ยง/ผลกระทบ | การตัดสินใจ |
|---|---|---|
| แยก business API เป็น Route Handlers ตาม resource/id | ปานกลางถึงสูงเมื่อทำก่อนนำเสนอ: ต้องย้าย guard และ error handling ไปหลายเส้นทาง ทบทวน malformed/unknown URL และ method ทุกกรณี รวมถึงเอกสารเดิม จุดเสี่ยงคือการลืมตรวจสิทธิ์ใน route ใด route หนึ่ง | คง catch-all เดิมซึ่งมี branch แยก resource ชัดอยู่แล้ว เพิ่ม comment และตารางไล่เส้นทาง ไม่เพิ่มไฟล์ wrapper ที่เพียงส่งต่อซ้ำ |
| แยก handleSubmit ออกจาก JSX และ state ทีละตัว | ต่ำ ไม่มีการเปลี่ยน field/method/endpoint | ทำและทดสอบ 07/09 อีกครั้ง |
| เปลี่ยน nested ternary การคำนวณ stock เป็น if | ต่ำ แต่เป็น logic สำคัญ ต้องยืนยัน IN/OUT/ADJUST/concurrency | ทำและ test 03/09 ผ่าน |
| เปลี่ยน Prisma major/ESLint ตาม npm audit fix --force | สูง ต้องย้าย config/ทดสอบ compatibility และกระทบความพร้อมสาธิต | ไม่ทำ ไม่ใช้ --force และไม่เปลี่ยน dependencies/lockfile ในรอบนี้ |
| แยก DB ทดสอบออกจากข้อมูลเดิม | ปานกลางด้าน test environment; ลดความเสี่ยงต่อข้อมูลผู้ใช้ ต้องรับรอง server รับ DB เดียวกับ tests | ทำ runner ใหม่และ reuseExistingServer=false; ตรวจ fingerprint DB เดิมก่อน/หลัง |

REST contract เดิมคงอยู่: endpoints, request fields, satang units, response `{success,data}` / `{success,message}`, status ของ supported methods และ permission matrix ไม่เปลี่ยน Schema/migrations ไม่เปลี่ยน

## Phase 2 — สิ่งที่แก้จริงและเหตุผล

| ไฟล์ | การปรับ |
|---|---|
| components/products/product-form.tsx | แยก handleSubmit มีชื่อ ออกจาก onSubmit inline ยาว และแยก state declarations |
| components/products/product-list.tsx | แยก state, AbortController ยกเลิกคำค้นก่อนหน้า, ไม่แสดง abort เป็น error |
| components/categories.tsx / stock.tsx / users.tsx | ประกาศ state ทีละตัว ลด comma chains โดยไม่เปลี่ยนกติกา |
| components/ui/api.ts | optional AbortSignal, ข้อความไทยเมื่อ fetch ล้มเหลวหรือ response ไม่ใช่ JSON; คง server message เดิม |
| lib/inventory.ts | คำนวณ target ด้วย if ตาม IN/OUT/ADJUST อ่านง่ายขึ้น พร้อม comment ไทย; transaction/conditional update คงเดิม |
| app/api/[...path]/route.ts | เพิ่ม comment ไทยในลำดับตรวจตัวตน/สิทธิ์/Zod/ป้องกัน Admin คนสุดท้าย/sessionVersion/error |
| scripts/test.mjs + package.json + playwright.config.ts + .gitignore | npm test สร้าง SQLite ใหม่ใน .test-data ไม่ reuse server เดิมและไม่ reset ฐานข้อมูลผู้ใช้ |
| tests/system.spec.ts | เพิ่ม test 11 สำหรับ UI filters/pagination/stale response/empty/network และ malformed response |
| scripts/audit-database.mjs | อ่านความถูกต้อง DB และ fingerprint โดยไม่แก้ข้อมูลและไม่เปิดเผย passwordHash |
| scripts/audit-http.mjs | smoke หน้าจอจริง/บัญชี demo/Dashboard โดยไม่เขียนข้อมูลธุรกิจ |
| README และเอกสารนำเสนอ | อัปเดตคำอธิบายให้ตรง source ล่าสุด เพิ่ม walkthrough, practice 10 ข้อ และ QA เป็น 63 ข้อ |

ปัญหาที่พบและแก้: เดิมคำขอค้นหาเก่าที่ตอบช้าอาจทับผลใหม่, fetch/JSON errors อาจแสดงข้อความอังกฤษ และ test runner เดิมใช้ dev.db/reuse server ทำให้เสี่ยงแตะข้อมูลเดิม ปัจจุบันมี regression ยืนยันการแก้ทั้งสามจุด

## Phase 3 — ความพร้อมสาธิต

| บัญชี | ผลตรวจจริง |
|---|---|
| admin@inventory.local | active, role ADMIN, password ตรง environment และ login ผ่าน browser สำเร็จ |
| staff@inventory.local | active, role STAFF, password ตรง environment และ login ผ่าน browser สำเร็จ; users API 403 และหน้า users ไป unauthorized |

รหัสผ่าน development เริ่มต้นคือ `AdminDemo!2026` / `StaffDemo!2026` ตาม `.env.example` และตรงกับบัญชีสาธิตขณะ audit ไม่รีเซ็ตบัญชีเพื่อให้การตรวจผ่าน

ลำดับนำเสนอ: start.bat → Admin → Dashboard → เพิ่ม/แก้สินค้า → Validation → ค้น/กรอง/แบ่งหน้า → Stock OUT และประวัติ → archive → Logout → Staff/403 → เปิด CODE_WALKTHROUGH_TH และรายงานนี้

ภาพหน้าจอใหม่อยู่ `docs/final-audit/screenshots/` มี login, dashboard, products, new, edit, categories, stock, users, unauthorized และ not-found ใช้ browser render จริง รอแบบฟอร์มโหลดเสร็จก่อนถ่าย ตรวจภาพฟอร์มเพิ่ม/แก้ด้วยสายตา และตรวจข้อความใน source ไม่ถือว่าการตรวจ heading อัตโนมัติเป็นการรับรองคำจาก browser-native validation ทุกภาษา ข้อมูลสินค้าที่ผู้ใช้กรอกเองอาจเป็นภาษาอื่นได้

## Phase 4 — คำสั่งและผลจริง

Environment: Windows PowerShell, Node.js **24.18.0**, npm **11.16.0**, Next.js **15.5.28**, Prisma **6.19.3**, Playwright **1.64.1**

| คำสั่ง | Exit / ผล | หลักฐาน |
|---|---|---|
| npm run typecheck | 0, PASS | docs/final-audit/typecheck.txt |
| npm run lint | 0, PASS ไม่มี error/warning | docs/final-audit/lint.txt |
| npm run build | 0, PASS optimized production build | docs/final-audit/build.txt |
| npm test | 0, **11 passed (23.8s)** | test-run.txt และ test-results.json ใน docs/final-audit |
| npm audit --json | 1, WARNING **8 high / 0 critical** | audit-all.json |
| npm audit --omit=dev --json | 1, WARNING **3 high / 0 critical** | audit-production.json |
| npm explain braces deepmerge-ts | อ่าน dependency paths สำเร็จ | dependency-paths.txt |
| npx prisma migrate status | 0, Database schema is up to date, 2 migrations | ตรวจผ่าน CLI จริง ไม่รัน migration เปลี่ยน dev.db |
| node scripts/audit-database.mjs docs/final-audit/database-before.json | 0, issues=[] และ demo credentials match | database-before.json |
| cmd.exe /d /c "call .\start.bat" | Next Ready in 535ms | launcher.txt |
| node scripts/audit-http.mjs | 0, ทุก smoke check PASS ไม่มี browser pageerror | presentation-smoke.json / .txt |
| npm start ระหว่าง launcher ใช้พอร์ต 3000 | 1 ตามคาด ข้อความพอร์ตชนไทย | port-conflict.txt |
| node scripts/audit-database.mjs docs/final-audit/database-after.json | 0, fingerprint ตรง before | database-after.json |

เวลา 23.8s เป็นเวลา Playwright ไม่รวม setup migrations/seed ของฐานข้อมูลทดสอบ ส่วนการทดสอบที่แก้รายการธุรกิจทำกับ SQLite แยกทั้งหมด test 11 จำลองความช้าและ network/JSON error เฉพาะ fault cases; tests CRUD/Auth/Stock/Dashboard ใช้ API และ DB จริง ไม่ใช่ mock operational data

### Coverage ของ regression

- 01/02/07/08: Admin/Staff login, รหัสผ่านผิด, 401, protected redirect, refresh, logout
- 03/05/07/09/10: Product/Category CRUD, hard delete/archive, opening movements, validation, duplicate SKU, PUT ห้ามแก้ quantity
- 03/04/06/08/10: role enforcement, Staff create/edit ได้แต่ delete/users/categories manage ไม่ได้, last active Admin, reset/revoke และปิดบัญชี
- 03/09: IN, OUT, ADJUST, เกินคงเหลือ, concurrent OUT, actor/ก่อน/หลังและ Dashboard เทียบ DB
- 03/11: search/category/lowStock/pagination/empty และ stale GET cancellation
- 10/11: malformed query/JSON, cross-origin mutation, 404 และ error ภาษาไทย
- รายการ acceptance 25 ข้อเดิมจับคู่ไว้ใน TEST_REPORT.md; prefix tests 01–10 เดิมยังอยู่ และเพิ่ม 11

### พิสูจน์ไม่เปลี่ยนข้อมูลเดิม

ก่อนและหลังมี counts=2/5/20/20 และ dataFingerprint:

```text
0ac95fa87f90ecb0dd94039cc11c7b23e9f8f11dc08af88534d9373ff30d8944
```

Fingerprint คำนวณจากแถวทั้งหมดรวมค่า credential ภายในหน่วยความจำ แต่ไฟล์รายงานเก็บเฉพาะ digest ไม่เก็บ hash/password ทดสอบสร้าง DB แยกโดยตรง ไม่มีการลบ/ย้าย/restore/reset ฐานข้อมูลสาธิต และไม่มีการ push/deploy

เทียบ schema, migration SQL ทั้งสองไฟล์ และ package-lock.json กับ source ZIP เดิมด้วย SHA-256 แล้วตรงกันทั้งหมด (`docs/final-audit/unchanged-files.json`) สำรวจ source/config 58 ไฟล์ใน source-inventory และตรวจลิงก์เอกสารภายในแล้วไม่พบไฟล์ที่ขาด

## รายละเอียด npm audit และการประเมินผลกระทบ

มี **2 advisory หลัก** ที่ส่งผลต่อ **8 package entries** ไม่ใช่ 8 ช่องโหว่ต้นเหตุอิสระ:

1. **braces 3.0.3 — stack exhaustion/DoS จากรูปแบบ brace ซ้อนลึก** ผ่าน eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces รวม 5 entries; graph ที่ติดตั้งจัด chain นี้เป็น dev dependency ไม่มี patched version ใน advisory ที่ตรวจ [GitHub Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
2. **deepmerge-ts 7.1.5 — stack exhaustion เมื่อ merge object graph แบบ recursive** ผ่าน Prisma 6.19.3 → @prisma/config → deepmerge-ts รวม 3 entries; แก้ใน deepmerge-ts 8.x แต่ npm เสนอ Prisma major ใหม่ จึงต้องประเมิน config/API compatibility ก่อนเปลี่ยน [GitHub Advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)

`--omit=dev` ยังนับ Prisma chain 3 high เพราะ @prisma/client มี peerOptional prisma จึง **ไม่อ้างว่า production dependency tree สะอาด** ไม่พบ source ของแอปส่ง request body/search ไปให้ braces/deepmerge โดยตรง จึงประเมินว่าไม่ใช่เส้นทางใช้งานธุรกิจปกติที่ตรวจพบในระบบนี้ แต่ไม่ได้พิสูจน์ว่าโจมตีไม่ได้หรือทดแทน security audit เชิงลึก

ไม่ใช้ `npm audit fix --force`, ไม่ลด major ESLint ตามคำแนะนำอัตโนมัติ, ไม่เปลี่ยน Prisma major และไม่เพิ่ม override ใหม่ เพื่อลด regression ก่อนนำเสนอ ควรจัดงานอัปเกรดแยกภายหลังแล้วทดสอบ stack ใหม่อย่างครบถ้วน

## ข้อจำกัดที่ยังเหลือ

- ยังมี audit warnings ข้างต้น จัดเป็น WARNING ไม่ใช่ PASS ด้านความปลอดภัย production
- จำกัด login ใน memory, HTTP localhost และ SQLite เหมาะกับเครื่องเดียว; ไม่ได้ทำ distributed limiter, HTTPS hosting, penetration หรือ load test
- หน้าสต็อกแสดงล่าสุด 100 รายการ Dashboard โหลดสินค้าที่ใช้งานทั้งหมด เหมาะกับข้อมูลเล็ก
- ไม่มี CSV/charts/MFA/ระบบอีเมลกู้รหัสผ่าน/restore archive ตามขอบเขต V1
- ตรวจ Windows/Chromium เครื่องปัจจุบัน ไม่ได้ทดสอบทุก browser/OS หรือตัดอินเทอร์เน็ตระดับ OS จริง
- ไม่ได้จำลองฐานข้อมูลล่มเพื่อบังคับ 500; ตรวจ source ของ error handler เท่านั้น จึงไม่อ้าง fault-injection test ของ 500
- การทดสอบ HTTP ใช้ Playwright request จึงไม่ได้รัน Postman แยกซ้ำ
- ยังมี Prisma 6 deprecation warning เรื่อง seed config ใน package.json ใช้งานได้ในเวอร์ชันที่ล็อกอยู่
- ไม่มี authentication example ของอาจารย์แนบมา จึงไม่ได้อ้างว่า review ตัวอย่างนั้น

**ข้อสรุปใช้งาน:** พร้อมสาธิตข้อกำหนดวิชาบน localhost พร้อมหลักฐาน regression และข้อมูล demo เดิม โดยต้องเปิดเผยข้อจำกัด dependency ตามรายงานนี้
