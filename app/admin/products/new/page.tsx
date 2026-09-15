import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections").select("id, name").order("sort_order");

  return (
    <div className="mt-12 max-w-xl">
      <h1 className="font-display text-4xl tracking-[0.15em]">NEW DESIGN</h1>
      <p className="mt-3 text-sm text-ink-dim">
        The URL slug and the five shape variants are generated from the name.
      </p>
      <ProductForm collections={collections ?? []} />
    </div>
  );
}
