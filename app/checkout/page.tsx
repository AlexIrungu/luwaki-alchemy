import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutView } from "@/components/CheckoutView";
import { isLive } from "@/lib/payments/provider";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/checkout");

  const { count: measured } = await supabase
    .from("measurements")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if ((measured ?? 0) < 10) redirect("/account/measurements");

  return <CheckoutView email={user.email!} live={isLive()} />;
}
