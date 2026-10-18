import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// แต่ละรอบใช้ฐานข้อมูลใหม่แยกจาก dev.db โดยไม่ reset หรือคัดลอกข้อมูลผู้ใช้
fs.mkdirSync(".test-data", { recursive: true });
const databasePath = path.resolve(
  ".test-data",
  `test-${Date.now()}-${process.pid}.db`,
);
fs.closeSync(fs.openSync(databasePath, "wx"));
const environment = {
  ...process.env,
  DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
  NEXTAUTH_URL: "http://localhost:3000",
};
console.log("ฐานข้อมูลทดสอบ:", databasePath);
const commands = [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
];
for (const command of commands) {
  const result = spawnSync(process.execPath, command, {
    env: environment,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// เก็บฐานข้อมูลทดสอบไว้ตรวจหลักฐานภายหลัง ไม่ลบข้อมูลอัตโนมัติ
