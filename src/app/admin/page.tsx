import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { ADMIN_COOKIE, getAdminAuthConfig, verifyAdminSession } from "@/server/financial/auth";
import { getFinancialConfig } from "@/server/financial/config";
import { FinancialStore, publicFinancialSnapshot } from "@/server/financial/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = getAdminAuthConfig();
  if (!auth.configured || !verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value, auth)) redirect("/admin/login");
  const config = getFinancialConfig();
  const state = await new FinancialStore(config).read(config);
  return <AdminDashboard initialSnapshot={publicFinancialSnapshot(state.snapshot, config)} initialDistributions={state.distributions} />;
}
