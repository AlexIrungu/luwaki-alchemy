"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export type NavItem = { href: string; label: string; badge?: number };

/**
 * The admin's own navigation: a sidebar on desktop, a scrolling tab bar on a
 * phone. Badges show work waiting wherever you are.
 */
export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="border-b border-line bg-panel print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:py-8">
        <Link href="/admin" className="font-display text-lg tracking-[0.25em]">
          LUWAKI <span className="font-mono text-[9px] tracking-[0.3em] text-ink-faint">ADMIN</span>
        </Link>
        <div className="flex gap-4 font-mono text-[10px] tracking-[0.2em] text-ink-dim lg:hidden">
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-0">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap px-3 py-2 font-mono text-[11px] tracking-[0.15em] transition-colors ${
              active(item.href) ? "bg-ink text-ground" : "text-ink-dim hover:bg-panel-2 hover:text-ink"
            }`}
          >
            {item.label}
            {item.badge ? (
              <span
                className={`min-w-5 px-1.5 text-center text-[10px] ${
                  active(item.href) ? "bg-ground text-ink" : "bg-gold text-ink"
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="mt-auto hidden space-y-3 px-6 py-8 font-mono text-[10px] tracking-[0.2em] text-ink-faint lg:block">
        <div className="text-ink-dim">
          <ThemeToggle />
        </div>
        <Link href="/" className="block hover:text-ink">
          VIEW SHOP ↗
        </Link>
      </div>
    </aside>
  );
}
