-- Dispatch details (admin order flow, 2026-09-15). An order moves to 'shipped'
-- only through the dispatch form, which records who is carrying it — so the
-- customer's "On its way" always comes with something they can follow up on.

alter table orders
  add column courier       text,
  add column tracking_ref  text,
  add column dispatched_at timestamptz;

comment on column orders.courier is 'Courier or delivery method, e.g. "G4S", "Rider — Brian".';
comment on column orders.tracking_ref is 'Waybill / tracking number, if the courier issues one.';
