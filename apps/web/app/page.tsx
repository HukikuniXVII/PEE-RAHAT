import { redirect } from "next/navigation";

import { getInitialUser } from "@/lib/auth";
import { AboutFeatures } from "@/components/landing/AboutFeatures";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Nav } from "@/components/landing/Nav";
import { SnapLock } from "@/components/snap-lock";

export default async function HomePage() {
  const user = await getInitialUser();
  if (user) redirect("/tutors");

  return (
    <div
      id="snap-root"
      className="h-screen overflow-y-scroll snap-y snap-mandatory no-scrollbar"
    >
      <SnapLock />

      {/* ── Section 1: Hero ── */}
      <section className="landing-page h-screen snap-start snap-always flex flex-col">
        <Nav />
        <Hero />
      </section>

      {/* ── Section 2: อะไรคือพี่รหัส? + ฟีเจอร์ ── */}
      <section
        id="about"
        className="h-screen snap-start snap-always flex flex-col"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 90%, rgba(125,128,218,0.18) 0%, transparent 65%)," +
            "radial-gradient(50% 45% at 10% 60%, rgba(187,160,160,0.22) 0%, transparent 60%)," +
            "linear-gradient(160deg, #eee8f5 0%, #f5f0fa 40%, #ede5ec 100%)",
        }}
      >
        <AboutFeatures />
      </section>

      {/* ── Section 3: พี่รหัสทำงานยังไง? ── */}
      <section
        id="how"
        className="h-screen snap-start snap-always flex flex-col"
        style={{
          background:
            "radial-gradient(55% 45% at 85% 15%, rgba(187,160,160,0.24) 0%, transparent 60%)," +
            "radial-gradient(45% 40% at 15% 80%, rgba(125,128,218,0.14) 0%, transparent 60%)," +
            "linear-gradient(145deg, #f5ede8 0%, #f8f2ef 40%, #ede8f2 100%)",
        }}
      >
        <HowItWorks />
      </section>
    </div>
  );
}
