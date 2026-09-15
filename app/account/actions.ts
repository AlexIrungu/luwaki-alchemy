"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FINGERS, HANDS } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const profileFields = z.object({
  full_name: z.string().min(2, "Tell us your name."),
  phone: z.string().min(7, "We need a phone number for delivery."),
  preferred_collection: z.uuid().nullable().catch(null),
  wants_new_releases: z.coerce.boolean(),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = profileFields.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    preferred_collection: formData.get("preferred_collection") || null,
    wants_new_releases: formData.get("wants_new_releases") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { ok: true };
}

/**
 * The width, in millimetres, of each of the ten nails. The bounds mirror the
 * CHECK constraint on `measurements` — a number outside them is a mistyped
 * gauge reading, and printing it wastes a set.
 */
const WIDTH = z.coerce.number().min(5, "That reads too small — check the gauge.")
  .max(25, "That reads too large — check the gauge.");

export async function saveMeasurements(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const rows: { profile_id: string; hand: string; finger: string; width_mm: number }[] = [];

  for (const hand of HANDS) {
    for (const finger of FINGERS) {
      const raw = formData.get(`${hand}-${finger}`);
      // All ten or nothing: a partial save produces an order that cannot be
      // printed, which is worse than no save at all.
      if (raw === null || raw === "") {
        return { error: `Missing measurement: ${hand} ${finger}.` };
      }
      const parsed = WIDTH.safeParse(raw);
      if (!parsed.success) {
        return { error: `${hand} ${finger}: ${parsed.error.issues[0].message}` };
      }
      rows.push({ profile_id: user.id, hand, finger, width_mm: parsed.data });
    }
  }

  const { error } = await supabase
    .from("measurements")
    .upsert(rows, { onConflict: "profile_id,hand,finger" });
  if (error) return { error: error.message };

  revalidatePath("/account/measurements");
  revalidatePath("/cart");
  return { ok: true };
}
