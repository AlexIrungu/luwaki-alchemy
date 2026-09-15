import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKES } from "@/lib/money";

type Row = {
  id: string;
  name: string;
  slug: string;
  unit_price_kes: number;
  is_published: boolean;
  collections: { name: string } | null;
  product_variants: { id: string }[];
  product_media: { id: string }[];
};

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, unit_price_kes, is_published, collections(name), product_variants(id), product_media(id)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl tracking-[0.15em]">DESIGNS</h1>
        <Link
          href="/admin/products/new"
          className="border border-ink px-6 py-3 font-mono text-[11px] tracking-[0.2em] hover:bg-ink hover:text-ground"
        >
          NEW DESIGN
        </Link>
      </div>

      {!data?.length ? (
        <p className="mt-16 text-sm text-ink-dim">
          No designs yet. Add the first one — the five shape variants are created for you.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line-soft border-y border-line-soft">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 py-4 hover:opacity-80">
                <span
                  title={p.is_published ? "Published" : "Draft"}
                  className={`size-2 shrink-0 rounded-full ${p.is_published ? "bg-resin" : "bg-ink-faint"}`}
                />
                <span className="flex-1 font-display text-xl">{p.name}</span>
                <span className="w-28 font-mono text-[10px] tracking-[0.2em] text-ink-faint">
                  {p.collections?.name ?? "—"}
                </span>
                <span className="w-20 font-mono text-[10px] text-ink-faint">
                  {p.product_variants.length} shapes
                </span>
                <span className="w-20 font-mono text-[10px] text-ink-faint">
                  {p.product_media.length} images
                </span>
                <span className="w-28 text-right font-mono text-sm">
                  {formatKES(p.unit_price_kes)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
