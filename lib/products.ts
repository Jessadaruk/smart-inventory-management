import { prisma } from "./prisma";
import { HttpError } from "./inventory";
import { updateProductSchema } from "./validations";
import { z } from "zod";

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
export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isArchived: false },
    include: { category: true },
  });
  if (!product) throw new HttpError(404, "ไม่พบสินค้า");
  return product;
}
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
