import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users } from "@/components/users";
export default async function Page() {
  if ((await getCurrentUser())?.role !== "ADMIN") redirect("/unauthorized");
  return <Users />;
}
