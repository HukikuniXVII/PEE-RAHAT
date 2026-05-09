"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateReviewDto,
  type ReviewRating,
  createReviewSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { Controller, useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

interface Props {
  bookingId: string;
  tutorId: string;
  onClose: () => void;
  onReviewed: () => void;
}

const RATING_LABELS: Record<ReviewRating, string> = {
  1: "ไม่ประทับใจ",
  2: "พอใช้",
  3: "ดี",
  4: "ดีมาก",
  5: "ยอดเยี่ยม",
};

export function ReviewDialog({
  bookingId,
  tutorId,
  onClose,
  onReviewed,
}: Props) {
  const form = useForm<CreateReviewDto>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: { bookingId, rating: 5, text: "" },
    mode: "onChange",
  });

  const review = useMutation({
    mutationFn: (dto: CreateReviewDto) =>
      createApiClient().tutors.review(tutorId, dto),
    onSuccess: () => {
      onReviewed();
      onClose();
    },
  });

  const rating = form.watch("rating");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.form
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onSubmit={form.handleSubmit((values) => review.mutate(values))}
        className="w-full max-w-md bg-white rounded-[32px] border border-slate-200 shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">รีวิวคลาสนี้</h2>
          <p className="text-xs text-slate-500">
            ความคิดเห็นของคุณช่วยให้น้องๆ เลือกพี่ติวที่ใช่ได้ง่ายขึ้น
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ให้คะแนน
          </label>
          <Controller
            control={form.control}
            name="rating"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => field.onChange(n)}
                    className={cn(
                      "p-1 transition-all",
                      n <= field.value ? "text-amber-500" : "text-slate-200",
                    )}
                    aria-label={`${n} stars`}
                  >
                    <Star size={32} fill="currentColor" />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-slate-600">
                  {RATING_LABELS[field.value as ReviewRating]}
                </span>
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            เล่าประสบการณ์
          </label>
          <textarea
            placeholder="ติวเตอร์อธิบายเข้าใจง่าย ตอบคำถามได้ละเอียด ใจดีมาก..."
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[120px] resize-none"
            {...form.register("text")}
          />
        </div>

        {review.error && (
          <p className="text-xs text-rose-600 font-medium">
            {review.error.message}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={!form.formState.isValid || review.isPending}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Star size={16} fill="currentColor" />
            {review.isPending ? "กำลังส่ง..." : `ส่งรีวิว ${rating} ดาว`}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
