import { requireAdmin } from "@/lib/auth";

import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the whole /admin/* tree once. Child pages keep their own
  // requireAdmin for defense in depth.
  await requireAdmin("/admin");
  return <AdminShell>{children}</AdminShell>;
}
