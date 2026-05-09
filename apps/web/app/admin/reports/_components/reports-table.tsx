"use client";

import type { AdminReport, Page } from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createApiClient } from "@/lib/api-client";

interface Props {
  initialPage: Page<AdminReport>;
}

type Status = "open" | "resolved";

const TARGET_COLOR: Record<string, string> = {
  post: "bg-indigo-50 text-indigo-600",
  reply: "bg-indigo-50 text-indigo-600",
  sheet: "bg-amber-50 text-amber-600",
  tutor: "bg-rose-50 text-rose-600",
  message: "bg-slate-100 text-slate-500",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsTable({ initialPage }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("open");

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", { status }],
    queryFn: () => createApiClient().admin.listReports({ status, pageSize: 50 }),
    initialData: status === "open" ? initialPage : undefined,
  });
  const reports = reportsQuery.data?.items ?? [];

  const resolve = useMutation({
    mutationFn: (id: string) => createApiClient().admin.resolveReport(id),
    meta: { toast: "ปิดรายงานไม่สำเร็จ" },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("ปิดรายงานเรียบร้อย");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["open", "resolved"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              status === s
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300",
            )}
          >
            {s === "open" ? "Open" : "Resolved"}
            {status === s && reportsQuery.data && (
              <span className="ml-2 text-[10px] opacity-70">
                ({reportsQuery.data.total})
              </span>
            )}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-sm text-slate-400">
          {status === "open"
            ? "ไม่มีรายงานใหม่ในขณะนี้"
            : "ยังไม่มีรายงานที่ถูกปิด"}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left p-4 font-bold">Target</th>
                <th className="text-left p-4 font-bold">Reason</th>
                <th className="text-left p-4 font-bold">Reporter</th>
                <th className="text-left p-4 font-bold">When</th>
                <th className="text-right p-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest",
                        TARGET_COLOR[r.targetType] ?? "bg-slate-100 text-slate-500",
                      )}
                    >
                      {r.targetType}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[180px]">
                      {r.targetId}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{r.reason}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 max-w-md">
                      {r.details}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-slate-700">
                      {r.reporterDisplayName}
                    </p>
                  </td>
                  <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                    {r.resolvedAt && (
                      <p className="text-[10px] text-emerald-600">
                        Resolved {formatDateTime(r.resolvedAt)}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {r.resolvedAt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} />
                        Resolved
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resolve.mutate(r.id)}
                        disabled={
                          resolve.isPending && resolve.variables === r.id
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {resolve.isPending && resolve.variables === r.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
