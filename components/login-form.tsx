"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Boxes, ArrowRight, LoaderCircle } from "lucide-react";
export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <section className="login-art">
        <Boxes size={65} />
        <h1>
          ทุกสินค้า ทุกความเคลื่อนไหว
          <br />
          จัดการได้ในที่เดียว
        </h1>
        <p>
          ติดตามยอดคงเหลือ ดูแลคลังสินค้า และทำงานร่วมกัน
          <br />
          ด้วยระบบจัดการคลังสินค้าอัจฉริยะ
        </p>
        <div style={{ marginTop: 70, color: "#bdd0f7" }}>
          โครงงานระบบคลังสินค้า • พัฒนาเพื่อการศึกษา
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <span className="badge">ยินดีต้อนรับกลับ</span>
          <h1 style={{ marginTop: 20 }}>เข้าสู่ระบบ</h1>
          <p className="muted">กรอกบัญชีของคุณเพื่อเริ่มจัดการคลังสินค้า</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              try {
                const result = await signIn("credentials", {
                  email: form.get("email"),
                  password: form.get("password"),
                  redirect: false,
                });
                if (result?.error)
                  setError(
                    "อีเมลหรือรหัสผ่านไม่ถูกต้อง บัญชีถูกปิด หรือพยายามเกินกำหนด (รอ 15 นาที)",
                  );
                else window.location.href = "/dashboard";
              } catch {
                setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label htmlFor="email">อีเมล</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="กรอกอีเมลของคุณ"
              />
            </div>
            <div>
              <label htmlFor="password">รหัสผ่าน</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                maxLength={72}
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
              />
            </div>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <button disabled={busy}>
              {busy ? <LoaderCircle size={18} /> : <ArrowRight size={18} />}{" "}
              {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
          <p className="hint" style={{ marginTop: 25 }}>
            บัญชีผู้ใช้สร้างโดยผู้ดูแลระบบเท่านั้น
            <br />
            หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </section>
    </div>
  );
}
