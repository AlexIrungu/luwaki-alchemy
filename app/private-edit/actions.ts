"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CommissionState = { error?: string };

const fields = z.object({
  brief: z.string().min(40, "Tell us a little more — at least a few sentences."),
  // One URL per line. Optional: not everyone arrives with references.
  reference_urls: z.string().optional(),
});

export async function createCommission(
  _prev: CommissionState,
  formData: FormData,
): Promise<CommissionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const urls = (parsed.data.reference_urls ?? "")
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

  const invalid = urls.find((url) => !z.url().safeParse(url).success);
  if (invalid) return { error: `That doesn't look like a link: ${invalid}` };

  const { error } = await supabase.from("commissions").insert({
    profile_id: user.id,
    brief: parsed.data.brief,
    reference_urls: urls.length > 0 ? urls : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/private-edit");
  redirect("/private-edit?sent=1");
}
