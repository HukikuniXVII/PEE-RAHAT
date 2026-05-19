import type { Route } from "next";
import Link from "next/link";

/**
 * Landing-page nav bar — relative, lives inside section 1.
 * Figma frame 16:113 — Josefin Sans Bold, #55418b.
 * Layout: logo left · links true-center · CTA right.
 * Effect: frosted glass (bg-white/25 backdrop-blur) + gradient bottom divider.
 */
export function Nav() {
  return (
    <nav
      className="relative z-20 flex items-center h-[66px] w-full px-16 bg-white/25 backdrop-blur-sm"
      style={{
        borderBottom: "1px solid rgba(85, 65, 139, 0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.6), 0 4px 16px -8px rgba(85,65,139,0.08)",
      }}
    >
      {/* Logo — left */}
      <div className="flex-1">
        <Link
          href="/"
          className="font-josefin font-bold text-[64px] leading-none text-dusty-grape whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          Pee Rahat
        </Link>
      </div>

      {/* Nav links — true center */}
      <div className="flex items-center gap-[50px]">
        <a
          href="#about"
          className="relative font-josefin font-bold text-[24px] text-dusty-grape whitespace-nowrap
            after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-full
            after:bg-dusty-grape after:transition-all after:duration-300
            hover:after:w-full hover:opacity-80 transition-opacity"
        >
          อะไรคือพี่รหัส?
        </a>
        <a
          href="#features"
          className="relative font-josefin font-bold text-[24px] text-dusty-grape whitespace-nowrap
            after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-full
            after:bg-dusty-grape after:transition-all after:duration-300
            hover:after:w-full hover:opacity-80 transition-opacity"
        >
          ฟีเจอร์
        </a>
        <a
          href="#how"
          className="relative font-josefin font-bold text-[24px] text-dusty-grape whitespace-nowrap
            after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-full
            after:bg-dusty-grape after:transition-all after:duration-300
            hover:after:w-full hover:opacity-80 transition-opacity"
        >
          พี่รหัสทำงานยังไง?
        </a>
      </div>

      {/* CTA — right */}
      <div className="flex-1 flex justify-end">
        <Link
          href={"/login" as Route}
          className="inline-flex items-center justify-center font-josefin font-bold text-[24px] text-white-smoke bg-dusty-grape rounded-[16px] h-[60px] w-[199px] transition-all hover:opacity-90 hover:shadow-lg hover:shadow-dusty-grape/20 active:scale-[0.98]"
        >
          เริ่มต้นใช้งาน
        </Link>
      </div>
    </nav>
  );
}
