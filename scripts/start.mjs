import net from "node:net";
import fs from "node:fs";
import { spawn } from "node:child_process";
const port = Number(process.env.PORT ?? 3000);
if (
  !fs.existsSync(".env") ||
  !fs.existsSync(".next/BUILD_ID") ||
  !fs.existsSync("prisma/dev.db")
) {
  console.error(
    "ไม่พบ .env, ฐานข้อมูล หรือ production build กรุณาทำตาม README ก่อน",
  );
  process.exit(1);
}
const probe = net.createServer();
probe.once("error", () => {
  console.error(
    `พอร์ต ${port} ถูกใช้งานอยู่ กรุณาหยุดโปรแกรมเดิม หรือกำหนด $env:PORT='3001' และ NEXTAUTH_URL ให้ตรงกัน`,
  );
  process.exit(1);
});
probe.listen(port, "127.0.0.1", () =>
  probe.close(() => {
    console.log(`เปิดระบบที่ http://localhost:${port} (หยุดด้วย Ctrl+C)`);
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { stdio: "inherit" },
    );
    child.on("exit", (code) => process.exit(code ?? 1));
  }),
);
