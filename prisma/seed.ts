import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();
async function seed() {
  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_STAFF_PASSWORD)
    throw new Error("กรุณาตั้งรหัสผ่าน seed ใน .env");
  const admin = await prisma.user.upsert({
    where: { email: "admin@inventory.local" },
    update: {},
    create: {
      name: "ผู้ดูแลระบบ",
      email: "admin@inventory.local",
      role: "ADMIN",
      passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD, 12),
    },
  });
  await prisma.user.upsert({
    where: { email: "staff@inventory.local" },
    update: {},
    create: {
      name: "เจ้าหน้าที่คลัง",
      email: "staff@inventory.local",
      role: "STAFF",
      passwordHash: await hash(process.env.SEED_STAFF_PASSWORD, 12),
    },
  });
  const groups = [
    [
      "อุปกรณ์สำนักงาน",
      "ปากกาลูกลื่น",
      "สมุดบันทึก",
      "กระดาษเอสี่",
      "แฟ้มเอกสาร",
    ],
    ["อุปกรณ์คอมพิวเตอร์", "เมาส์ไร้สาย", "แป้นพิมพ์", "สายแลน", "แฟลชไดรฟ์"],
    ["เครื่องดื่ม", "น้ำดื่ม", "กาแฟสำเร็จรูป", "ชาเขียว", "นมถั่วเหลือง"],
    ["อุปกรณ์ทำความสะอาด", "น้ำยาถูพื้น", "ฟองน้ำ", "ถุงขยะ", "ไม้กวาด"],
    ["อุปกรณ์ไฟฟ้า", "ปลั๊กพ่วง", "หลอดไฟ", "ถ่านอัลคาไลน์", "สายชาร์จ"],
  ];
  for (const [index, group] of groups.entries()) {
    const category = await prisma.category.upsert({
      where: { name: group[0] },
      update: {},
      create: { name: group[0], description: "สินค้าสำหรับสำนักงาน" },
    });
    for (let j = 1; j < group.length; j++) {
      const sku = `INV-${index + 1}0${j}`;
      if (await prisma.product.findUnique({ where: { sku } })) continue;
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sku,
            name: group[j],
            categoryId: category.id,
            price: (index + 1) * 2500 + j * 500,
            quantity: j === 1 ? 3 : 20 + j * 5,
            minStock: 5,
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: admin.id,
            type: "IN",
            quantity: product.quantity,
            beforeQty: 0,
            afterQty: product.quantity,
            note: "ยอดเริ่มต้นสำหรับสาธิต",
          },
        });
      });
    }
  }
  console.log(
    "Seed สำเร็จ: 2 ผู้ใช้ 5 หมวดหมู่ 20 สินค้า (เรียกซ้ำได้โดยไม่รีเซ็ตข้อมูล)",
  );
}
seed().finally(() => prisma.$disconnect());
