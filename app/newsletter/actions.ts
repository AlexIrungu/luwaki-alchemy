"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NewsletterState = { error?: string; ok?: boolean };

const fields = z.object({
  email: z.email("That email doesn't look right."),
  // Honeypot, as on the contact form.
  website: z.string().max(0).optional(),
});

export async function subscribe(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.website) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data.email.toLowerCase() });

  // Already subscribed reads as success: the form must not reveal who is on the list.
  if (error && error.code !== "23505") return { error: "Something went wrong — please try again." };
  return { ok: true };
}
