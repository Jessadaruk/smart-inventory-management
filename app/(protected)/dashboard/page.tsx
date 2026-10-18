import { getDashboard } from "@/lib/inventory";
import { money, dateTime, movementName } from "@/lib/format";
import {
  Package,
  Tags,
  Wallet,
  TriangleAlert,
  ArrowUpRight,
  Boxes,
} from "lucide-react";
import Link from "next/link";
export default async function Dashboard() {
  const data = await getDashboard();
  const cards = [
    [
      "สินค้าทั้งหมด",
      data.totalProducts.toLocaleString("th-TH"),
      "รายการในคลัง",
      Package,
    ],
    [
      "หมวดหมู่สินค้า",
      data.totalCategories.toLocaleString("th-TH"),
      "หมวดหมู่ที่จัดเก็บ",
      Tags,
    ],
    [
      "มูลค่าสินค้าคงคลัง",
      money(data.totalValue),
      "คำนวณจากราคา × จำนวน",
      Wallet,
    ],
    [
      "สินค้าใกล้หมด",
      data.lowStockCount.toLocaleString("th-TH"),
      "คงเหลือไม่เกินจุดแจ้งเตือน",
      TriangleAlert,
    ],
  ] as const;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>ภาพรวมคลังสินค้า</h1>
          <p>ติดตามสถานะและความเคลื่อนไหวของคลังสินค้าได้ที่นี่</p>
        </div>
        <Link className="button" href="/products/new">
          + เพิ่มสินค้า
        </Link>
      </div>
      <div className="kpis">
        {cards.map(([label, value, hint, Icon]) => (
          <div className="card kpi" key={label}>
            <div className="kpi-top">
              {label}
              <span className="kpi-icon">
                <Icon size={20} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2>ความเคลื่อนไหวล่าสุด</h2>
            <Link className="stock-type" href="/stock">
              ดูทั้งหมด <ArrowUpRight size={12} style={{ display: "inline" }} />
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>ประเภท</th>
                  <th>จำนวน</th>
                  <th>ผู้ดำเนินการ / เวลา</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id}>
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
                      {m.user.name}
                      <div className="sku">{dateTime(m.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.movements.length && (
              <div className="empty">ยังไม่มีความเคลื่อนไหว</div>
            )}
          </div>
        </div>
        <div className="card">
          <h2>
            สินค้าที่ควรเติมสต็อก{" "}
            <span className="badge low">{data.lowStockCount} รายการ</span>
          </h2>
          <div className="mini-list">
            {data.lowStock.map((p) => (
              <Link href="/stock" key={p.id} className="mini-item">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="product-icon">
                    <Boxes size={20} />
                  </span>
                  <div>
                    {p.name}
                    <div className="sku">
                      {p.sku} • {p.category.name}
                    </div>
                  </div>
                </div>
                <span className={`badge ${p.quantity === 0 ? "out" : "low"}`}>
                  เหลือ {p.quantity}
                </span>
              </Link>
            ))}
          </div>
          {!data.lowStock.length && (
            <div className="empty">สินค้าทุกรายการมีเพียงพอ</div>
          )}
        </div>
      </div>
    </>
  );
}
