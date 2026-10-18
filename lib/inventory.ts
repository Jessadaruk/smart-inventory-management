import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { stockSchema, productSchema } from "./validations";
import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
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
export async function getDashboard() {
  const [products, categories, movements] = await Promise.all([
    prisma.product.findMany({
      where: { isArchived: false },
      include: { category: true },
    }),
    prisma.category.count(),
    prisma.stockMovement.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { product: true, user: { select: { name: true } } },
    }),
  ]);
  const lowStock = products.filter((p) => p.quantity <= p.minStock);
  return {
    totalProducts: products.length,
    totalCategories: categories,
    totalValue: products.reduce((sum, p) => sum + p.price * p.quantity, 0),
    lowStockCount: lowStock.length,
    lowStock,
    movements,
  };
}
export function databaseError(error: unknown) {
  if (error instanceof HttpError)
    return { status: error.status, message: error.message };
  if (error instanceof z.ZodError)
    return {
      status: 400,
      message: error.issues.map((i) => i.message).join(" • "),
    };
  if (error instanceof SyntaxError)
    return { status: 400, message: "รูปแบบข้อมูลไม่ถูกต้อง" };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return { status: 409, message: "ข้อมูลซ้ำกับรายการที่มีอยู่แล้ว" };
    if (error.code === "P2025") return { status: 404, message: "ไม่พบรายการ" };
    if (["P2003", "P2034", "P2028", "P1008"].includes(error.code))
      return {
        status: 409,
        message: "ข้อมูลมีการใช้งานหรือกำลังเปลี่ยนแปลง กรุณาลองใหม่",
      };
  }
  console.error(error);
  return { status: 500, message: "เกิดข้อผิดพลาดภายในระบบ" };
}
