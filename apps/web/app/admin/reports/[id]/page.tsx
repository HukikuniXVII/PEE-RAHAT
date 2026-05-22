import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAdmin } from "@/lib/auth";

import { ReportDetail } from "./_components/report-detail";

interface Props {
  params: { id: string };
}

/** FR-CM-05: admin report detail + resolution action panel. */
export default async function AdminReportDetailPage({ params }: Props) {
  const token = await requireAdmin("/admin/reports");
  const api = createApiClient({ accessToken: token });
  const [detail, me] = await Promise.all([
    asNotFound(api.admin.reports.detail(params.id)),
    api.users.me(),
  ]);

  return (
    <div className="pb-20">
      <ReportDetail initial={detail} adminUserId={me.id} />
    </div>
  );
}
