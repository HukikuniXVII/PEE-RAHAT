"use client";

import {
  type Page,
  type StudySheet,
  type Subject,
  subjectSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PaymentDialog } from "@/components/payment-dialog";
import { createApiClient } from "@/lib/api-client";

const SUBJECTS = ["All", ...subjectSchema.options] as const;
type SubjectFilter = (typeof SUBJECTS)[number];

interface Props {
  initial: Page<StudySheet>;
  initialSubject: SubjectFilter;
  initialQuery: string;
}

export function SheetGrid({ initial, initialSubject, initialQuery }: Props) {
  const [subject, setSubject] = useState<SubjectFilter>(initialSubject);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [purchasing, setPurchasing] = useState<StudySheet | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const isInitialFilters =
    subject === initialSubject && debouncedQuery === initialQuery;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["sheets", "list", { subject, q: debouncedQuery }],
      queryFn: ({ pageParam = 1 }) =>
        createApiClient().sheets.list({
          subject: subject === "All" ? undefined : (subject as Subject),
          q: debouncedQuery || undefined,
          page: pageParam,
          pageSize: initial.pageSize,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page * lastPage.pageSize < lastPage.total
          ? lastPage.page + 1
          : undefined,
      // Only seed the cache when the user hasn't changed filters yet.
      initialData: isInitialFilters
        ? { pages: [initial], pageParams: [1] }
        : undefined,
      placeholderData: (prev) => prev,
    });
  const items = data?.pages.flatMap((p) => p.items) ?? initial.items;

  const reportMutation = useMutation({
    mutationFn: (sheetId: string) =>
      createApiClient().sheets.report({
        sheetId,
        reason: "copyright",
        details: "Reported via UI",
      }),
    meta: { toast: "ส่งรายงานไม่สำเร็จ" },
    onSuccess: () => {
      toast.success("ส่งรายงานเรียบร้อย ทีมงานจะตรวจสอบโดยเร็ว");
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
          {SUBJECTS.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSubject(cat)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                subject === cat
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search sheets, unis, authors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((sheet) => (
          <motion.div
            key={sheet.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-[40px] border border-slate-200 overflow-hidden hover:border-indigo-600 hover:shadow-2xl transition-all shadow-sm flex flex-col"
          >
            <div className="aspect-[4/3] bg-slate-50 relative flex items-center justify-center overflow-hidden">
              <img
                src={
                  sheet.previewImageUrls[0] ??
                  "https://images.unsplash.com/photo-1544640808-32ca72ac7f67?w=400&q=80"
                }
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt="preview"
              />
              <div className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur rounded-xl text-[10px] font-black shadow-sm uppercase tracking-tighter">
                {sheet.subject}
              </div>
            </div>

            <div className="p-8 space-y-6 flex-1 flex flex-col">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-amber-500">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg">
                    <Star size={12} fill="currentColor" />
                    {sheet.rating.toFixed(1)}
                  </div>
                  <button
                    type="button"
                    disabled={reportMutation.isPending}
                    onClick={() => reportMutation.mutate(sheet.id)}
                    className="text-[10px] font-bold text-slate-300 hover:text-red-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle size={12} />
                    Report
                  </button>
                </div>
                <Link
                  href={`/sheets/${sheet.id}` as Route}
                  className="block"
                >
                  <h4 className="font-bold text-xl text-slate-800 leading-tight line-clamp-2 hover:text-indigo-600 transition-colors">
                    {sheet.title}
                  </h4>
                </Link>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-black">
                    {sheet.sellerUniversity[0]}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                      {sheet.sellerUniversity}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 capitalize">
                      {sheet.sellerFaculty}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Price
                  </p>
                  <p className="font-black text-2xl text-slate-900 tracking-tight">
                    ฿{sheet.priceThb.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchasing(sheet)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isFetchingNextPage && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Show more
          </button>
        </div>
      )}

      <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="font-bold text-slate-800">100% Genuine Protection</p>
            <p className="text-xs text-slate-500">
              ระบบ Escrow ของเราจะระงับยอดเงินไว้ 24 ชม. เพื่อความปลอดภัย
            </p>
          </div>
        </div>
      </div>

      {purchasing && (
        <PaymentDialog
          itemType="sheet"
          itemId={purchasing.id}
          amountThb={purchasing.priceThb}
          payeeLabel={purchasing.sellerDisplayName}
          onClose={() => setPurchasing(null)}
        />
      )}
    </div>
  );
}
