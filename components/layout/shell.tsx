"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Boxes,
  LayoutDashboard,
  Package,
  Tags,
  ArrowLeftRight,
  Users,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
const links = [
  ["/dashboard", "ภาพรวม", LayoutDashboard],
  ["/products", "รายการสินค้า", Package],
  ["/categories", "หมวดหมู่สินค้า", Tags],
  ["/stock", "จัดการสต็อก", ArrowLeftRight],
  ["/users", "จัดการผู้ใช้งาน", Users],
] as const;
export function Shell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" href="/dashboard">
          <Boxes />
          <span>
            คลังอัจฉริยะ<small>ระบบจัดการสินค้าคงคลัง</small>
          </span>
        </Link>
        <div className="nav-label">พื้นที่ทำงาน</div>
        <nav>
          {links
            .filter((l) => l[0] !== "/users" || user.role === "ADMIN")
            .map(([href, label, Icon]) => (
              <Link
                onClick={() => setOpen(false)}
                className={path.startsWith(href) ? "active" : ""}
                href={href}
                key={href}
              >
                <Icon />
                {label}
              </Link>
            ))}
        </nav>
        <div className="foot">
          <ShieldCheck size={18} />
          <p style={{ marginTop: 8 }}>
            ข้อมูลปลอดภัยภายในเครื่อง
            <br />
            โครงงานระบบคลังสินค้า • เวอร์ชัน 1.0
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              aria-label="เปิดเมนู"
              className="secondary mobile-toggle"
              onClick={() => setOpen(!open)}
            >
              <Menu size={18} />
            </button>
            <span className="muted">ระบบจัดการคลังสินค้า</span>
          </div>
          <div className="profile">
            <span className="avatar">{user.name[0]}</span>
            <div className="user-name">
              {user.name}
              <div className="muted" style={{ fontSize: 10 }}>
                {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
              </div>
            </div>
            <button
              className="secondary"
              title="ออกจากระบบ"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
