-- Prices are VAT-exclusive (client, 2026-09-15): the catalogue holds net
-- per-nail prices and VAT is added at checkout. The VAT line is stored on the
-- order so an invoice never has to recompute it. Orders placed before this
-- migration carry 0 — they were test orders.

alter table orders
  add column vat_kes int not null default 0 check (vat_kes >= 0);

comment on column orders.vat_kes is 'VAT charged, integer KES. total_kes = subtotal_kes + shipping_kes + vat_kes.';
