import { createAdminClient } from "@/lib/supabase/server";

/**
 * Server-only. Emails live in Supabase Auth, not in `profiles`, so the list is
 * read with the service-role client — call only after requireAdmin().
 */

/** Orders that count as money actually taken. */
const PAID = ["paid", "in_production", "shipped", "delivered"];

export type Customer = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  joinedAt: string;
  measured: number;
  orders: number;
  spentKES: number;
  lastOrderAt: string | null;
  wantsNewReleases: boolean;
};

async function allUsers(admin: ReturnType<typeof createAdminClient>) {
  const users: { id: string; email?: string; created_at: string }[] = [];
  // listUsers pages at up to 1000; keep going until a short page.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

export async function loadCustomers(): Promise<Customer[]> {
  const admin = createAdminClient();
  const [users, { data: profiles }, { data: measurements }, { data: orders }] = await Promise.all([
    allUsers(admin),
    admin.from("profiles").select("id, full_name, phone, role, wants_new_releases, created_at"),
    admin.from("measurements").select("profile_id"),
    admin.from("orders").select("profile_id, status, total_kes, created_at"),
  ]);

  const emailById = new Map(users.map((u) => [u.id, u.email ?? null]));
  const measuredById = new Map<string, number>();
  for (const m of measurements ?? []) measuredById.set(m.profile_id, (measuredById.get(m.profile_id) ?? 0) + 1);

  return (profiles ?? [])
    .map((p) => {
      const mine = (orders ?? []).filter((o) => o.profile_id === p.id);
      const paid = mine.filter((o) => PAID.includes(o.status));
      return {
        id: p.id,
        email: emailById.get(p.id) ?? null,
        name: p.full_name,
        phone: p.phone,
        role: p.role,
        joinedAt: p.created_at,
        measured: measuredById.get(p.id) ?? 0,
        orders: paid.length,
        spentKES: paid.reduce((sum, o) => sum + o.total_kes, 0),
        lastOrderAt: paid.map((o) => o.created_at).sort().at(-1) ?? null,
        wantsNewReleases: p.wants_new_releases,
      };
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export type Subscriber = { email: string; name: string | null; source: "footer" | "account" | "both"; since: string };

/** Everyone who asked to hear about new releases: footer sign-ups plus opted-in accounts, one row per email. */
export async function loadSubscribers(customers: Customer[]): Promise<Subscriber[]> {
  const { data: footer, error } = await createAdminClient().from("newsletter_subscribers").select("email, created_at");
  if (error) throw error;

  const byEmail = new Map<string, Subscriber>();
  for (const row of footer ?? []) {
    byEmail.set(row.email.trim().toLowerCase(), { email: row.email.trim(), name: null, source: "footer", since: row.created_at });
  }
  for (const c of customers) {
    if (!c.wantsNewReleases || !c.email) continue;
    const key = c.email.toLowerCase();
    const existing = byEmail.get(key);
    byEmail.set(
      key,
      existing
        ? { ...existing, name: c.name, source: "both", since: existing.since < c.joinedAt ? existing.since : c.joinedAt }
        : { email: c.email, name: c.name, source: "account", since: c.joinedAt },
    );
  }
  return [...byEmail.values()].sort((a, b) => b.since.localeCompare(a.since));
}
