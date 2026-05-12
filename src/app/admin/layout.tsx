import { redirect } from "next/navigation";
import { tryAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin · VisionBrave",
};

// Layout SSR: valida sessão admin antes de renderizar qualquer página filha.
// Se não for admin, redireciona pro /dashboard — sem expor que a área existe.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await tryAdmin("admin.access");
  if (!ctx) redirect("/dashboard");

  return (
    <AdminShell adminEmail={ctx.user.email} role={ctx.admin.role}>
      {children}
    </AdminShell>
  );
}
