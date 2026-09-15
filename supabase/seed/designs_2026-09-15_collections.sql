-- Collection placement for the first 15 designs, from the brief (Lucy's
-- LUWAKI.docx), translated to the final design names. Replaces the NOIR
-- guesses made by designs_2026-09-15.sql. Safe to re-run.

update products p
set collection_id = c.id, updated_at = now()
from (values
  ('butterfly-cove',  'sublime'),
  ('fractured-relic', 'sublime'),   -- brief: Cracked
  ('spikey-sapphire', 'sublime'),   -- brief: Dimonds
  ('dragon-scale',    'sublime'),
  ('obscura-strata',  'sublime'),   -- brief: Illusion

  ('prism',           'opulence'),  -- brief: Jem
  ('jungle',          'opulence'),
  ('tessella',        'opulence'),  -- brief: Kaleidoscope
  ('kaleidoscope',    'opulence'),  -- brief: Kaleidoscope 2
  ('leopard-rose',    'opulence'),

  ('rimuru',          'noir'),
  ('ripples',         'noir'),
  ('crypt-crawler',   'noir'),      -- brief: Spider Web
  ('turtles-reef',    'noir'),
  ('tidal-form',      'noir')       -- brief: Waves
) as m(slug, collection)
join collections c on c.slug = m.collection
where p.slug = m.slug;

-- Expect 5 / 5 / 5.
select c.name, count(p.id) from collections c
left join products p on p.collection_id = c.id
group by c.name, c.sort_order order by c.sort_order;
