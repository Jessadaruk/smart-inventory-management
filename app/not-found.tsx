import Link from "next/link";
export default function NotFound() {
  return (
    <main className="content">
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <Link className="button" href="/dashboard">
        กลับสู่ภาพรวม
      </Link>
    </main>
  );
}
