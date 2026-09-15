import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantEditor } from "@/components/admin/VariantEditor";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { PublishToggle } from "@/components/admin/PublishToggle";
import type { Shape } from "@/lib/catalogue";

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unit_price_kes: number;
  collection_id: string | null;
  is_published: boolean;
  product_variants: { id: string; options: { shape?: Shape }; price_kes: number | null; is_published: boolean }[];
  product_media: { id: string; url: string; alt: string | null }[];
};

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: collections }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, description, unit_price_kes, collection_id, is_published, product_variants(id, options, price_kes, is_published), product_media(id, url, alt)")
      .eq("id", id)
      .single<Row>(),
    supabase.from("collections").select("id, name").order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl tracking-[0.15em]">{product.name}</h1>
          <Link
            href={`/designs/${product.slug}`}
            className="mt-2 block font-mono text-[10px] text-ink-faint hover:text-ink-dim"
          >
            /designs/{product.slug}
          </Link>
        </div>
        <PublishToggle
          productId={product.id}
          isPublished={product.is_published}
          variantCount={product.product_variants.filter((v) => v.is_published).length}
          mediaCount={product.product_media.length}
        />
      </div>

      <div className="mt-12 grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ProductForm collections={collections ?? []} product={product} />

        <div className="space-y-16">
          <VariantEditor
            productId={product.id}
            basePriceKES={product.unit_price_kes}
            variants={product.product_variants}
          />
          <MediaUploader productId={product.id} media={product.product_media} />
        </div>
      </div>
    </div>
  );
}
