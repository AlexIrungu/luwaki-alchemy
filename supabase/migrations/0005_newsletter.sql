-- Footer newsletter sign-up (vanguart-style footer, 2026-09-15).
-- Separate from profiles.new_release_opt_in: this list is for visitors who
-- have no account yet. Same shape as contact_messages — anyone can write,
-- only admins can read.

create table newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

create policy "anyone can subscribe" on newsletter_subscribers
  for insert with check (true);
create policy "admins read subscribers" on newsletter_subscribers
  for select using (is_admin());
