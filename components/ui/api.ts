export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal,
    });
  } catch (error) {
    // การยกเลิกคำค้นเก่าไม่ใช่ข้อผิดพลาดที่ต้องแสดงต่อผู้ใช้
    if (signal?.aborted) throw error;
    throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("ระบบส่งข้อมูลไม่ถูกต้อง กรุณาลองใหม่");
  }
  if (!response.ok)
    throw new Error(result.message ?? "ไม่สามารถเชื่อมต่อระบบได้");
  return result.data;
}
export type Category = {
  id: string;
  name: string;
  description: string;
  _count?: { products: number };
};
export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  quantity: number;
  minStock: number;
  category: Category;
};
