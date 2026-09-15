import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Nav from the brief: UNIVERSE · ACCOUNT · CONTACT · CART
const NAV = [
  { href: "/universe", label: "UNIVERSE" },
  { href: "/account", label: "ACCOUNT" },
  { href: "/contact", label: "CONTACT" },
  { href: "/cart", label: "CART" },
];

// mix-blend-difference inverts against what's behind, so the text is white in
// both themes: it reads dark over a pale ground and light over a dark one.
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 px-4 py-5 mix-blend-difference sm:px-6">
      <Link href="/" className="font-display text-base tracking-[0.2em] text-invert sm:text-lg sm:tracking-[0.3em]">
        LUWAKI
      </Link>
      <nav className="flex items-center gap-3.5 font-mono text-[10px] tracking-[0.12em] text-invert sm:gap-6 sm:text-[11px] sm:tracking-[0.2em]">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className="transition-opacity hover:opacity-60">
            {label}
          </Link>
        ))}
        <ThemeToggle />
      </nav>
    </header>
  );
}
