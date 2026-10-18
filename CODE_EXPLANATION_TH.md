# อธิบาย Source Code ระบบจัดการคลังสินค้าอัจฉริยะ

ฉบับปรับหลัง Final Audit: ProductForm ใช้ฟังก์ชัน `handleSubmit` แยกจาก JSX; ProductList ยกเลิก GET เก่าด้วย AbortController; `npm test` ใช้ฐานข้อมูลแยก ดูคู่มือครบทุกไฟล์ใน CODE_WALKTHROUGH_TH.md และผลล่าสุดใน FINAL_AUDIT.md

ตัวอย่างด้านล่างคัดจาก source จริงหลังจัดรูปแบบโค้ด ชื่อฟังก์ชันและเส้นทางตรงกับโปรเจกต์ ไม่ต้องเปิด .env ที่มีความลับขณะนำเสนอ

## 1. โครงสร้างและหน้าที่โฟลเดอร์

ไฟล์: `app/(protected)/layout.tsx` | ฟังก์ชัน: `ProtectedLayout`

app เก็บเส้นทาง, components เก็บหน้าจอใช้ซ้ำ, lib เก็บกติกาและฐานข้อมูล, prisma เก็บ schema/migrations/seed, tests เก็บการทดสอบ, scripts เก็บคำสั่งช่วยเริ่มระบบ

### ตัวอย่างโค้ดจริง

```typescript
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
```

### อธิบายทีละขั้นตอน

1. เมื่อเปิดหน้าในกลุ่ม protected Next.js ใช้ layout นี้
2. อ่านผู้ใช้ปัจจุบัน
3. ถ้าไม่มีส่งไป login
4. ถ้ามีแสดง Shell ครอบหน้าที่ร้องขอ

**ตอบอาจารย์สั้น ๆ:** “ผมแยกโค้ดตามหน้าที่ โดยหน้าที่ต้อง login อยู่ใน route group เดียวกันครับ/ค่ะ”

## 2. การทำงานของ Next.js

ไฟล์: `app/(protected)/products/page.tsx` | ฟังก์ชัน: `Products`

ไฟล์ page.tsx เป็น Server Component อ่านผู้ใช้แล้วส่งเพียง isAdmin ให้ Client Component ProductList ไม่ส่ง password หรือ token ให้ฟอร์ม

### ตัวอย่างโค้ดจริง

```typescript
export default async function Products() {
  const user = await getCurrentUser();
  return <ProductList isAdmin={user?.role === "ADMIN"} />;
}
```

### อธิบายทีละขั้นตอน

1. Next.js จับ URL /products
2. render Products บน server
3. อ่าน role
4. ส่ง prop
5. React แสดงรายการและ event บน browser

**ตอบอาจารย์สั้น ๆ:** “Next.js ทำทั้งหน้า server และ API ในโปรเจกต์เดียว ส่วน React client จัดการการกดปุ่มครับ/ค่ะ”

## 3. การเชื่อมต่อฐานข้อมูลด้วย Prisma

ไฟล์: `lib/prisma.ts` | ฟังก์ชัน: `PrismaClient`

DATABASE_URL ใน .env ชี้ไฟล์ SQLite generator สร้าง type ตาม schema และ instance นี้ถูก import ไปใช้ใน services

### ตัวอย่างโค้ดจริง

```typescript
import { PrismaClient } from "@prisma/client";
const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalDatabase.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDatabase.prisma = prisma;
```

### อธิบายทีละขั้นตอน

1. อ่าน schema
2. generate Prisma Client
3. สร้าง instance
4. service เรียก prisma.product
5. Prisma ส่งคำสั่งไป SQLite

**ตอบอาจารย์สั้น ๆ:** “Prisma เป็นตัวกลางที่ทำให้ผมใช้ TypeScript อ่านเขียน SQLite ได้ครับ/ค่ะ”

## 4. CRUD ทั้งสี่ฟังก์ชัน

ไฟล์: `lib/products.ts` | ฟังก์ชัน: `getProducts, getProduct, createProduct, updateProduct, deleteProduct`

getProducts/getProduct อ่านด้วย findMany/findFirst; createProduct อยู่ lib/inventory.ts เพิ่มสินค้าและ opening movement; updateProduct แก้เฉพาะข้อมูลที่ผ่าน schema; deleteProduct ลบจริงหรือ archive

### ตัวอย่างโค้ดจริง

```typescript
export async function updateProduct(
  id: string,
  input: z.infer<typeof updateProductSchema>,
) {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.product.findFirst({ where: { id, isArchived: false } })))
      throw new HttpError(404, "ไม่พบสินค้า");
    if (!(await tx.category.findUnique({ where: { id: input.categoryId } })))
      throw new HttpError(400, "ไม่พบหมวดหมู่");
    return tx.product.update({ where: { id }, data: input });
  });
}
```

