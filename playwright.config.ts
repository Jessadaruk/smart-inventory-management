import { defineConfig } from "@playwright/test";
import "dotenv/config";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: { baseURL: "http://localhost:3000", headless: true },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  webServer: {
    command: "npm start",
    url: "http://localhost:3000/login",
    // ต้องใช้ server ของฐานข้อมูลทดสอบ ห้ามเผลอเชื่อม server สาธิตที่เปิดอยู่
    reuseExistingServer: false,
    timeout: 60000,
  },
});
