import { createClient } from "@/lib/supabase/server";
import { MessageRow } from "@/components/admin/MessageRow";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, message, handled, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mt-6">
      <h1 className="font-display text-4xl tracking-[0.15em]">MESSAGES</h1>

      {!data?.length ? (
        <p className="mt-16 text-sm text-ink-dim">Nothing yet.</p>
      ) : (
        <ul className="mt-10 space-y-px">
          {data.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
