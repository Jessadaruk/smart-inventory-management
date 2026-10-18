"use client";
import { Toast } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { api, type Product, type Category } from "@/components/ui/api";
import { Confirm } from "@/components/ui/confirm";
import { money } from "@/lib/format";
export function ProductList({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [low, setLow] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);
  useEffect(() => {
    const message = sessionStorage.getItem("inventory-notice");
    if (message) {
      setNotice(message);
      sessionStorage.removeItem("inventory-notice");
    }
  }, []);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setBusy(true);
      setError("");
      try {
        const result = await api<{ items: Product[]; total: number }>(
          `products?${new URLSearchParams({ search, categoryId: category, lowStock: low, page: String(page) })}`,
          "GET",
          undefined,
          signal,
        );
        if (signal?.aborted) return;
        setItems(result.items);
        setTotal(result.total);
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [search, category, low, page],
  );
  useEffect(() => {
    // เมื่อเปลี่ยนคำค้น ยกเลิกคำขอเดิม ไม่ให้ผลลัพธ์เก่าทับผลลัพธ์ใหม่
    const controller = new AbortController();
    const timer = setTimeout(() => load(controller.signal), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  useEffect(() => {
    api<Category[]>("categories")
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>รายการสินค้า</h1>
          <p>จัดการข้อมูลสินค้าและตรวจสอบยอดคงเหลือทั้งหมด</p>
        </div>
        <Link className="button" href="/products/new">
          <Plus size={17} />
          เพิ่มสินค้า
        </Link>
      </div>
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
      {error && (
        <div role="alert" className="error">
          {error} <button onClick={() => load()}>ลองใหม่</button>
        </div>
      )}
      <div className="card">
        <div className="toolbar">
          <div style={{ position: "relative", flex: 2 }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: 12,
                top: 14,
                color: "#8b97aa",
              }}
            />
            <input
              aria-label="ค้นหาสินค้า"
              style={{ paddingLeft: 38 }}
              placeholder="ค้นหาชื่อสินค้า หรือรหัสสินค้า..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="กรองหมวดหมู่"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="กรองสถานะสต็อก"
            value={low}
            onChange={(e) => {
              setLow(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ทุกสถานะสต็อก</option>
            <option value="true">สินค้าใกล้หมด</option>
          </select>
        </div>
        {busy ? (
          <div className="skeleton" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อสินค้า</th>
                  <th>หมวดหมู่</th>
                  <th>ราคา / หน่วย</th>
                  <th>คงเหลือ</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="sku">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category.name}</td>
                    <td>{money(p.price)}</td>
                    <td>{p.quantity}</td>
                    <td>
                      <span
                        className={`badge ${p.quantity === 0 ? "out" : p.quantity <= p.minStock ? "low" : ""}`}
                      >
                        {p.quantity === 0
                          ? "สินค้าหมด"
                          : p.quantity <= p.minStock
                            ? "ใกล้หมด"
                            : "พร้อมใช้งาน"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link
                          className="button secondary"
                          href={`/products/${p.id}/edit`}
                        >
                          <Pencil size={13} />
                          แก้ไข
                        </Link>
                        {isAdmin && (
                          <button
                            className="danger"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 size={13} />
                            ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="empty">ไม่พบสินค้าตามเงื่อนไขที่เลือก</div>
            )}
          </div>
        )}
        <div className="pagination">
          <span>
            ทั้งหมด {total} รายการ • หน้า {page} /{" "}
            {Math.max(1, Math.ceil(total / 10))}
          </span>
          <div className="actions">
            <button
              className="secondary"
              disabled={page === 1 || busy}
              onClick={() => setPage(page - 1)}
            >
              ก่อนหน้า
            </button>
            <button
              className="secondary"
              disabled={page * 10 >= total || busy}
              onClick={() => setPage(page + 1)}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
      {deleting && (
        <Confirm
          message={`ลบ “${deleting.name}” หรือไม่? หากสินค้ามีประวัติสต็อก ระบบจะเก็บถาวรและซ่อนจากรายการ โดยยังคงประวัติไว้`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const target = deleting;
            setDeleting(null);
            try {
              const result = await api<{ archived: boolean }>(
                `products/${target.id}`,
                "DELETE",
              );
              setNotice(
                result.archived
                  ? "เก็บสินค้าเป็นข้อมูลถาวรแล้ว ประวัติยังคงอยู่"
                  : "ลบสินค้าเรียบร้อยแล้ว",
              );
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
    </>
  );
}
