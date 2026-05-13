"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/tutors?q=${encodeURIComponent(q)}` : "/tutors");
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 bg-white rounded-full shadow-xl shadow-rose-200/50 ring-1 ring-slate-200 p-1.5 sm:p-2 max-w-2xl mx-auto"
    >
      <div className="flex-1 flex items-center gap-2 px-4 sm:px-5 min-w-0">
        <Search size={18} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ค้นหาวิชา, มหาวิทยาลัย, หรือชื่อพี่ติว..."
          className="flex-1 py-3 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 px-5 sm:px-7 py-3 bg-rose-500 text-white rounded-full font-bold text-sm hover:bg-rose-600 transition-all shadow-md shadow-rose-300/40"
      >
        ค้นหา
      </button>
    </form>
  );
}
