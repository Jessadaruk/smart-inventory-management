import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

// อ่านอย่างเดียว ไม่ seed ไม่แก้บัญชี และไม่เปลี่ยนยอดสินค้า
const db = new PrismaClient();
try {
  const [users, categories, products, movements] = await Promise.all([
    db.user.findMany(),
    db.category.findMany(),
    db.product.findMany(),
    db.stockMovement.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const issues = [];
  for (const product of products) {
    if (product.quantity < 0 || product.price < 0 || product.minStock < 0)
      issues.push(`negative product ${product.id}`);
    const history = movements.filter((m) => m.productId === product.id);
    let previous = 0;
    for (const movement of history) {
      if (movement.beforeQty !== previous)
        issues.push(`broken chain ${movement.id}`);
      if (
        movement.quantity <= 0 ||
        movement.quantity !==
          Math.abs(movement.afterQty - movement.beforeQty) ||
        movement.afterQty < 0
      )
        issues.push(`invalid magnitude ${movement.id}`);
      if (
        (movement.type === "IN" && movement.afterQty <= movement.beforeQty) ||
        (movement.type === "OUT" && movement.afterQty >= movement.beforeQty)
      )
        issues.push(`invalid direction ${movement.id}`);
      if (!users.some((u) => u.id === movement.userId))
        issues.push(`missing actor ${movement.id}`);
      previous = movement.afterQty;
    }
    if (previous !== product.quantity)
      issues.push(`quantity mismatch ${product.id}`);
  }
  const credentials = [];
  for (const [email, password] of [
    ["admin@inventory.local", process.env.SEED_ADMIN_PASSWORD],
    ["staff@inventory.local", process.env.SEED_STAFF_PASSWORD],
  ]) {
    const user = users.find((u) => u.email === email);
    credentials.push({
      email,
      role: user?.role,
      active: user?.isActive,
      passwordMatches:
        !!user && !!password && (await compare(password, user.passwordHash)),
    });
  }
  const snapshot = JSON.stringify({ users, categories, products, movements });
  const report = {
    checkedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      categories: categories.length,
      products: products.length,
      movements: movements.length,
    },
    activeAdmins: users.filter((u) => u.isActive && u.role === "ADMIN").length,
    credentials,
    issues,
    dataFingerprint: crypto.createHash("sha256").update(snapshot).digest("hex"),
  };
  // ส่งออกเฉพาะผลตรวจ ไม่เปิดเผยรหัสผ่านหรือ hash
  const output = process.argv[2];
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
