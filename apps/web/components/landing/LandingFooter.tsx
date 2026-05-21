import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

const LINKS: { label: string; href: Route }[] = [
  { label: "Terms", href: "/legal/terms" as Route },
  { label: "Privacy", href: "/legal/privacy" as Route },
  { label: "Contact", href: "/contact" as Route },
];

/**
 * Slim legal footer for the landing page. The shared <SiteFooter /> is
 * hidden on "/", so this strip carries the Terms / Privacy / Contact links.
 *
 * The landing page is a snap-scroll whose sections past the Hero live in an
 * inner scroll container — invisible to search crawlers and Google's OAuth
 * verification, which only ever see the first (Hero) screen. So this footer
 * is also rendered inside the Hero section with `tagline` set, giving the
 * home page a crawlable purpose statement + privacy-policy link.
 */
export function LandingFooter({ tagline }: { tagline?: string }) {
  return (
    <footer className="border-t border-ink-soft/15 px-6 py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2">
        {tagline ? (
          <p className="thai max-w-[640px] text-center text-[13px] leading-relaxed text-ink-soft">
            {tagline}
          </p>
        ) : null}
        <nav className="flex items-center gap-3 text-[13px] font-semibold">
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
        {tagline ? null : (
          <p className="text-[11px] text-ink-soft">© 2026 Pee Rahat Thailand</p>
        )}
      </div>
    </footer>
  );
}
