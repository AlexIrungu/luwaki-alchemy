-- Contact page rework (2026-09-15): messages carry a topic, the sender's
-- account and phone when signed in, and optionally the order they're about.

alter table contact_messages
  add column topic      text not null default 'other'
    check (topic in ('order', 'sizing', 'shipping', 'collaboration', 'other')),
  add column profile_id uuid references profiles(id) on delete set null,
  add column order_id   uuid references orders(id) on delete set null,
  add column phone      text;

create index on contact_messages (handled, created_at desc);

-- The old policy accepted any row (`with check (true)`), which would now let
-- anyone attach someone else's account or order to a message. A message may
-- only name its sender, and only link one of that sender's own orders.
drop policy "anyone can send a message" on contact_messages;
create policy "anyone can send a message" on contact_messages
  for insert with check (
    (profile_id is null or profile_id = auth.uid())
    and (
      order_id is null
      or exists (select 1 from orders o where o.id = order_id and o.profile_id = auth.uid())
    )
  );
