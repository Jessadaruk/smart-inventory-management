import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function login(
  request: APIRequestContext,
  email = "admin@inventory.local",
  password = process.env.SEED_ADMIN_PASSWORD ?? "AdminDemo!2026",
) {
  const csrf = await (await request.get("/api/auth/csrf")).json();
  return request.post("/api/auth/callback/credentials", {
    form: {
      email,
      password,
      csrfToken: csrf.csrfToken,
      json: "true",
      callbackUrl: "http://localhost:3000/dashboard",
    },
  });
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("11 Browser: ตัวกรอง แบ่งหน้า คำค้นเก่าไม่ทับคำค้นใหม่ และ error ภาษาไทย", async ({
  page,
}) => {
  await login(page.request);
  await page.goto("/products");
  await expect(
    page.getByRole("cell", { name: "INV-504", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("หน้า 2 / 2");
  await page.getByLabel("กรองสถานะสต็อก").selectOption("true");
  await expect(page.locator(".pagination")).toContainText("ทั้งหมด 5 รายการ");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  const categories = (await (await page.request.get("/api/categories")).json())
    .data;
  const office = categories.find(
    (category: { name: string }) => category.name === "อุปกรณ์สำนักงาน",
  );
  await page.getByLabel("กรองหมวดหมู่").selectOption(office.id);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("cell", { name: "INV-101", exact: true }),
  ).toBeVisible();
  await page.getByLabel("กรองหมวดหมู่").selectOption("");
  await page.getByLabel("กรองสถานะสต็อก").selectOption("");
  await expect(page.locator("tbody tr")).toHaveCount(10);

  let markOldRequest: () => void = () => {};
  const oldRequestStarted = new Promise<void>((resolve) => {
    markOldRequest = resolve;
  });
  let markOldResponse: () => void = () => {};
  const oldResponseFinished = new Promise<void>((resolve) => {
    markOldResponse = resolve;
  });
  await page.route("**/api/products?**", async (route) => {
    const response = await route.fetch();
    if (new URL(route.request().url()).searchParams.get("search") === "INV") {
      markOldRequest();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ response }).catch(() => {});
      markOldResponse();
    } else await route.fulfill({ response });
  });
  await page.getByLabel("ค้นหาสินค้า").fill("INV");
  await oldRequestStarted;
  await page.getByLabel("ค้นหาสินค้า").fill("INV-101");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await oldResponseFinished;
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("cell", { name: "INV-101", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/products?**");
  await page.getByLabel("ค้นหาสินค้า").fill("ไม่มีสินค้านี้แน่นอน");
  await expect(page.getByText("ไม่พบสินค้าตามเงื่อนไขที่เลือก")).toBeVisible();
  await page.route("**/api/products?**", (route) => route.abort());
  await page.getByLabel("ค้นหาสินค้า").fill("NETWORK");
  await expect(page.locator(".error")).toContainText("เชื่อมต่อระบบไม่ได้");
  await page.unroute("**/api/products?**");
  await page.route("**/api/products?**", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "bad gateway",
    }),
  );
  await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();
  await expect(page.locator(".error")).toContainText("ระบบส่งข้อมูลไม่ถูกต้อง");
});
test("01 ผู้ไม่เข้าสู่ระบบถูกปฏิเสธ API และหน้าป้องกัน", async ({
  request,
}) => {
  expect((await request.get("/api/products")).status()).toBe(401);
  const page = await request.get("/products");
  expect(page.url()).toContain("/login");
});
test("02 รหัสผ่านผิดเข้าสู่ระบบไม่ได้", async ({ request }) => {
  await login(request, "admin@inventory.local", "WrongPassword123");
  expect((await request.get("/api/products")).status()).toBe(401);
});
test("03 CRUD, validation, search, filter, audit, concurrency และ dashboard", async ({
  request,
}) => {
  await login(request);
  expect((await request.get("/api/products")).status()).toBe(200);
  const categories = (await (await request.get("/api/categories")).json()).data;
  const input = {
    sku: `TEST-${Date.now()}`,
    name: "สินค้าทดสอบอัตโนมัติ",
    description: "ทดสอบครบวงจร",
    price: 12550,
    quantity: 10,
    minStock: 5,
    categoryId: categories[0].id,
  };
  for (const invalid of [
    { ...input, price: -1 },
    { ...input, quantity: -1 },
    { ...input, price: "" },
    { ...input, quantity: undefined },
    { ...input, categoryId: "missing" },
  ])
    expect(
      (await request.post("/api/products", { data: invalid })).status(),
    ).toBe(400);
  const response = await request.post("/api/products", { data: input });
  expect(response.status()).toBe(201);
  const product = (await response.json()).data;
  try {
    expect(
      await db.product.findUnique({ where: { id: product.id } }),
    ).toMatchObject({ quantity: 10, price: 12550 });
    expect(
      (await request.post("/api/products", { data: input })).status(),
    ).toBe(409);
    expect(
      (await (await request.get(`/api/products/${product.id}`)).json()).data
        .sku,
    ).toBe(input.sku);
    const { quantity: initialQuantity, ...updated } = input;
    expect(initialQuantity).toBe(10);
    updated.name = "สินค้าแก้ไขแล้ว";
    expect(
      (
        await request.put(`/api/products/${product.id}`, { data: updated })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.put(`/api/products/${product.id}`, {
          data: { ...updated, quantity: 900 },
        })
      ).status(),
    ).toBe(400);
    const search = (
      await (await request.get(`/api/products?search=${input.sku}`)).json()
    ).data;
    expect(search.total).toBe(1);
    const filtered = (
      await (
        await request.get(`/api/products?categoryId=${input.categoryId}`)
      ).json()
    ).data;
    expect(
      filtered.items.every(
        (p: { categoryId: string }) => p.categoryId === input.categoryId,
      ),
    ).toBeTruthy();
    const low = (
      await (await request.get("/api/products?lowStock=true")).json()
    ).data;
    expect(
      low.items.every(
        (p: { quantity: number; minStock: number }) => p.quantity <= p.minStock,
      ),
    ).toBeTruthy();
    const stock = {
      productId: product.id,
      type: "OUT",
      quantity: 11,
      note: "ทดสอบยอดไม่เพียงพอ",
    };
    expect((await request.post("/api/stock", { data: stock })).status()).toBe(
      409,
    );
    const results = await Promise.all([
      request.post("/api/stock", { data: { ...stock, quantity: 7 } }),
      request.post("/api/stock", { data: { ...stock, quantity: 7 } }),
    ]);
    expect(results.filter((r) => r.status() === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status() === 409)).toHaveLength(1);
    const saved = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(saved.quantity).toBe(3);
    const movements = await db.stockMovement.findMany({
      where: { productId: product.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    expect(movements).toHaveLength(2);
    expect(movements[1]).toMatchObject({
      beforeQty: 10,
      afterQty: 3,
      quantity: 7,
    });
    expect(movements[1].user.email).toBe("admin@inventory.local");
    expect(
      (
        await request.post("/api/stock", {
          data: { ...stock, type: "IN", quantity: 2 },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await request.post("/api/stock", {
          data: { ...stock, type: "ADJUST", quantity: 4 },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await request.post("/api/stock", {
          data: { ...stock, type: "ADJUST", quantity: 4 },
        })
      ).status(),
    ).toBe(400);
    const dashboard = (await (await request.get("/api/dashboard")).json()).data;
    const products = await db.product.findMany({
      where: { isArchived: false },
    });
    expect(dashboard.totalProducts).toBe(products.length);
    expect(dashboard.totalValue).toBe(
      products.reduce((s, p) => s + p.price * p.quantity, 0),
    );
    expect(dashboard.lowStockCount).toBe(
      products.filter((p) => p.quantity <= p.minStock).length,
    );
    expect(
      (await request.delete(`/api/categories/${input.categoryId}`)).status(),
    ).toBe(409);
    expect((await request.delete(`/api/products/${product.id}`)).status()).toBe(
      200,
    );
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .isArchived,
    ).toBe(true);
    expect((await request.get(`/api/products/${product.id}`)).status()).toBe(
      404,
    );
    expect(
      await db.stockMovement.count({ where: { productId: product.id } }),
    ).toBe(4);
  } finally {
    await db.stockMovement.deleteMany({ where: { productId: product.id } });
    await db.product.deleteMany({ where: { id: product.id } });
  }
});
test("04 Staff เข้าระบบได้และไม่มีสิทธิ์ลบสินค้า จัดการหมวดหมู่หรือผู้ใช้", async ({
  request,
}) => {
  await login(
    request,
    "staff@inventory.local",
    process.env.SEED_STAFF_PASSWORD ?? "StaffDemo!2026",
  );
  expect((await request.get("/api/products")).status()).toBe(200);
  expect((await request.delete("/api/products/anything")).status()).toBe(403);
  expect(
    (
      await request.post("/api/categories", { data: { name: "ไม่อนุญาต" } })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/users")).status()).toBe(403);
  // App Router อาจส่ง redirect ผ่าน HTML stream ให้ browser ดำเนินการต่อ
  expect(await (await request.get("/users")).text()).toContain("/unauthorized");
});
test("05 หมวดหมู่ CRUD และลบสินค้าที่ไม่มีประวัติ", async ({ request }) => {
  await login(request);
  const c = await request.post("/api/categories", {
    data: { name: `หมวดทดสอบ-${Date.now()}`, description: "" },
  });
  expect(c.status()).toBe(201);
  const category = (await c.json()).data;
  expect(
    (
      await request.put(`/api/categories/${category.id}`, {
        data: { name: category.name + "แก้ไข", description: "แก้ไขแล้ว" },
      })
    ).status(),
  ).toBe(200);
  const p = await request.post("/api/products", {
    data: {
      sku: `ZERO-${Date.now()}`,
      name: "สินค้ายอดศูนย์",
      description: "",
      categoryId: category.id,
      price: 0,
      quantity: 0,
      minStock: 0,
    },
  });
  const product = (await p.json()).data;
  expect((await request.delete(`/api/products/${product.id}`)).status()).toBe(
    200,
  );
  expect(await db.product.findUnique({ where: { id: product.id } })).toBeNull();
  expect(
    (await request.delete(`/api/categories/${category.id}`)).status(),
  ).toBe(200);
});
test("06 ผู้ใช้: ป้องกัน Admin คนสุดท้าย และรีเซ็ตรหัสผ่านเพิกถอนเซสชัน", async ({
  request,
  playwright,
}) => {
  await login(request);
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "admin@inventory.local" },
  });
  expect(
    (
      await request.put(`/api/users/${admin.id}`, {
        data: { role: "STAFF", isActive: true },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.put(`/api/users/${admin.id}`, {
        data: { role: "ADMIN", isActive: false },
      })
    ).status(),
  ).toBe(409);
  const email = `test-${Date.now()}@inventory.local`;
  const response = await request.post("/api/users", {
    data: { name: "ทดสอบผู้ใช้", email, password: "TestPassword2026" },
  });
  expect(response.status()).toBe(201);
  expect(
    (
      await request.post("/api/users", {
        data: {
          name: "ทดสอบรหัสผ่าน",
          email: `bytes-${Date.now()}@inventory.local`,
          password: "Ab1" + "ก".repeat(30),
        },
      })
    ).status(),
  ).toBe(400);
  const user = (await response.json()).data;
  expect(user.passwordHash).toBeUndefined();
  const staff = await playwright.request.newContext({
    baseURL: "http://localhost:3000",
  });
  try {
    await login(staff, email, "TestPassword2026");
    expect((await staff.get("/api/products")).status()).toBe(200);
    expect(
      (
        await request.put(`/api/users/${user.id}`, {
          data: {
            role: "STAFF",
            isActive: true,
            password: "ChangedPassword2026",
          },
        })
      ).status(),
    ).toBe(200);
    expect((await staff.get("/api/products")).status()).toBe(401);
    await login(staff, email, "ChangedPassword2026");
    expect((await staff.get("/api/products")).status()).toBe(200);
    await request.put(`/api/users/${user.id}`, {
      data: { role: "STAFF", isActive: false },
    });
    expect((await staff.get("/api/products")).status()).toBe(401);
  } finally {
    await staff.dispose();
    await db.user.delete({ where: { id: user.id } });
  }
});
test("07 Browser: login, refresh, สินค้าใน UI, ค้นหา, เพิ่ม แก้ไข ลบ และ logout", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("อีเมล", { exact: true }).fill("admin@inventory.local");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("WrongPassword123");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "ไม่ถูกต้อง",
  );
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD ?? "AdminDemo!2026");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมคลังสินค้า" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "รายการสินค้า", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/products.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "เพิ่มสินค้า", exact: true }).click();
  const sku = `UI-${Date.now()}`;
  try {
    await page.getByLabel("รหัสสินค้า *", { exact: true }).fill(sku);
    await page
      .getByLabel("ชื่อสินค้า *", { exact: true })
      .fill("สินค้าทดสอบหน้าจอ");
    await page
      .getByLabel("หมวดหมู่สินค้า *", { exact: true })
      .selectOption({ index: 1 });
    await page.getByLabel("ราคา (บาท) *", { exact: true }).fill("99.50");
    await page.getByLabel("จำนวนเริ่มต้น *", { exact: true }).fill("0");
    await page
      .getByRole("button", { name: "บันทึกสินค้า", exact: true })
      .click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("status")).toContainText(
      "เพิ่มสินค้าเรียบร้อยแล้ว",
    );
    await page.getByLabel("ค้นหาสินค้า").fill(sku);
    await expect(
      page.getByRole("cell", { name: sku, exact: true }),
    ).toBeVisible();
    const productRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: sku, exact: true }) });
    await productRow.getByRole("link", { name: "แก้ไข", exact: true }).click();
    await page
      .getByLabel("ชื่อสินค้า *", { exact: true })
      .fill("สินค้าแก้ไขผ่านหน้าจอ");
    await page
      .getByRole("button", { name: "บันทึกสินค้า", exact: true })
      .click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("status")).toContainText(
      "แก้ไขสินค้าเรียบร้อยแล้ว",
    );
    await page.getByLabel("ค้นหาสินค้า").fill(sku);
    await expect(
      page.getByRole("cell", { name: "สินค้าแก้ไขผ่านหน้าจอ", exact: true }),
    ).toBeVisible();
    await productRow.getByRole("button", { name: "ลบ", exact: true }).click();
    await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "ลบสินค้าเรียบร้อยแล้ว",
    );
    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/login/);
    expect((await page.request.get("/api/products")).status()).toBe(401);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  } finally {
    await db.product.deleteMany({ where: { sku } });
  }
});
test("08 Browser: Staff และหน้าจอมือถือ", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill("staff@inventory.local");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_STAFF_PASSWORD ?? "StaffDemo!2026");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/products");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ลบ", exact: true }),
  ).toHaveCount(0);
  await page.goto("/users");
  await expect(page).toHaveURL(/unauthorized/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "ภาพรวมคลังสินค้า" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
});
test("09 Browser: หมวดหมู่ สต็อก และผู้ใช้ทำงานจริง ไม่มี runtime error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("อีเมล", { exact: true }).fill("admin@inventory.local");
  await page
    .getByLabel("รหัสผ่าน", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD ?? "AdminDemo!2026");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  const stamp = Date.now();
  const categoryName = `หมวดหน้าจอ-${stamp}`;
  await page.goto("/categories");
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/categories.png",
    fullPage: true,
  });
  await page.getByLabel("ชื่อหมวดหมู่ *", { exact: true }).fill(categoryName);
  await page
    .getByRole("button", { name: "บันทึกหมวดหมู่", exact: true })
    .click();
  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: categoryName, exact: true }),
  });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "แก้ไข", exact: true }).click();
  await page.getByLabel("รายละเอียด", { exact: true }).fill("ทดสอบแก้ไข");
  await page
    .getByRole("button", { name: "บันทึกหมวดหมู่", exact: true })
    .click();
  await expect(row).toContainText("ทดสอบแก้ไข");
  await row.getByRole("button", { name: "ลบ", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
  await expect(row).toHaveCount(0);
  const category = await db.category.findFirstOrThrow();
  const response = await page.request.post("/api/products", {
    data: {
      sku: `FLOW-${stamp}`,
      name: "ทดสอบสต็อกหน้าจอ",
      description: "",
      price: 100,
      quantity: 5,
      minStock: 2,
      categoryId: category.id,
    },
  });
  const product = (await response.json()).data;
  try {
    await page.goto("/stock");
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/stock.png",
      fullPage: true,
    });
    await page.getByLabel("สินค้า *", { exact: true }).selectOption(product.id);
    await page.getByLabel("ประเภท *", { exact: true }).selectOption("OUT");
    await page.getByLabel("จำนวน *", { exact: true }).fill("2");
    await page
      .getByLabel("หมายเหตุ / เหตุผล *", { exact: true })
      .fill("เบิกผ่านหน้าจอ");
    await page
      .getByRole("button", { name: "บันทึกความเคลื่อนไหว", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("เรียบร้อย");
    await expect(
      page.getByRole("row").filter({
        has: page.getByRole("cell", { name: "เบิกผ่านหน้าจอ", exact: true }),
      }),
    ).toContainText("5 → 3");
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
        .quantity,
    ).toBe(3);
    await page.getByLabel("สินค้า *", { exact: true }).selectOption(product.id);
    await page.getByLabel("ประเภท *", { exact: true }).selectOption("OUT");
    await page.getByLabel("จำนวน *", { exact: true }).fill("999");
    await page
      .getByLabel("หมายเหตุ / เหตุผล *", { exact: true })
      .fill("ทดสอบปฏิเสธ");
    await page
      .getByRole("button", { name: "บันทึกความเคลื่อนไหว", exact: true })
      .click();
    await expect(page.locator(".error")).toContainText("ไม่เพียงพอ");
  } finally {
    await db.stockMovement.deleteMany({ where: { productId: product.id } });
    await db.product.delete({ where: { id: product.id } });
  }
  const email = `ui-user-${stamp}@inventory.local`;
  try {
    await page.goto("/users");
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/users.png",
      fullPage: true,
    });
    await page
      .getByLabel("ชื่อ *", { exact: true })
      .fill("เจ้าหน้าที่ทดสอบหน้าจอ");
    await page.getByLabel("อีเมล *", { exact: true }).fill(email);
    await page
      .getByLabel("รหัสผ่านเริ่มต้น *", { exact: true })
      .fill("UiPassword2026");
    await page.getByRole("button", { name: "สร้างบัญชี", exact: true }).click();
    const userRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: email, exact: true }) });
    await expect(userRow).toBeVisible();
    await userRow
      .getByRole("button", { name: "แก้ไขสิทธิ์ / รหัสผ่าน", exact: true })
      .click();
    await page.getByLabel("สถานะ", { exact: true }).selectOption("false");
    await page
      .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
      .click();
    await page.getByRole("button", { name: "ยืนยัน", exact: true }).click();
    await expect(userRow).toContainText("ปิดใช้งาน");
  } finally {
    await db.user.deleteMany({ where: { email } });
  }
  expect(errors).toEqual([]);
});
test("10 API: query ผิด, JSON ผิด, ข้าม origin, ไม่พบรายการ และ Staff เพิ่มแก้สินค้า", async ({
  request,
}) => {
  await login(request);
  expect((await request.get("/api/products?page=abc")).status()).toBe(400);
  expect((await request.get("/api/products?lowStock=wrong")).status()).toBe(
    400,
  );
  expect(
    (
      await request.post("/api/products", {
        data: "{wrong",
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/products", {
        data: {},
        headers: { Origin: "https://example.com" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/products/not-found")).status()).toBe(404);
  const categories = (await (await request.get("/api/categories")).json()).data;
  await login(
    request,
    "staff@inventory.local",
    process.env.SEED_STAFF_PASSWORD ?? "StaffDemo!2026",
  );
  const input = {
    sku: `STAFF-${Date.now()}`,
    name: "เจ้าหน้าที่เพิ่มสินค้า",
    description: "",
    price: 100,
    quantity: 0,
    minStock: 1,
    categoryId: categories[0].id,
  };
  const response = await request.post("/api/products", { data: input });
  expect(response.status()).toBe(201);
  const product = (await response.json()).data;
  try {
    const { quantity, ...updated } = input;
    expect(quantity).toBe(0);
    expect(
      (
        await request.put(`/api/products/${product.id}`, {
          data: { ...updated, name: "เจ้าหน้าที่แก้สินค้า" },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await db.product.delete({ where: { id: product.id } });
  }
});
