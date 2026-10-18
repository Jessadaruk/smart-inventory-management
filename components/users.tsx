"use client";
import { Toast } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import { api } from "./ui/api";
import { Confirm } from "./ui/confirm";
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};
export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [pending, setPending] = useState<{
    id: string;
    role: string;
    isActive: boolean;
    password?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      api<User[]>("users")
        .then(setUsers)
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
          <h1>จัดการผู้ใช้งาน</h1>
          <p>สร้างบัญชีเจ้าหน้าที่และกำหนดสิทธิ์การเข้าถึง</p>
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
        style={{ marginBottom: 22 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const element = e.currentTarget;
          const form = new FormData(element);
          setError("");
          setBusy(true);
          try {
            await api("users", "POST", {
              name: form.get("name"),
              email: form.get("email"),
              password: form.get("password"),
            });
            element.reset();
            setNotice("สร้างบัญชีเจ้าหน้าที่เรียบร้อยแล้ว");
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>สร้างบัญชีเจ้าหน้าที่</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="name">ชื่อ *</label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="email">อีเมล *</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="full">
            <label htmlFor="password">รหัสผ่านเริ่มต้น *</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
            />
            <p className="hint">
              อย่างน้อย 10 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
            </p>
          </div>
        </div>
        <div className="form-footer">
          <button disabled={busy}>
            {busy ? "กำลังบันทึก..." : "สร้างบัญชี"}
          </button>
        </div>
      </form>
      {editing && (
        <form
          key={editing.id}
          className="card"
          style={{ marginBottom: 22 }}
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const password = String(form.get("newPassword"));
            setPending({
              id: editing.id,
              role: String(form.get("role")),
              isActive: form.get("isActive") === "true",
              ...(password ? { password } : {}),
            });
          }}
        >
          <h2>แก้ไขสิทธิ์: {editing.name}</h2>
          <div className="form-grid">
            <div>
              <label htmlFor="role">บทบาท</label>
              <select id="role" name="role" defaultValue={editing.role}>
                <option value="STAFF">เจ้าหน้าที่</option>
                <option value="ADMIN">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div>
              <label htmlFor="isActive">สถานะ</label>
              <select
                id="isActive"
                name="isActive"
                defaultValue={String(editing.isActive)}
              >
                <option value="true">เปิดใช้งาน</option>
                <option value="false">ปิดใช้งาน</option>
              </select>
            </div>
            <div className="full">
              <label htmlFor="newPassword">
                รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
              />
              <p className="hint">
                รีเซ็ตรหัสผ่านแล้ว เซสชันเก่าของบัญชีนี้จะถูกยกเลิก
              </p>
            </div>
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(null)}
            >
              ยกเลิก
            </button>
            <button>บันทึกการเปลี่ยนแปลง</button>
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
                  <th>ชื่อ</th>
                  <th>อีเมล</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "" : "out"}`}>
                        {u.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => setEditing(u)}
                      >
                        แก้ไขสิทธิ์ / รหัสผ่าน
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pending && (
        <Confirm
          message="ยืนยันการเปลี่ยนสิทธิ์ สถานะ หรือรหัสผ่านบัญชีนี้หรือไม่?"
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            const { id, ...body } = pending;
            setPending(null);
            try {
              await api(`users/${id}`, "PUT", body);
              setEditing(null);
              setNotice("แก้ไขผู้ใช้เรียบร้อยแล้ว");
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
