import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { ADMIN_COOKIE, getAdminAuthConfig, verifyAdminSession } from "@/server/financial/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const config = getAdminAuthConfig();
  if (verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value, config)) redirect("/admin");
  return <AdminLoginForm configured={config.configured} />;
}
