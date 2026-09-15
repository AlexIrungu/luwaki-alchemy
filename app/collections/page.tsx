import { createClient } from "@/lib/supabase/server";
import { hasStill } from "@/lib/stills";
import { CollectionsGrid, type GridCollection } from "@/components/collections/CollectionsGrid";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("slug, name, verb, products(slug, name, is_published)")
    .order("sort_order")
    .returns<{ slug: string; name: string; verb: string; products: { slug: string; name: string; is_published: boolean }[] }[]>();

  const grid: GridCollection[] = (collections ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    verb: c.verb,
    designs: c.products
      .filter((d) => d.is_published && hasStill(d.slug))
      .map(({ slug, name }) => ({ slug, name })),
  }));

  return <CollectionsGrid collections={grid} />;
}
