import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/account");

  return (
    <div className="px-6 pb-24 pt-40">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-4xl tracking-[0.15em]">ACCOUNT</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-dim">
          Browsing needs no account. Ordering does — every set is printed to your own
          measurements, and they live on your account.
        </p>
        <AuthForm next={next?.startsWith("/") ? next : "/account"} />
      </div>
    </div>
  );
}