### อธิบายทีละขั้นตอน

1. รับข้อมูลที่ผ่าน Zod
2. ตรวจสินค้ากับหมวดหมู่
3. update ใน transaction
4. ส่งค่าที่บันทึกกลับ client การ create ใช้ create ส่วน read ใช้ find และ delete ตรวจ history ก่อน

**ตอบอาจารย์สั้น ๆ:** “CRUD คือเพิ่ม อ่าน แก้ ลบ โดยการลบที่มีประวัติจะเก็บถาวรเพื่อรักษา audit ครับ/ค่ะ”

## 5. การตรวจสอบข้อมูลด้วย Zod

ไฟล์: `lib/validations.ts` | ฟังก์ชัน: `productSchema, updateProductSchema`

ใช้ schema เดียวกับ product form และ server; updateProductSchema ตัด quantity และ strict ป้องกันแก้ยอดตรง; กฎ integer อยู่ด้านบนไฟล์ ตรวจ int/min/max และไม่ coercion ค่าว่างเป็น 0

### ตัวอย่างโค้ดจริง

```typescript
export const productSchema = z.object({
  sku: text(1, 50).regex(
    /^[A-Za-z0-9_-]+$/,
    "รหัสสินค้าใช้ตัวอักษรอังกฤษ ตัวเลข - และ _",
  ),
  name: text(2, 150),
  description: z.string().trim().max(1000).default(""),
  categoryId: text(1, 100),
  price: integer,
  minStock: integer,
  quantity: integer,
});
export const updateProductSchema = productSchema
  .omit({ quantity: true })
  .strict();
```

### อธิบายทีละขั้นตอน

1. form รับ input
2. safeParse ตรวจ client
3. API parse ตรวจซ้ำ
4. ถ้าผิด catch ส่ง 400
5. ถ้าถูกส่ง parsed.data ไป service

**ตอบอาจารย์สั้น ๆ:** “ตรวจสองชั้นเพราะผู้ใช้สามารถข้ามหน้าเว็บแล้วเรียก API ตรงได้ครับ/ค่ะ”

## 6. Authentication

ไฟล์: `lib/auth.ts` | ฟังก์ชัน: `authorize, jwt, session, getCurrentUser`

Credentials Provider หาอีเมลใน DB เช็ก active และ bcrypt compare จำกัดการลอง login จาก lib/login-limit.ts ไม่มี public registration ใช้ JWT strategy อายุ 8 ชั่วโมง

### ตัวอย่างโค้ดจริง

```typescript
async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials.password ||
          Buffer.byteLength(credentials.password, "utf8") > 72
        )
          return null;
        const email = credentials.email.trim().toLowerCase();
        if (!canAttemptLogin(email)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (
          !user?.isActive ||
          !(await compare(credentials.password, user.passwordHash))
        )
          return null;
        clearLoginAttempts(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
```

### อธิบายทีละขั้นตอน

1. signIn ส่งข้อมูลพร้อม CSRF
2. authorize ตรวจบัญชี
3. bcrypt compare
4. ส่ง safe user
5. jwt callback เก็บ id/version
6. session cookie ถูกส่งกับคำขอถัดไป

**ตอบอาจารย์สั้น ๆ:** “ผมไม่เก็บรหัสผ่านตรง ๆ แต่เก็บ bcrypt hash แล้วให้ NextAuth ดูแล session ครับ/ค่ะ”

## 7. การตรวจสิทธิ์ Admin และ Staff

ไฟล์: `lib/permissions.ts` | ฟังก์ชัน: `requiresAdmin, getCurrentUser`

Route Handler เรียก getCurrentUser ก่อน แล้ว requiresAdmin เทียบ role จาก DB; Protected users/page ตรวจ Admin อีกชั้น; UI ซ่อนปุ่มเพื่อความเข้าใจง่ายแต่ไม่ได้ใช้แทน server authorization

### ตัวอย่างโค้ดจริง

```typescript
export function requiresAdmin(resource: string, method: string) {
  if (resource === "users") return true;
  if (resource === "categories" && method !== "GET") return true;
  if (resource === "products" && method === "DELETE") return true;
  return false;
}
```

### อธิบายทีละขั้นตอน

1. ไม่มี session
2. 401; มี session แล้วต้อง Admin แต่เป็น Staff
3. 403; ผ่านแล้วจึงอ่าน body หรือแก้ DB; sessionVersion ไม่ตรงหรือ inactive จะเป็น 401

