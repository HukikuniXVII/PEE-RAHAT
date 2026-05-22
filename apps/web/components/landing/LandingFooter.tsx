import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

const LINKS: { label: string; href: Route }[] = [
  { label: "Terms", href: "/legal/terms" as Route },
  { label: "Privacy", href: "/legal/privacy" as Route },
  { label: "Contact", href: "/contact" as Route },
];

/**
 * Legal footer for the landing page. The shared <SiteFooter /> is hidden on
 * "/", so this strip carries the Terms / Privacy / Contact links.
 *
 * Two variants:
 * - default — full footer with copyright; rendered as the landing page's
 *   last section.
 * - `slim`  — just the legal-link strip, no border or copyright. The landing
 *   page is a snap-scroll whose sections past the Hero live in an inner
 *   scroll container, invisible to search crawlers and Google's OAuth
 *   verification (they only ever see the Hero screen). The slim strip sits
 *   in the Hero so the home page still exposes a crawlable Privacy-policy
 *   link without rendering a full footer mid-scroll.
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
    return <div className="flex justify-center px-6 py-4">{legalLinks}</div>;
  }

  return (
    <footer className="border-t border-ink-soft/15 px-6 py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2">
        {legalLinks}
        <p className="text-[11px] text-ink-soft">© 2026 Pee Rahat Thailand</p>
      </div>
    </footer>
  );
}
