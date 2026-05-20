import { ArrowRight, GraduationCap } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

// Chrome mirrors apps/web/components/site-nav.tsx so the landing and
// authenticated headers share the same look: sticky h-16 frosted glass
// row, GraduationCap tile + "Pee Rahat" + "Verified EdTech" tagline,
// Josefin Bold 15px hover-tinted anchor links.
//
// The CTA matches the Hero "เริ่มต้นใช้งาน" button (filled grape ➜
// gold on hover) instead of the smaller .brand-nav-pill so the nav
// CTA and the hero CTA read as the same affordance.
const ANCHOR_LINKS = [
  { href: "#about", label: "อะไรคือพี่รหัส?" },
  { href: "#features", label: "ฟีเจอร์" },
  { href: "#how", label: "พี่รหัสทำงานยังไง?" },
] as const;

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_0_rgba(85,65,139,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center text-white shadow-[0_8px_18px_-8px_rgba(85,65,139,0.55)]">
              <GraduationCap size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-josefin font-bold text-[20px] text-dusty-grape leading-none tracking-tight">
                Pee Rahat
              </span>
              <span className="text-[9px] font-bold text-ink-mute uppercase tracking-widest mt-0.5">
                Verified EdTech
              </span>
            </div>
          </Link>

          {/* Anchor links + CTA */}
          <div className="hidden md:flex items-center gap-1">
            {ANCHOR_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="thai px-3 py-2 rounded-xl font-josefin font-bold text-[15px] transition-all duration-200 text-violet-700/80 hover:text-dusty-grape hover:bg-grape-soft/60"
              >
                {item.label}
              </a>
            ))}

            <div className="w-px h-5 bg-violet-200/60 mx-3" />

            {/* CTA — same look as Hero's primary CTA */}
            <Link
              href={"/login" as Route}
              className="thai inline-flex items-center gap-2 rounded-[16px] bg-dusty-grape px-6 py-3 text-[15px] font-bold text-white-smoke shadow-lg transition-all hover:bg-accent-500 hover:text-neutral-800 hover:shadow-lg hover:shadow-accent-500/30"
            >
              เริ่มต้นใช้งาน
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
