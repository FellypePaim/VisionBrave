import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import type { AdminRole } from "@/lib/admin/types";

interface Props {
  adminEmail: string | null;
  role: AdminRole;
  children: React.ReactNode;
}

export function AdminShell({ adminEmail, role, children }: Props) {
  return (
    <div className="flex h-screen bg-bg text-white">
      <AdminSidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar adminEmail={adminEmail} role={role} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
