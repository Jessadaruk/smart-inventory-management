"use client";
import { Toast } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import { api, type Product } from "./ui/api";
import { dateTime, movementName } from "@/lib/format";
type Movement = {
  id: string;
  product: Product;
  user: { name: string };
  type: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  createdAt: string;
  note: string;
};
export function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("IN");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      let page = 1;
      let all: Product[] = [];
      while (true) {
        const result = await api<{ items: Product[]; total: number }>(
          `products?pageSize=100&page=${page}`,
        );
        all = all.concat(result.items);
        if (all.length >= result.total) break;
        page++;
      }
      setProducts(all);
      setMovements(await api<Movement[]>("stock"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>จัดการสต็อก</h1>
          <p>รับเข้า เบิกออก และปรับยอด พร้อมบันทึกประวัติทุกครั้ง</p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
      <form
        className="card"
        style={{ marginBottom: 23 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const element = e.currentTarget;
          setBusy(true);
          setError("");
          setNotice("");
          try {
            await api("stock", "POST", {
              productId,
              type,
              quantity:
                form.get("quantity") === ""
                  ? null
                  : Number(form.get("quantity")),
              note: form.get("note"),
            });
            setNotice("บันทึกความเคลื่อนไหวเรียบร้อยแล้ว");
            element.reset();
            setProductId("");
            setType("IN");
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>บันทึกความเคลื่อนไหว</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="productId">สินค้า *</label>
            <select
              id="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">เลือกสินค้า</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (เหลือ {p.quantity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type">ประเภท *</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="IN">รับเข้า</option>
              <option value="OUT">เบิกออก</option>
              <option value="ADJUST">ปรับยอด</option>
            </select>
          </div>
          <div>
            <label htmlFor="quantity">
              {type === "ADJUST" ? "ยอดคงเหลือใหม่" : "จำนวน"} *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={type === "ADJUST" ? 0 : 1}
              max={100000000}
              step="1"
              required
            />
            <p className="hint">
              {type === "ADJUST"
                ? "ระบุยอดใหม่ทั้งหมด ระบบจะบันทึกส่วนต่างอัตโนมัติ"
                : "จำนวนต้องเป็นจำนวนเต็มบวก และเบิกได้ไม่เกินคงเหลือ"}
            </p>
          </div>
          <div>
            <label htmlFor="note">หมายเหตุ / เหตุผล *</label>
            <input id="note" name="note" required maxLength={500} />
          </div>
        </div>
        <div className="form-footer">
          <button disabled={busy || loading}>
            {busy ? "กำลังบันทึก..." : "บันทึกความเคลื่อนไหว"}
          </button>
        </div>
      </form>
      <div className="card">
        <h2>ประวัติความเคลื่อนไหวล่าสุด 100 รายการ</h2>
        {loading ? (
          <div className="skeleton" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>วัน / เวลา</th>
                  <th>สินค้า</th>
                  <th>ประเภท</th>
                  <th>จำนวน</th>
                  <th>ก่อน → หลัง</th>
                  <th>ผู้ดำเนินการ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{dateTime(m.createdAt)}</td>
                    <td>
                      {m.product.name}
                      <div className="sku">{m.product.sku}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${m.type === "OUT" ? "low" : ""}`}
                      >
                        {movementName(m.type)}
                      </span>
                    </td>
                    <td>{m.quantity}</td>
                    <td>
                      {m.beforeQty} → {m.afterQty}
                    </td>
                    <td>{m.user.name}</td>
                    <td>{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movements.length && (
              <div className="empty">ยังไม่มีความเคลื่อนไหว</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
