import "dotenv/config";
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// ใช้หลัง start.bat: ตรวจหน้าจอและอ่านข้อมูลจริง ไม่สร้าง/แก้/ลบรายการธุรกิจ
const db = new PrismaClient();
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: "http://localhost:3000" });
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
const results = [];
fs.mkdirSync("docs/final-audit/screenshots", { recursive: true });
try {
  await page.goto("/login");
  await page.screenshot({
    path: "docs/final-audit/screenshots/login.png",
    fullPage: true,
  });
  await page.getByLabel("อีเมล", { exact: true }).fill("admin@inventory.local");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/dashboard");
  const products = await db.product.findMany({ where: { isArchived: false } });
  const response = await context.request.get("/api/dashboard");
  assert.equal(response.status(), 200);
  const dashboard = (await response.json()).data;
  assert.equal(dashboard.totalProducts, products.length);
  assert.equal(
    dashboard.totalValue,
    products.reduce(
      (sum, product) => sum + product.price * product.quantity,
      0,
    ),
  );
  assert.equal(dashboard.totalCategories, await db.category.count());
  assert.equal(
    dashboard.lowStockCount,
    products.filter((product) => product.quantity <= product.minStock).length,
  );
  results.push({
    check: "dashboard matches demo database",
    status: "PASS",
    totalProducts: dashboard.totalProducts,
    totalValueSatang: dashboard.totalValue,
  });
  const firstProduct = products[0];
  const pages = [
    ["/dashboard", "ภาพรวมคลังสินค้า", "dashboard"],
    ["/products", "รายการสินค้า", "products"],
    ["/products/new", "เพิ่มสินค้าใหม่", "new"],
    [`/products/${firstProduct.id}/edit`, "แก้ไขสินค้า", "edit"],
    ["/categories", "หมวดหมู่สินค้า", "categories"],
    ["/stock", "จัดการสต็อก", "stock"],
    ["/users", "จัดการผู้ใช้งาน", "users"],
    ["/unauthorized", "ไม่สามารถเข้าถึงหน้านี้", "unauthorized"],
    ["/page-does-not-exist", "ไม่พบหน้าที่ต้องการ", "not-found"],
  ];
  for (const [url, heading, screenshot] of pages) {
    await page.goto(url);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    if (["products", "categories", "stock", "users"].includes(screenshot))
      await page.getByRole("table").waitFor();
    // รอข้อมูลฟอร์มจริง ไม่ถ่ายภาพ skeleton ที่ปรากฏก่อน API ตอบ
    if (["new", "edit"].includes(screenshot))
      await page.locator("input#sku").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/final-audit/screenshots/${screenshot}.png`,
      fullPage: true,
    });
    assert.equal(await page.locator("html").getAttribute("lang"), "th");
    results.push({ page: url, thaiHeading: heading, status: "PASS" });
  }
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("อีเมล", { exact: true }).fill("staff@inventory.local");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_STAFF_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/dashboard");
  assert.equal((await context.request.get("/api/users")).status(), 403);
  await page.goto("/users");
  await page.waitForURL("**/unauthorized");
  results.push({
    check: "demo Staff login and user access forbidden",
    status: "PASS",
  });
  assert.deepEqual(runtimeErrors, []);
  results.push({
    check: "browser runtime errors",
    status: "PASS",
    errors: runtimeErrors,
  });
  const report = { checkedAt: new Date().toISOString(), results };
  fs.writeFileSync(
    "docs/final-audit/presentation-smoke.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
  await db.$disconnect();
}
