import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
export default async function Login() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <LoginForm />;
}
