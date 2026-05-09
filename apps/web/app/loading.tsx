import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <Loader2
        className="text-indigo-600 animate-spin"
        size={32}
        aria-hidden="true"
      />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Loading...
      </p>
    </div>
  );
}
