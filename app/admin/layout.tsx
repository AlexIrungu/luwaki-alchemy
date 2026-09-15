import Link from "next/link";

export const metadata = { title: "Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-6 pb-24 pt-32">
      <div className="mx-auto max-w-5xl">
        <nav className="flex gap-8 border-b border-line pb-4 font-mono text-[11px] tracking-[0.2em] text-ink-dim">
          <Link href="/admin" className="hover:text-ink">OVERVIEW</Link>
          <Link href="/admin/products" className="hover:text-ink">DESIGNS</Link>
          <Link href="/admin/orders" className="hover:text-ink">ORDERS</Link>
          <Link href="/admin/commissions" className="hover:text-ink">PRIVATE EDIT</Link>
          <Link href="/admin/messages" className="hover:text-ink">MESSAGES</Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