**ตอบอาจารย์สั้น ๆ:** “Authentication บอกว่าเป็นใคร ส่วน Authorization บอกว่าทำอะไรได้ครับ/ค่ะ”

## 8. Search และ Filter

ไฟล์: `lib/products.ts` | ฟังก์ชัน: `getProducts`

รับ query ผ่าน URLSearchParams ตรวจ page/pageSize ด้วย Zod ใช้ OR สำหรับ name/sku และ AND สำหรับ categoryId/lowStock; query count และ items อยู่ใน transaction เดียวกัน

### ตัวอย่างโค้ดจริง

```typescript
export async function getProducts(query: URLSearchParams) {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .parse(query.get("page") ?? 1);
  const pageSize = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(query.get("pageSize") ?? 10);
  const search = z
    .string()
    .trim()
    .max(150)
    .parse(query.get("search") ?? "");
  const lowStock = z
    .enum(["", "true", "false"])
    .parse(query.get("lowStock") ?? "");
  const where = {
    isArchived: false,
    ...(query.get("categoryId")
      ? { categoryId: query.get("categoryId")! }
      : {}),
    OR: [{ name: { contains: search } }, { sku: { contains: search } }],
    // เปรียบเทียบยอดคงเหลือกับจุดแจ้งเตือนของสินค้าแต่ละแถว
    ...(lowStock === "true"
      ? { quantity: { lte: prisma.product.fields.minStock } }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
```

### อธิบายทีละขั้นตอน

1. พิมพ์หรือเลือก filter ใน ProductList
2. setState และกลับหน้า 1
3. useEffect เรียก load
4. GET query
5. Prisma where/skip/take
6. JSON
7. setItems แสดงตาราง

**ตอบอาจารย์สั้น ๆ:** “ค้นหาที่ server และใช้ pagination จึงไม่จำเป็นต้องโหลดสินค้าทั้งหมดเข้า browser ครับ/ค่ะ”

## 9. REST API และ HTTP status

ไฟล์: `app/api/[...path]/route.ts` | ฟังก์ชัน: `handle, databaseError`

ไฟล์ catch-all รับทุก URL ธุรกิจที่ระบุไว้ใน README ส่วน auth มี route ของตนเอง ท้ายไฟล์ export handle เป็น GET POST PUT DELETE ผลสำเร็จ success/data ผิดพลาด success/message

### ตัวอย่างโค้ดจริง

```typescript
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    // 1. ตรวจตัวตนก่อนอ่านหรือแก้ข้อมูลทุก resource
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "กรุณาเข้าสู่ระบบ");
    const { path } = await context.params;
    const [resource, id] = path;
    const method = request.method;
    if (path.length > 2) throw new HttpError(404, "ไม่พบเส้นทาง");
    if (method !== "GET") {
      // ป้องกันเว็บไซต์อื่นส่งคำขอแก้ไขผ่านคุกกี้ของผู้ใช้
      const origin = request.headers.get("origin");
      if (origin && origin !== request.nextUrl.origin)
        throw new HttpError(403, "แหล่งคำขอไม่ถูกต้อง");
    }
    // 2. ตรวจสิทธิ์บน server แม้หน้าเว็บจะซ่อนปุ่มแล้ว
    if (requiresAdmin(resource, method) && user.role !== "ADMIN")
      throw new HttpError(403, "คุณไม่มีสิทธิ์ดำเนินการนี้");
```

### อธิบายทีละขั้นตอน

1. รับ request
2. ตรวจ session
3. แยก resource/id/method
4. ตรวจ origin และ role
5. parse body
6. เลือก service
7. NextResponse.json พร้อม status
8. catch แปลง error โดยไม่เปิดเผย stack

**ตอบอาจารย์สั้น ๆ:** “method บอกการกระทำ ส่วน endpoint บอกทรัพยากร เช่น POST /api/products คือสร้างสินค้าครับ/ค่ะ”

## 10. การไหลของข้อมูลตั้งแต่กดปุ่มจนบันทึก

ไฟล์: `components/ui/api.ts` | ฟังก์ชัน: `api, ProductForm onSubmit, createProduct, changeStock`

ProductForm สร้าง input และแปลงบาทเป็นสตางค์แล้วเรียก api ด้านล่าง ฟังก์ชันนี้ fetch ไป server ที่ตรวจสิทธิ์และเรียก service ก่อนใช้ Prisma เขียน SQLite

### ตัวอย่างโค้ดจริง

