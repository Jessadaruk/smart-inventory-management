import Link from "next/link";
export default function Unauthorized() {
  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <div className="card">
        <h1>ไม่สามารถเข้าถึงหน้านี้</h1>
        <p>บัญชีของคุณไม่มีสิทธิ์ใช้งานส่วนนี้</p>
        <Link className="button" href="/dashboard">
          กลับสู่ภาพรวม
        </Link>
      </div>
    </main>
  );
}
