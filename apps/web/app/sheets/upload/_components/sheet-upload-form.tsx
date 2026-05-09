"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateSheetDto,
  createSheetSchema,
  subjectSchema,
} from "@peerahat/types";
import { cn } from "@peerahat/ui";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createApiClient } from "@/lib/api-client";

type UploadKind = "pdf" | "preview";

export function SheetUploadForm() {
  const router = useRouter();
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const form = useForm<CreateSheetDto>({
    resolver: zodResolver(createSheetSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: "Math",
      priceThb: 100,
      pdfObjectKey: "",
      previewImageObjectKeys: [],
      introVideoUrl: undefined,
    },
    mode: "onChange",
  });

  const previewKeys = form.watch("previewImageObjectKeys") ?? [];
  const pdfKey = form.watch("pdfObjectKey");

  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: UploadKind; file: File }) => {
      const api = createApiClient();
      const intent = await api.sheets.requestUpload(kind, file.type);
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      return { kind, objectKey: intent.objectKey, fileName: file.name };
    },
    onSuccess: ({ kind, objectKey, fileName }) => {
      if (kind === "pdf") {
        form.setValue("pdfObjectKey", objectKey, { shouldValidate: true });
        setPdfFileName(fileName);
      } else {
        form.setValue(
          "previewImageObjectKeys",
          [...previewKeys, objectKey],
          { shouldValidate: true },
        );
      }
    },
  });

  const create = useMutation({
    mutationFn: (dto: CreateSheetDto) => createApiClient().sheets.create(dto),
    onSuccess: () => router.push("/sheets"),
  });

  const onSubmit = form.handleSubmit((values) => create.mutate(values));

  const error = upload.error?.message ?? create.error?.message ?? null;
  const removePreview = (objectKey: string) => {
    form.setValue(
      "previewImageObjectKeys",
      previewKeys.filter((k) => k !== objectKey),
      { shouldValidate: true },
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm space-y-10"
    >
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900">
          ลงขายชีทใหม่
        </h1>
        <p className="text-sm text-slate-500">
          กรอกข้อมูลให้ครบ พี่ๆ ที่ยืนยันตัวตนแล้วเท่านั้นสามารถลงขายได้
        </p>
      </header>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          ชื่อชีท
        </label>
        <input
          type="text"
          placeholder="ชีทสรุปฟิสิกส์ ม.6 - กลศาสตร์"
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
          {...form.register("title")}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-rose-600 font-medium">
            {form.formState.errors.title.message}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          คำอธิบาย
        </label>
        <textarea
          placeholder="ครอบคลุมเนื้อหาตั้งแต่หน่วย-ปริมาณทางฟิสิกส์ จนถึง..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[140px] resize-none"
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-xs text-rose-600 font-medium">
            {form.formState.errors.description.message}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            วิชา
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
            {...form.register("subject")}
          >
            {subjectSchema.options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            ราคา (บาท)
          </label>
          <input
            type="number"
            min={0}
            max={100_000}
            step={10}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
            {...form.register("priceThb", { valueAsNumber: true })}
          />
        </section>
      </div>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <FileText size={14} />
          ไฟล์ PDF (ไฟล์เต็มที่ผู้ซื้อจะได้รับหลังชำระเงิน)
        </label>
        <label
          className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
            pdfKey
              ? "bg-emerald-50 border-emerald-200"
              : "bg-slate-50 border-slate-200 hover:border-indigo-600",
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              pdfKey ? "bg-emerald-500 text-white" : "bg-white text-slate-400",
            )}
          >
            {pdfKey ? <CheckCircle2 size={24} /> : <Upload size={20} />}
          </div>
          <div className="flex-1 text-sm">
            {pdfKey ? (
              <p className="font-bold text-emerald-700">
                {pdfFileName ?? "อัปโหลดสำเร็จ"}
              </p>
            ) : (
              <>
                <p className="font-bold text-slate-700">เลือกไฟล์ PDF</p>
                <p className="text-[10px] text-slate-400">PDF เท่านั้น (สูงสุด 50MB)</p>
              </>
            )}
          </div>
          {upload.isPending && upload.variables?.kind === "pdf" && (
            <Loader2 size={20} className="text-indigo-600 animate-spin" />
          )}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate({ kind: "pdf", file: f });
            }}
          />
        </label>
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ImagePlus size={14} />
          ภาพตัวอย่าง ({previewKeys.length}/8)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {previewKeys.map((key) => (
            <div
              key={key}
              className="relative aspect-square rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden"
            >
              <CheckCircle2 size={28} className="text-emerald-500" />
              <button
                type="button"
                onClick={() => removePreview(key)}
                className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-slate-400 hover:text-rose-500"
                aria-label="Remove preview"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {previewKeys.length < 8 && (
            <label
              className={cn(
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50 border-slate-200 hover:border-indigo-600",
                upload.isPending && "pointer-events-none opacity-60",
              )}
            >
              {upload.isPending && upload.variables?.kind === "preview" ? (
                <Loader2 size={20} className="text-indigo-600 animate-spin" />
              ) : (
                <>
                  <ImagePlus size={20} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500">
                    เพิ่มภาพ
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={upload.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate({ kind: "preview", file: f });
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
        {form.formState.errors.previewImageObjectKeys && (
          <p className="text-xs text-rose-600 font-medium">
            {form.formState.errors.previewImageObjectKeys.message}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          ลิงก์วิดีโอแนะนำ (ตัวเลือก)
        </label>
        <input
          type="url"
          placeholder="https://youtu.be/..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
          {...form.register("introVideoUrl")}
        />
        {form.formState.errors.introVideoUrl && (
          <p className="text-xs text-rose-600 font-medium">
            {form.formState.errors.introVideoUrl.message}
          </p>
        )}
      </section>

      <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-indigo-700 leading-relaxed">
          พี่ติวที่จะลงขายต้องผ่านการยืนยันตัวตน (KYC) แล้วเท่านั้น และเนื้อหาที่ลงขาย
          ต้องเป็นของพี่เองหรือมีสิทธิ์ในการเผยแพร่ ระบบจะตรวจสอบ Report การละเมิดลิขสิทธิ์
          และอาจระงับชีทระหว่างการตรวจสอบ
        </p>
      </section>

      {error && (
        <p className="text-sm text-rose-600 font-medium text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!form.formState.isValid || create.isPending}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
      >
        {create.isPending ? "กำลังลงขาย..." : "ลงขายชีท"}
      </button>
    </form>
  );
}
