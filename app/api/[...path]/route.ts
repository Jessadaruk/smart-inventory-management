import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  categorySchema,
  productSchema,
  updateProductSchema,
  stockSchema,
  userSchema,
  userUpdateSchema,
} from "@/lib/validations";
import {
  createProduct,
  changeStock,
  getDashboard,
  HttpError,
  databaseError,
} from "@/lib/inventory";
import { hash } from "bcryptjs";
import {
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products";
import { requiresAdmin } from "@/lib/permissions";
export const dynamic = "force-dynamic";
const safeUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
};
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
    let data: unknown;
    let status = 200;
    if (resource === "products") {
      // 3. เลือกงานจาก resource + method แล้วตรวจ Zod ก่อนเรียกบริการ
      if (method === "GET" && !id)
        data = await getProducts(request.nextUrl.searchParams);
      else if (method === "GET" && id) data = await getProduct(id);
      else if (method === "POST" && !id) {
        data = await createProduct(
          productSchema.parse(await request.json()),
          user.id,
        );
        status = 201;
      } else if (method === "PUT" && id)
        data = await updateProduct(
          id,
          updateProductSchema.parse(await request.json()),
        );
      else if (method === "DELETE" && id) data = await deleteProduct(id);
      else throw new HttpError(404, "ไม่พบเส้นทาง");
    } else if (resource === "categories") {
      if (method === "GET" && !id)
        data = await prisma.category.findMany({
          include: { _count: { select: { products: true } } },
          orderBy: { name: "asc" },
        });
      else if (method === "POST" && !id) {
        data = await prisma.category.create({
          data: categorySchema.parse(await request.json()),
        });
        status = 201;
      } else if (method === "PUT" && id)
        data = await prisma.category.update({
          where: { id },
          data: categorySchema.parse(await request.json()),
        });
      else if (method === "DELETE" && id) {
        if (await prisma.product.count({ where: { categoryId: id } }))
          throw new HttpError(
            409,
            "หมวดหมู่นี้ยังมีสินค้า รวมถึงสินค้าที่เก็บถาวร",
          );
        data = await prisma.category.delete({ where: { id } });
      } else throw new HttpError(404, "ไม่พบเส้นทาง");
    } else if (resource === "stock" && !id) {
      if (method === "GET")
        data = await prisma.stockMovement.findMany({
          take: 100,
          orderBy: { createdAt: "desc" },
          include: { product: true, user: { select: { name: true } } },
        });
      else if (method === "POST") {
        data = await changeStock(
          stockSchema.parse(await request.json()),
          user.id,
        );
        status = 201;
      } else throw new HttpError(404, "ไม่พบเส้นทาง");
    } else if (resource === "dashboard" && method === "GET" && !id)
      data = await getDashboard();
    else if (resource === "users") {
      if (method === "GET" && !id)
        data = await prisma.user.findMany({
          select: safeUser,
          orderBy: { createdAt: "asc" },
        });
      else if (method === "POST" && !id) {
        const input = userSchema.parse(await request.json());
        data = await prisma.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash: await hash(input.password, 12),
            role: "STAFF",
          },
          select: safeUser,
        });
        status = 201;
      } else if (method === "PUT" && id) {
        const input = userUpdateSchema.parse(await request.json());
        data = await prisma.$transaction(async (tx) => {
          const target = await tx.user.findUnique({ where: { id } });
          if (!target) throw new HttpError(404, "ไม่พบผู้ใช้");
          // ต้องเหลือ Admin ที่ใช้งานได้อย่างน้อยหนึ่งบัญชีเสมอ
          if (
            target.role === "ADMIN" &&
            target.isActive &&
            (!input.isActive || input.role !== "ADMIN") &&
            (await tx.user.count({
              where: { role: "ADMIN", isActive: true },
            })) <= 1
          )
            throw new HttpError(
              409,
              "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน",
            );
          return tx.user.update({
            where: { id },
            data: {
              role: input.role,
              isActive: input.isActive,
              // เพิกถอน session เก่าเมื่อเปลี่ยนสิทธิ์ สถานะ หรือรหัสผ่าน
              sessionVersion: { increment: 1 },
              ...(input.password
                ? {
                    passwordHash: await hash(input.password, 12),
                  }
                : {}),
            },
            select: safeUser,
          });
        });
      } else throw new HttpError(404, "ไม่พบเส้นทาง");
    } else throw new HttpError(404, "ไม่พบเส้นทาง");
    return NextResponse.json(
      { success: true, data },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // แปลงข้อผิดพลาดเป็น JSON ภาษาไทย ไม่ส่ง stack trace ให้ browser
    const result = databaseError(error);
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
