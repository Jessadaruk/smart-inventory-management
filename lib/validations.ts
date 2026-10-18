import { z } from "zod";
// ข้อผิดพลาดที่ยังไม่ได้กำหนดข้อความเฉพาะ จะแสดงเป็นภาษาไทย
z.config({
  customError: () => "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรูปแบบและค่าที่กรอก",
});
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `กรุณากรอกอย่างน้อย ${min} ตัวอักษร`)
    .max(max, "ข้อความยาวเกินกำหนด");
const integer = z
  .number()
  .int("ต้องเป็นจำนวนเต็ม")
  .min(0, "ต้องไม่ติดลบ")
  .max(100000000, "ค่ามากเกินกำหนด");
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
export const categorySchema = z.object({
  name: text(2, 80),
  description: z.string().trim().max(500).default(""),
});
export const passwordSchema = z
  .string()
  .min(10, "รหัสผ่านอย่างน้อย 10 ตัวอักษร")
  .max(72)
  .regex(/[a-z]/, "ต้องมีตัวพิมพ์เล็ก")
  .regex(/[A-Z]/, "ต้องมีตัวพิมพ์ใหญ่")
  .regex(/[0-9]/, "ต้องมีตัวเลข")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "รหัสผ่านต้องยาวไม่เกิน 72 ไบต์ (ภาษาไทยใช้หลายไบต์ต่อตัวอักษร)",
  );
export const userSchema = z.object({
  name: text(2, 100),
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
  password: passwordSchema,
});
export const userUpdateSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]),
  isActive: z.boolean(),
  password: passwordSchema.optional(),
});
export const stockSchema = z
  .object({
    productId: text(1, 100),
    type: z.enum(["IN", "OUT", "ADJUST"]),
    quantity: integer,
    note: text(1, 500),
  })
  .refine(
    (v) => v.type === "ADJUST" || v.quantity > 0,
    "จำนวนรับเข้าและเบิกออกต้องมากกว่า 0",
  );
