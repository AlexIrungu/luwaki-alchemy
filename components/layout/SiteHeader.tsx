import Link from "next/link";

// Nav from the brief: UNIVERSE · ACCOUNT · CONTACT · CART
const NAV = [
  { href: "/universe", label: "UNIVERSE" },
  { href: "/account", label: "ACCOUNT" },
  { href: "/contact", label: "CONTACT" },
  { href: "/cart", label: "CART" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 mix-blend-difference">
      <Link href="/" className="font-display text-lg tracking-[0.3em] text-ink">
        LUWAKI
      </Link>
      <nav className="flex gap-6 font-mono text-[11px] tracking-[0.2em] text-ink">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className="transition-colors hover:text-ink-dim">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
