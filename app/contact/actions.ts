"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STORED_TOPICS } from "@/lib/contact";

export type ContactState = { error?: string; ok?: boolean };

const fields = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email: z.email("That email doesn't look right."),
  topic: z.enum(STORED_TOPICS, "Choose what it's about."),
  order_id: z.union([z.uuid(), z.literal("")]).optional(),
  message: z.string().trim().min(10, "A little more detail, please.").max(4000),
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
  const { data: { user } } = await supabase.auth.getUser();

  const orderId = parsed.data.order_id || null;
  if (orderId) {
    if (!user) return { error: "Sign in to link an order." };
    // RLS already limits orders to their owner; this turns a silent miss into a clear message.
    const { data: order } = await supabase.from("orders").select("id").eq("id", orderId).eq("profile_id", user.id).maybeSingle();
    if (!order) return { error: "That order isn't on your account." };
  }

  const { data: profile } = user
    ? await supabase.from("profiles").select("phone").eq("id", user.id).single()
    : { data: null };

  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    topic: parsed.data.topic,
    message: parsed.data.message,
    profile_id: user?.id ?? null,
    order_id: orderId,
    phone: profile?.phone ?? null,
  });
  if (error) return { error: error.message };

  // RESEND (once the domain is bought): send the customer an acknowledgement
  // and notify the admin inbox here. Until then messages surface in
  // /admin/messages with an unread badge.

  return { ok: true };
}
