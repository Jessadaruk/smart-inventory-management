"use client";
import { Toast } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import { api, type Category } from "./ui/api";
import { Confirm } from "./ui/confirm";
export function Categories({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const load = useCallback(
    () =>
      api<Category[]>("categories")
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>หมวดหมู่สินค้า</h1>
          <p>จัดระเบียบสินค้าให้ง่ายต่อการค้นหา</p>
        </div>
        <span className="badge">{items.length} หมวดหมู่</span>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}
      {isAdmin && (
        <form
          key={editing?.id ?? "new"}
          className="card"
          style={{ marginBottom: 22 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const element = e.currentTarget;
            setBusy(true);
            setError("");
            const form = new FormData(element);
            try {
              await api(
                editing ? `categories/${editing.id}` : "categories",
                editing ? "PUT" : "POST",
                {
                  name: form.get("name"),
                  description: form.get("description"),
                },
              );
              setEditing(null);
              element.reset();
              setNotice("บันทึกหมวดหมู่เรียบร้อยแล้ว");
              await load();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h2>
          <div className="form-grid">
            <div>
              <label htmlFor="name">ชื่อหมวดหมู่ *</label>
              <input
                id="name"
                name="name"
                defaultValue={editing?.name}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor="description">รายละเอียด</label>
              <input
                id="description"
                name="description"
                defaultValue={editing?.description}
                maxLength={500}
              />
            </div>
          </div>
          <div className="form-footer">
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(null)}
              >
                ยกเลิก
              </button>
            )}
            <button disabled={busy}>
              {busy ? "กำลังบันทึก..." : "บันทึกหมวดหมู่"}
            </button>
          </div>
        </form>
      )}
      <div className="card">
        {loading ? (
          <div className="skeleton" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>หมวดหมู่</th>
                  <th>รายละเอียด</th>
                  <th>จำนวนสินค้า (รวมเก็บถาวร)</th>
                  {isAdmin && <th>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.description || "—"}</td>
                    <td>{c._count?.products ?? 0}</td>
                    {isAdmin && (
                      <td>
                        <div className="actions">
                          <button
                            className="secondary"
                            onClick={() => {
                              setEditing(c);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="danger"
                            onClick={() => setDeleting(c)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <div className="empty">ยังไม่มีหมวดหมู่สินค้า</div>
            )}
          </div>
        )}
      </div>
      {deleting && (
        <Confirm
          message={`ลบหมวดหมู่ “${deleting.name}” หรือไม่? หมวดหมู่ที่ยังมีสินค้าจะไม่สามารถลบได้`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            const id = deleting.id;
            setDeleting(null);
            try {
              await api(`categories/${id}`, "DELETE");
              setNotice("ลบหมวดหมู่เรียบร้อยแล้ว");
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
