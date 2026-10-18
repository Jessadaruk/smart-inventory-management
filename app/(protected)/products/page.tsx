import { getCurrentUser } from "@/lib/auth";
import { ProductList } from "@/components/products/product-list";
export default async function Products() {
  const user = await getCurrentUser();
  return <ProductList isAdmin={user?.role === "ADMIN"} />;
}
