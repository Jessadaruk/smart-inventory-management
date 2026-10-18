// รวมกติกาสิทธิ์ไว้ที่เดียว และเรียกใช้ฝั่งเซิร์ฟเวอร์ทุกคำขอ
export function requiresAdmin(resource: string, method: string) {
  if (resource === "users") return true;
  if (resource === "categories" && method !== "GET") return true;
  if (resource === "products" && method === "DELETE") return true;
  return false;
}
