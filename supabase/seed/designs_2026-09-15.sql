-- First design delivery from Kent, received 2026-09-15 (15 designs).
-- Run once in the Supabase SQL editor. Safe to re-run: existing slugs and
-- variants are left untouched. This is catalogue data, not schema, so it
-- lives outside migrations.
--
-- Everything lands UNPUBLISHED. Publishing is done per design in /admin once
-- it has a real price and imagery (setPublished refuses a design without
-- imagery).
--
-- ⚠️ Placeholders to replace before launch:
--   * unit_price_kes = 100 on every design — the client has not priced them.
--   * collection: this first pass placed four designs in NOIR from Kent's
--     demo file labels ("noir 01–05"). Those were just labels — the brief's
--     table is the source of truth. See designs_2026-09-15_collections.sql.
--
-- Names are Kent's file names and are FINAL (confirmed 2026-09-15). The brief
-- used working names for seven of them: Cracked = Fractured Relic,
-- Illusion = Obscura Strata, Spider Web = Crypt Crawler, Waves = Tidal Form,
-- Kaleidoscope = Tessella, Kaleidoscope 2 = Kaleidoscope,
-- Dimonds = Spikey Sapphire, Jem = Prism.

insert into products (slug, name, collection_id, unit_price_kes, is_published)
select d.slug, d.name, c.id, 100, false
from (values
  ('obscura-strata',  'Obscura Strata',  'noir'),
  ('crypt-crawler',   'Crypt Crawler',   'noir'),
  ('dragon-scale',    'Dragon Scale',    'noir'),
  ('fractured-relic', 'Fractured Relic', 'noir'),
  ('prism',           'Prism',           null),
  ('spikey-sapphire', 'Spikey Sapphire', null),
  ('butterfly-cove',  'Butterfly Cove',  null),
  ('jungle',          'Jungle',          null),
  ('kaleidoscope',    'Kaleidoscope',    null),
  ('leopard-rose',    'Leopard Rose',    null),
  ('rimuru',          'Rimuru',          null),
  ('ripples',         'Ripples',         null),
  ('tessella',        'Tessella',        null),
  ('tidal-form',      'Tidal Form',      null),
  ('turtles-reef',    'Turtle''s Reef',  null)
) as d(slug, name, collection)
left join collections c on c.slug = d.collection
on conflict (slug) do nothing;

-- The five shape variants per design — same rows generateVariants() creates
-- from the admin, so seeded and hand-made designs are indistinguishable.
insert into product_variants (product_id, options, is_published)
select p.id, jsonb_build_object('shape', s.shape), true
from products p
cross join (values ('cubic'), ('square'), ('stiletto'), ('coffin'), ('oval')) as s(shape)
where p.slug in (
  'obscura-strata', 'crypt-crawler', 'dragon-scale', 'fractured-relic', 'prism',
  'spikey-sapphire', 'butterfly-cove', 'jungle', 'kaleidoscope', 'leopard-rose',
  'rimuru', 'ripples', 'tessella', 'tidal-form', 'turtles-reef'
)
on conflict (product_id, options) do nothing;

-- Collections were seeded unpublished, which is why /collections is empty.
-- Publishing them only makes the three collection pages visible; designs
-- inside still need publishing one by one.
update collections set is_published = true where slug in ('sublime', 'opulence', 'noir');
