import type { Route } from "next";
import Link from "next/link";

export function Nav() {
  return (
    <nav className="relative z-20 flex items-center h-[54px] mt-4 mx-auto w-full max-w-[1400px] px-16">

      {/* Logo — left */}
      <div className="flex-1">
        <Link
          href="/"
          className="font-josefin font-bold text-[52px] leading-none text-dusty-grape whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          Pee Rahat
        </Link>
      </div>

      {/* Nav links — true center */}
      <div className="flex items-center gap-[60px]">
        <a
          href="#about"
          className="relative font-josefin font-bold text-[20px] text-dusty-grape whitespace-nowrap
            after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-full
            after:bg-dusty-grape after:transition-all after:duration-300
            hover:after:w-full hover:opacity-80 transition-opacity"
        >
          อะไรคือพี่รหัส?
        </a>
        <a
          href="#features"
          className="relative font-josefin font-bold text-[20px] text-dusty-grape whitespace-nowrap
            after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:rounded-full
            after:bg-dusty-grape after:transition-all after:duration-300
            hover:after:w-full hover:opacity-80 transition-opacity"
        >
          ฟีเจอร์
        </a>
        <a
          href="#how"
          className="relative font-josefin font-bold text-[20px] text-dusty-grape whitespace-nowrap
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
          className="inline-flex items-center justify-center font-josefin font-bold text-[20px] text-white-smoke bg-dusty-grape rounded-[13px] h-[48px] w-[160px] transition-all hover:bg-accent-500 hover:text-neutral-800 hover:shadow-lg hover:shadow-accent-500/30 active:scale-[0.98]"
        >
          เริ่มต้นใช้งาน
        </Link>
      </div>
    </nav>
  );
}
