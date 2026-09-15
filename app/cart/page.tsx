import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Measurement completeness gates checkout as hard as an empty slot does.
  let measured = 0;
  if (user) {
    const { count } = await supabase
      .from("measurements")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id);
    measured = count ?? 0;
  }

  return <CartView signedIn={Boolean(user)} measured={measured} />;
}
