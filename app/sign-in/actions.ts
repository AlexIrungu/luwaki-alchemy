"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters."),
  // Where to send the customer afterwards — usually back to the cart.
  next: z.string().startsWith("/").default("/account"),
});

const signUpFields = credentials.extend({
  fullName: z.string().min(2, "Tell us your name."),
  phone: z.string().min(7, "We need a phone number for delivery."),
});

export type AuthState = { error?: string; notice?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(parsed.data.next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpFields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { email, password, fullName, phone, next } = parsed.data;
  const supabase = await createClient();

  // full_name and phone ride along in user metadata; the on_auth_user_created
  // trigger copies them into `profiles`.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };

  // With email confirmation switched on, signUp returns no session — redirecting
  // to a protected route here would bounce straight back to /sign-in.
  if (!data.session) {
    return { notice: `Check ${email} for a confirmation link, then sign in.` };
  }

  // New customers go straight to sizing — an order cannot be produced without it.
  revalidatePath("/", "layout");
  redirect("/account/measurements");
}
