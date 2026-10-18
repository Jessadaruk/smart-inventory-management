import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
// สร้างไฟล์เฉพาะเมื่อยังไม่มี ไม่เขียนทับฐานข้อมูลหรือความลับเดิม
if (!fs.existsSync(".env"))
  fs.writeFileSync(
    ".env",
    fs
      .readFileSync(".env.example", "utf8")
      .replace(
        "replace-with-random-32-byte-secret",
        crypto.randomBytes(32).toString("hex"),
      ),
  );
if (!fs.existsSync("prisma/dev.db"))
  fs.closeSync(fs.openSync("prisma/dev.db", "a"));
for (const args of [
  ["node_modules/prisma/build/index.js", "generate"],
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["node_modules/prisma/build/index.js", "db", "seed"],
  ["node_modules/next/dist/bin/next", "build"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("ตั้งค่าเสร็จแล้ว เริ่มระบบด้วย npm start หรือ start.bat");
