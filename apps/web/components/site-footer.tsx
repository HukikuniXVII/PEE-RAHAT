import { GraduationCap } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <GraduationCap size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">
              Pee Rahat
            </span>
          </Link>
          <div className="flex gap-8 text-sm font-bold text-slate-400">
            <Link href="/legal/terms" className="hover:text-indigo-600">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-indigo-600">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-indigo-600">
              Contact
            </Link>
            <Link href="/help" className="hover:text-indigo-600">
              Help
            </Link>
          </div>
        </div>
        <div className="pt-12 border-t border-slate-200 text-center space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
            DBD Registered E-commerce Thailand
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            © 2026 Pee Rahat Thailand
          </p>
        </div>
      </div>
    </footer>
  );
}
