import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PriceTable } from "@/components/admin/PriceTable";

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
    .order("name")
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
        <PriceTable
          rows={data.map((p) => ({
            id: p.id,
            name: p.name,
            collection: p.collections?.name ?? null,
            isPublished: p.is_published,
            shapes: p.product_variants.length,
            images: p.product_media.length,
            priceKES: p.unit_price_kes,
          }))}
        />
      )}
    </div>
  );
}
