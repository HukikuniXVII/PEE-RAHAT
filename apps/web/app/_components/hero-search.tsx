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
      className="flex items-center gap-2 bg-white rounded-2xl shadow-2xl shadow-slate-900/20 p-2 max-w-2xl"
    >
      <div className="flex-1 flex items-center gap-2 px-3 min-w-0">
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
        className="shrink-0 px-5 sm:px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
      >
        ค้นหา
      </button>
    </form>
  );
}
