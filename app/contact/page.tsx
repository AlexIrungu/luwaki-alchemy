import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-5xl tracking-[0.15em]">CONTACT</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-dim">
          Questions about a set, an order, or sizing. For bespoke work, start a{" "}
          <a href="/private-edit" className="text-resin underline">Private Edit</a> instead.
        </p>
        <ContactForm
          defaultName={profile?.full_name ?? ""}
          defaultEmail={user?.email ?? ""}
        />
      </div>
    </div>
  );
}
