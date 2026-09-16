"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Saves or un-saves a design for the signed-in customer. Returns the new state, or null when signed out. */
export async function setSaved(productId: string, saved: boolean): Promise<boolean | null> {
  if (!z.uuid().safeParse(productId).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS ("own wishlist") keeps every write to the customer's own rows.
  const { error } = saved
    ? await supabase.from("wishlist_items").upsert({ profile_id: user.id, product_id: productId }, { ignoreDuplicates: true })
    : await supabase.from("wishlist_items").delete().eq("profile_id", user.id).eq("product_id", productId);
  if (error) return !saved;

  revalidatePath("/account");
  return saved;
}
