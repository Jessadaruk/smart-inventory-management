import { getCurrentUser } from "@/lib/auth";
import { Categories } from "@/components/categories";
export default async function Page() {
  const user = await getCurrentUser();
  return <Categories isAdmin={user?.role === "ADMIN"} />;
}
