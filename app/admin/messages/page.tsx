import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageRow, type Message } from "@/components/admin/MessageRow";
import { STORED_TOPICS, TOPIC_LABEL } from "@/lib/contact";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; show?: string }>;
}) {
  const { topic, show } = await searchParams;
  const activeTopic = STORED_TOPICS.find((t) => t === topic) ?? null;
  const showHandled = show === "all";
  const supabase = await createClient();

  let query = supabase
    .from("contact_messages")
    .select("id, name, email, message, topic, phone, handled, created_at, orders(id, reference, status)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (activeTopic) query = query.eq("topic", activeTopic);
  if (!showHandled) query = query.eq("handled", false);
  const { data, error } = await query.returns<Message[]>();

  const href = (next: { topic?: string | null; show?: string | null }) => {
    const params = new URLSearchParams();
    const t = next.topic === undefined ? activeTopic : next.topic;
    const s = next.show === undefined ? (showHandled ? "all" : null) : next.show;
    if (t) params.set("topic", t);
    if (s) params.set("show", s);
    const q = params.toString();
    return q ? `/admin/messages?${q}` : "/admin/messages";
  };
  const tab = (active: boolean) => (active ? "text-ink" : "text-ink-faint hover:text-ink-dim");

  return (
    <div className="mt-6">
      <h1 className="font-display text-4xl tracking-[0.15em]">MESSAGES</h1>

      <nav className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-3 font-mono text-[10px] tracking-[0.2em]">
        <Link href={href({ topic: null })} className={tab(!activeTopic)}>ALL TOPICS</Link>
        {STORED_TOPICS.map((t) => (
          <Link key={t} href={href({ topic: t })} className={tab(activeTopic === t)}>
            {TOPIC_LABEL[t].toUpperCase()}
          </Link>
        ))}
        <Link href={href({ show: showHandled ? null : "all" })} className="ml-auto text-ink-dim hover:text-ink">
          {showHandled ? "HIDE HANDLED" : "SHOW HANDLED"}
        </Link>
      </nav>

      {error && <p role="alert" className="mt-6 font-mono text-[11px] text-danger">{error.message}</p>}

      {!data?.length ? (
        <p className="mt-12 text-sm text-ink-dim">{showHandled ? "No messages." : "Nothing waiting — every message is handled."}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((m) => (
            <MessageRow key={m.id} message={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
