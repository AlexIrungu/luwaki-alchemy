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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single<{ full_name: string | null; phone: string | null }>();

  return (
    <CheckoutView
      email={user.email!}
      live={isLive()}
      defaults={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
    />
  );
}
