"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, type Product, type Category } from "@/components/ui/api";
import { productSchema, updateProductSchema } from "@/lib/validations";
export function ProductForm({ id }: { id?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Category[]>("categories"),
      id ? api<Product>(`products/${id}`) : Promise.resolve(null),
    ])
      .then(([c, p]) => {
        setCategories(c);
        setProduct(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);
  // แยกขั้นตอนบันทึกออกจาก JSX เพื่อไล่อธิบายได้ทีละขั้น
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const price = String(form.get("price"));
    const input = {
      sku: form.get("sku"),
      name: form.get("name"),
      description: form.get("description"),
      categoryId: form.get("categoryId"),
      price: /^\d+(\.\d{1,2})?$/.test(price)
        ? Math.round(Number(price) * 100)
        : NaN,
      minStock:
        form.get("minStock") === "" ? NaN : Number(form.get("minStock")),
      ...(!id
        ? {
            quantity:
              form.get("quantity") === "" ? NaN : Number(form.get("quantity")),
          }
        : {}),
    };
    const parsed = (id ? updateProductSchema : productSchema).safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" • "));
      setBusy(false);
      return;
    }
    try {
      await api(
        id ? `products/${id}` : "products",
        id ? "PUT" : "POST",
        parsed.data,
      );
      // ส่งข้อความสำเร็จไปแสดงหลังกลับสู่หน้ารายการ
      sessionStorage.setItem(
        "inventory-notice",
        id ? "แก้ไขสินค้าเรียบร้อยแล้ว" : "เพิ่มสินค้าเรียบร้อยแล้ว",
      );
      window.location.href = "/products";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h1>
          <p>กรอกข้อมูลสินค้าให้ครบถ้วนก่อนบันทึก</p>
        </div>
        <Link href="/products" className="button secondary">
          กลับสู่รายการ
        </Link>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {loading ? (
        <div className="skeleton" />
      ) : (
        (!id || product) && (
          <form
            className="card"
            style={{ maxWidth: 900 }}
            onSubmit={handleSubmit}
          >
            <h2>ข้อมูลทั่วไป</h2>
            <div className="form-grid">
              <div>
                <label htmlFor="sku">รหัสสินค้า *</label>
                <input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku}
                  required
                  maxLength={50}
                  placeholder="เช่น INV-001"
                />
              </div>
              <div>
                <label htmlFor="name">ชื่อสินค้า *</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={product?.name}
                  required
                  minLength={2}
                  maxLength={150}
                />
              </div>
              <div className="full">
                <label htmlFor="description">รายละเอียด</label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description}
                  maxLength={1000}
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="categoryId">หมวดหมู่สินค้า *</label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={product?.categoryId ?? ""}
                  required
                >
                  <option value="" disabled>
                    เลือกหมวดหมู่
                  </option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="price">ราคา (บาท) *</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  max="1000000"
                  defaultValue={product ? product.price / 100 : undefined}
                />
              </div>
              {!id ? (
                <div>
                  <label htmlFor="quantity">จำนวนเริ่มต้น *</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    required
                    min="0"
                    step="1"
                  />
                </div>
              ) : (
                <div>
                  <label>จำนวนคงเหลือ</label>
                  <input disabled value={product?.quantity ?? 0} />
                  <p className="hint">
                    เปลี่ยนยอดผ่านหน้า{" "}
                    <Link href="/stock" style={{ color: "#2563eb" }}>
                      จัดการสต็อก
                    </Link>{" "}
                    เพื่อบันทึกประวัติ
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="minStock">จุดแจ้งเตือนสินค้าใกล้หมด *</label>
                <input
                  id="minStock"
                  name="minStock"
                  type="number"
                  required
                  min="0"
                  step="1"
                  defaultValue={product?.minStock ?? 5}
                />
              </div>
            </div>
            <div className="form-footer">
              <Link href="/products" className="button secondary">
                ยกเลิก
              </Link>
              <button disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึกสินค้า"}
              </button>
            </div>
          </form>
        )
      )}
    </>
  );
}
