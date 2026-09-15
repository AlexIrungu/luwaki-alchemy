import Link from "next/link";

/** The black footer that sits on every page (site map item 12). */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ground px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
        <div>
          <p className="font-display text-2xl tracking-[0.3em]">LUWAKI</p>
          <p className="mt-2 max-w-xs text-sm text-ink-dim">
            Sculpted in translucent resin. Printed to your measurements.
          </p>
        </div>
        <nav className="flex gap-12 font-mono text-[11px] tracking-[0.2em] text-ink-dim">
          <div className="flex flex-col gap-3">
            <Link href="/collections/sublime">SUBLIME</Link>
            <Link href="/collections/opulence">OPULENCE</Link>
            <Link href="/collections/noir">NOIR</Link>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/universe">UNIVERSE</Link>
            <Link href="/private-edit">PRIVATE EDIT</Link>
            <Link href="/contact">CONTACT</Link>
          </div>
        </nav>
      </div>
      <p className="mx-auto mt-16 max-w-6xl font-mono text-[10px] tracking-[0.2em] text-ink-faint">
        © {new Date().getFullYear()} LUWAKI ALCHEMY
      </p>
    </footer>
  );
}
