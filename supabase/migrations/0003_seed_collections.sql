-- The three collections and their verbs, from the brief's site map.
-- Designs are NOT seeded: the collection→design mapping is still unconfirmed
-- and "Dimonds" has to be settled before it becomes a URL slug.

insert into collections (slug, name, verb, sort_order, purchase_mode, is_published) values
  ('sublime',  'SUBLIME',  'DREAM',   1, 'set_of_10', false),
  ('opulence', 'OPULENCE', 'EMBODY',  2, 'set_of_10', false),
  ('noir',     'NOIR',     'CONJURE', 3, 'set_of_10', false)
on conflict (slug) do nothing;
