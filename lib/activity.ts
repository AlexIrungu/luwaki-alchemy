import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityEntry = {
  /** null for system events (webhook, payment verification). */
  actor_id: string | null;
  entity_type: "order" | "product" | "message";
  entity_id: string;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  detail?: Record<string, unknown> | null;
};

/**
 * Appends to the activity log. A failed log write must never undo the change
 * it describes (the order is already paid, the price already saved), so it is
 * reported loudly instead of thrown.
 */
export async function logActivity(client: SupabaseClient, entry: ActivityEntry | ActivityEntry[]) {
  const { error } = await client.from("activity_log").insert(entry);
  if (error) console.error("[activity_log] write failed:", error.message, entry);
}
