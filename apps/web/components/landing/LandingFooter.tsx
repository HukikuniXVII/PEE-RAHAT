import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

const LINKS: { label: string; href: Route }[] = [
  { label: "Terms", href: "/legal/terms" as Route },
  { label: "Privacy", href: "/legal/privacy" as Route },
  { label: "Contact", href: "/contact" as Route },
];

const BRAND_NAME = "Pee Rahat (พี่รหัส)";
const BRAND_DESCRIPTION =
  "แพลตฟอร์มจับคู่ติวเตอร์รุ่นพี่มหาวิทยาลัย ตลาดชีตสรุป และชุมชนสำหรับนักเรียน ม.ปลาย พร้อมระบบตัวกลางที่ปลอดภัย";
const SUPPORT_EMAIL = "support@peerahat.com";
const COPYRIGHT = "© 2026 Pee Rahat Thailand";
const COUNTRY = "ประเทศไทย";

/**
 * Legal footer for the landing page. The shared <SiteFooter /> is hidden on
 * "/", so this strip carries the brand identity + Terms / Privacy / Contact
 * links that Google's OAuth verification + crawlers look for.
 *
 * Two variants — both contain the full identity block (brand name, one-line
 * Thai description, support email, country, copyright) so Google reviewers
 * can confirm the OAuth app identity from either the homepage HTML (slim,
 * sr-only on Hero) or the visual footer at the bottom of section 3.
 *
 * - default — bordered visual footer at the landing page's last section.
 * - `slim`  — compact, used inside Hero wrapped in sr-only so crawlers and
 *   OAuth verifiers can see the same identity block without it rendering
 *   visually mid-scroll. The landing page is a snap-scroll whose later
 *   sections live in an inner container the crawler never reaches.
 */
export function LandingFooter({ slim = false }: { slim?: boolean }) {
  const legalLinks = (
    <nav
      aria-label="ข้อกำหนดและนโยบาย"
      className="flex items-center gap-3 text-[13px] font-semibold"
    >
      {LINKS.map((link, i) => (
        <Fragment key={link.href}>
          {i > 0 && (
            <span aria-hidden className="text-ink-soft/40">
              ·
            </span>
          )}
          <Link
            href={link.href}
            className="rounded-sm text-ink-soft transition-colors hover:text-dusty-grape focus-visible:text-dusty-grape focus-visible:underline focus-visible:underline-offset-4 focus-visible:outline-none"
          >
            {link.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );

  if (slim) {
    // Compact identity block — visually trivial since this variant is
    // wrapped in `sr-only` by the landing page. Order matters for crawlers:
    // brand → description → contact → legal → copyright.
    return (
      <div className="px-6 py-4 text-center">
        <p className="font-bold text-grape-deep">{BRAND_NAME}</p>
        <p className="thai mt-1 text-[12px] text-ink-soft">
          {BRAND_DESCRIPTION}
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {COUNTRY}
        </p>
        <div className="mt-2 flex justify-center">{legalLinks}</div>
        <p className="mt-1 text-[11px] text-ink-soft">{COPYRIGHT}</p>
      </div>
    );
  }

  return (
    <footer className="border-t border-ink-soft/15 px-6 py-6">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2 text-center">
        <p className="text-[15px] font-bold text-grape-deep">{BRAND_NAME}</p>
        <p className="thai max-w-[560px] text-[13px] leading-relaxed text-ink-soft">
          {BRAND_DESCRIPTION}
        </p>
        <p className="text-[12px] text-ink-soft">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-sm transition-colors hover:text-dusty-grape focus-visible:text-dusty-grape focus-visible:underline focus-visible:underline-offset-4 focus-visible:outline-none"
          >
            {SUPPORT_EMAIL}
          </a>
          <span aria-hidden className="mx-2 text-ink-soft/40">
            ·
          </span>
          <span>{COUNTRY}</span>
        </p>
        {legalLinks}
        <p className="text-[11px] text-ink-mute">{COPYRIGHT}</p>
      </div>
    </footer>
  );
}
