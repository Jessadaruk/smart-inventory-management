import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/shell";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