```typescript
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    // การยกเลิกคำค้นเก่าไม่ใช่ข้อผิดพลาดที่ต้องแสดงต่อผู้ใช้
    if (signal?.aborted) throw error;
    throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("ระบบส่งข้อมูลไม่ถูกต้อง กรุณาลองใหม่");
  }
  if (!response.ok)
    throw new Error(result.message ?? "ไม่สามารถเชื่อมต่อระบบได้");
  return result.data;
}
```

### อธิบายทีละขั้นตอน

1. กดบันทึก
2. FormData
3. Zod safeParse
4. api/fetch POST
5. handle/getCurrentUser/requiresAdmin
6. productSchema.parse
7. createProduct transaction
8. product.create + stockMovement.create
9. JSON 201
10. กลับ /products และ GET อ่านข้อมูลใหม่

**ตอบอาจารย์สั้น ๆ:** “ปุ่มไม่ได้เขียนฐานข้อมูลเอง แต่ส่ง API ไปให้ server ตรวจและบันทึกอย่างปลอดภัยครับ/ค่ะ”

## โค้ดเพิ่มเติมสำหรับ CRUD และสต็อก

ไฟล์ `lib/inventory.ts` ฟังก์ชัน `createProduct`:

```typescript
export async function createProduct(
  input: z.infer<typeof productSchema>,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    if (!(await tx.category.findUnique({ where: { id: input.categoryId } })))
      throw new HttpError(400, "ไม่พบหมวดหมู่");
    const product = await tx.product.create({ data: input });
    if (product.quantity > 0)
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          userId,
          type: "IN",
          quantity: product.quantity,
          beforeQty: 0,
          afterQty: product.quantity,
          note: "ยอดเริ่มต้น",
        },
      });
    return product;
  });
}
```

สร้างสินค้าและ opening movement ใน transaction เดียวกัน หากส่วนใดล้มเหลวจะย้อนกลับทั้งหมด ผู้ดำเนินการมาจาก session

ไฟล์ `lib/products.ts` ฟังก์ชัน `deleteProduct`:

```typescript
export async function deleteProduct(id: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id, isArchived: false },
    });
    if (!product) throw new HttpError(404, "ไม่พบสินค้า");
    const history = await tx.stockMovement.count({ where: { productId: id } });
    // ไม่ลบประวัติเดิม: เก็บถาวรถ้ามีความเคลื่อนไหวแล้ว
    if (history) {
      await tx.product.update({ where: { id }, data: { isArchived: true } });
      return { archived: true };
    }
    await tx.product.delete({ where: { id } });
    return { archived: false };
  });
}
```

ไฟล์ `lib/inventory.ts` ฟังก์ชัน `changeStock`:

```typescript
export async function changeStock(
  input: z.infer<typeof stockSchema>,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });
    if (!product || product.isArchived) throw new HttpError(404, "ไม่พบสินค้า");
    // ADJUST รับยอดใหม่ทั้งหมด ส่วน IN/OUT รับจำนวนที่เพิ่มหรือลด
    let target = input.quantity;
    if (input.type === "IN") target = product.quantity + input.quantity;
    if (input.type === "OUT") target = product.quantity - input.quantity;
    if (target < 0) throw new HttpError(409, "จำนวนคงเหลือไม่เพียงพอ");
    if (target > 100000000)
      throw new HttpError(400, "ยอดคงเหลือต้องไม่เกิน 100,000,000 หน่วย");
    if (target === product.quantity)
      throw new HttpError(400, "ยอดใหม่ต้องต่างจากยอดเดิม");
    // ตรวจยอดเดิมพร้อมอัปเดตในคำสั่งเดียว ป้องกันการเบิกพร้อมกันแล้วติดลบ
    const result = await tx.product.updateMany({
      where: { id: product.id, quantity: product.quantity, isArchived: false },
      data: { quantity: target },
    });
    if (result.count !== 1)
      throw new HttpError(409, "ยอดสินค้าเปลี่ยนแล้ว กรุณาลองใหม่");
    return tx.stockMovement.create({
      data: {
        productId: product.id,
        userId,
        type: input.type,
        quantity: Math.abs(target - product.quantity),
        beforeQty: product.quantity,
        afterQty: target,
        note: input.note,
      },
    });
  });
}
```

**ลำดับ:** ตรวจสินค้า → คำนวณยอด → ปฏิเสธติดลบ → updateMany ตรวจยอดเดิม → ตรวจ count=1 → บันทึก actor/ก่อน/หลังใน transaction เดียวกัน

**ตอบสั้น:** “ถ้าสองคนเบิกพร้อมกัน คนที่ยอดเดิมเปลี่ยนไปแล้วจะถูกปฏิเสธ 409 แทนการทำยอดติดลบครับ/ค่ะ”
