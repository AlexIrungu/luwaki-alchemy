import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContactForm, type ContactOrder } from "@/components/ContactForm";
import { DesignName } from "@/components/DesignName";
import { SOCIAL_HANDLE, SOCIAL_PROFILES } from "@/lib/social";
import { CONTACT_EMAIL, CONTACT_FAQ, REPLY_PROMISE, WHATSAPP_NUMBER } from "@/lib/contact";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: orders }] = user
    ? await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("orders")
          .select("id, reference, status")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)
          .returns<ContactOrder[]>(),
      ])
    : [{ data: null }, { data: null }];

  const channels = [
    WHATSAPP_NUMBER && { label: "WHATSAPP", value: "Message us", href: `https://wa.me/${WHATSAPP_NUMBER}` },
    SOCIAL_PROFILES.instagram && { label: "INSTAGRAM", value: SOCIAL_HANDLE, href: SOCIAL_PROFILES.instagram },
    SOCIAL_PROFILES.tiktok && { label: "TIKTOK", value: SOCIAL_HANDLE, href: SOCIAL_PROFILES.tiktok },
    CONTACT_EMAIL && { label: "EMAIL", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  ].filter((c): c is { label: string; value: string; href: string } => Boolean(c));

  return (
    <div className="px-6 pb-32 pt-36">
      {/* Intro, form, then channels + FAQ: on a phone the form comes straight after the intro. */}
      <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint">CONTACT</p>
          {/* DRAFT COPY — headline and intro for Lucy. */}
          <DesignName name="Talk to us" collection={null} accent="turquoise" />
          <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-dim">
            Questions about a set, your sizes or an order on its way — we read every message.
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-28 lg:self-start">
          <ContactForm
            defaultName={profile?.full_name ?? ""}
            defaultEmail={user?.email ?? ""}
            signedIn={Boolean(user)}
            orders={orders ?? []}
          />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <span aria-hidden="true" className="block h-1.5 w-20 bg-ink" />

          <ul className="mt-8 divide-y divide-line border-y border-line">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group flex items-baseline justify-between gap-4 py-4"
                >
                  <span className="font-mono text-[10px] tracking-[0.25em] text-ink-faint">{c.label}</span>
                  <span className="text-lg transition-transform group-hover:-translate-x-1">{c.value} →</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-faint">{REPLY_PROMISE}</p>

          <section className="mt-16">
            <h2 className="font-display text-3xl">Quick answers</h2>
            <p className="mt-1 font-mono text-[9px] tracking-[0.25em] text-flag">DRAFT COPY — TO CONFIRM WITH THE CLIENT</p>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {CONTACT_FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 text-base">
                    {item.q}
                    <span aria-hidden="true" className="font-mono text-ink-faint transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-dim">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
