"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card">
      <h1>ไม่สามารถโหลดข้อมูลได้</h1>
      <p>กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่</p>
      <button onClick={reset}>ลองอีกครั้ง</button>
    </div>
  );
}
