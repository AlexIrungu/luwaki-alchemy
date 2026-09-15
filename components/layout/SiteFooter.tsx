import Link from "next/link";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { SOCIAL_PROFILES } from "@/lib/social";

type FooterLink = { href: string; label: string; external?: boolean };

const PRIMARY: FooterLink[] = [
  { href: "/collections/sublime", label: "SUBLIME" },
  { href: "/collections/opulence", label: "OPULENCE" },
  { href: "/collections/noir", label: "NOIR" },
  { href: "/universe", label: "UNIVERSE" },
];

const SECONDARY: FooterLink[] = [
  { href: "/private-edit", label: "PRIVATE EDIT" },
  { href: "/contact", label: "CONTACT" },
  ...(SOCIAL_PROFILES.instagram ? [{ href: SOCIAL_PROFILES.instagram, label: "INSTAGRAM", external: true }] : []),
  ...(SOCIAL_PROFILES.tiktok ? [{ href: SOCIAL_PROFILES.tiktok, label: "TIKTOK", external: true }] : []),
];

function LinkColumn({ links }: { links: FooterLink[] }) {
  return (
    <ul className="w-full max-w-72 space-y-4">
      {links.map((link) => {
        const content = (
          <>
            <span>{link.label}</span>
            <span aria-hidden="true" className="text-ink-faint transition-transform group-hover:translate-x-1">
              →
            </span>
          </>
        );
        const className =
          "group flex items-center justify-between font-mono text-[13px] tracking-[0.3em] text-ink transition-colors hover:text-ink-dim";
        return (
          <li key={link.label}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <Link href={link.href} className={className}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The footer on every page (site map item 12), after vanguart.com's. */
export function SiteFooter() {
  return (
    <footer className="bg-panel">
      <p
        aria-hidden="true"
        className="select-none overflow-hidden whitespace-nowrap px-2 pt-24 text-center font-display text-[24vw] font-light leading-[0.8] tracking-[-0.02em] text-ink/[0.05]"
      >
        LUWAKI
      </p>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 md:flex-row md:gap-24 md:px-10">
        <Link href="/" className="font-display text-2xl tracking-[0.3em] md:w-40">
          LUWAKI
        </Link>
        <nav aria-label="Footer" className="flex flex-1 flex-col gap-10 sm:flex-row sm:gap-24">
          <LinkColumn links={PRIMARY} />
          <LinkColumn links={SECONDARY} />
        </nav>
      </div>

      <div className="grid border-t border-line lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:gap-12 md:px-10">
          <p className="font-mono text-[13px] leading-relaxed tracking-[0.3em] text-ink">
            JOIN THE
            <br />
            LUWAKI UNIVERSE
          </p>
          <NewsletterForm />
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-line px-6 py-8 font-mono text-[10px] tracking-[0.25em] text-ink-faint md:px-10 lg:border-l lg:border-t-0">
          <span>© {new Date().getFullYear()} LUWAKI ALCHEMY</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
      </div>
    </footer>
  );
}
