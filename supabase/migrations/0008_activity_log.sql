-- Activity log (admin, 2026-09-15). Append-only record of who did what:
-- order placed / paid / status changes (with the reason for a cancel or
-- refund) / dispatch, and catalogue price and publish changes. It is the order
-- timeline and the answer to "who marked this refunded?".
--
-- entity_type is text, not an enum: the catalogue grows past nails and the log
-- should not need a migration for every new kind of thing it records.

create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  -- null = the system (Paystack webhook, payment verification).
  actor_id     uuid references profiles(id) on delete set null,
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  from_status  text,
  to_status    text,
  note         text,
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index on activity_log (entity_type, entity_id, created_at desc);

alter table activity_log enable row level security;

-- Admins read everything and may only write entries in their own name.
-- No update or delete policy: the log is append-only. System entries are
-- written with the service role, which bypasses RLS.
create policy activity_log_admin_read on activity_log
  for select using (is_admin());
create policy activity_log_admin_insert on activity_log
  for insert with check (is_admin() and actor_id = auth.uid());
