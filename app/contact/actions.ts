"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ContactState = { error?: string; ok?: boolean };

const fields = z.object({
  name: z.string().min(2, "Tell us your name."),
  email: z.email("That email doesn't look right."),
  message: z.string().min(10, "A little more detail, please.").max(4000),
  // Bots fill hidden fields; people don't. Cheaper than a captcha and it
  // costs the customer nothing.
  website: z.string().max(0).optional(),
});

export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Silently accept the honeypot submission — telling a bot it failed only
  // helps it try again.
  if (parsed.data.website) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
  });
  if (error) return { error: error.message };

  return { ok: true };
}
