import { PageBackground } from "@peerahat/ui";

import { asNotFound, createApiClient } from "@/lib/api-client";
import { requireAuth } from "@/lib/auth";

import { ReportDetailView } from "./_components/report-detail-view";

interface Props {
  params: { id: string };
}

/** FR-CM-05: reporter-facing detail for one filed report. */
export default async function ReportDetailPage({ params }: Props) {
  const token = await requireAuth("/account/reports");
  const api = createApiClient({ accessToken: token });
  const detail = await asNotFound(api.reports.byId(params.id));

  return (
    <>
      <PageBackground photo={false} sparkles="sparse" />

      <div className="mx-auto max-w-2xl pb-20">
        <ReportDetailView initial={detail} />
      </div>
    </>
  );
}
