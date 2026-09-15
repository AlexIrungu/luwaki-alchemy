-- LUWAKI COLLECTIVE — core schema
--
-- Design rule that governs this whole file: NOTHING here says "nail".
-- Nails are the launch category, not the ceiling. Category-specific behaviour
-- (the 5 shapes, the 10-slot set, finger position) lives in `variant_options`
-- jsonb and in `collections.purchase_mode` — never in a column name.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

-- How a category is bought. `set_of_10` is the press-on nail behaviour: the
-- cart holds exactly 10 slots and every slot must be filled to check out.
create type purchase_mode as enum ('single', 'set_of_10');

create table collections (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,               -- SUBLIME / OPULENCE / NOIR
  verb          text,                        -- DREAM / EMBODY / CONJURE
  tagline       text,
  purchase_mode purchase_mode not null default 'set_of_10',
  sort_order    int not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table products (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid references collections(id) on delete restrict,
  slug           text not null unique,
  name           text not null,              -- "Dragon Scales"
  description    text,
  -- Per-UNIT price. For nails that means the price of ONE nail; a 10-slot set
  -- totals the sum of its slots. Integer cents of KES — never floats.
  unit_price_kes int not null check (unit_price_kes >= 0),
  is_published   boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on products (collection_id) where is_published;

-- A variant is a concrete buyable thing: this design in this shape.
-- `options` is jsonb so a future category can carry different axes entirely.
create table product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  sku            text unique,
  options        jsonb not null default '{}'::jsonb,   -- {"shape": "stiletto"}
  -- Null means "inherit the product price". Set it only when a variant costs
  -- differently — a stiletto may use more resin than a square.
  price_kes      int check (price_kes >= 0),
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);

create unique index on product_variants (product_id, options);
create index on product_variants using gin (options);

create type media_kind as enum ('image', 'model', 'video');

create table product_media (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  variant_id  uuid references product_variants(id) on delete cascade,
  kind        media_kind not null default 'image',
  url         text not null,
  alt         text,
  sort_order  int not null default 0
);

create index on product_media (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create type app_role as enum ('customer', 'admin');

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  phone                 text,
  role                  app_role not null default 'customer',
  preferred_collection  uuid references collections(id) on delete set null,
  wants_new_releases    boolean not null default false,
  created_at            timestamptz not null default now()
);

-- Measurements are PRODUCTION DATA, not a profile nicety: an order is printed
-- to spec off these. Ten rows per customer, one per finger. Relational rather
-- than a jsonb blob precisely so "are all ten present?" is a query, not a hope.
create type hand as enum ('left', 'right');
create type finger as enum ('thumb', 'index', 'middle', 'ring', 'pinky');

create table measurements (
  profile_id  uuid not null references profiles(id) on delete cascade,
  hand        hand not null,
  finger      finger not null,
  width_mm    numeric(4,1) not null check (width_mm between 5 and 25),
  updated_at  timestamptz not null default now(),
  primary key (profile_id, hand, finger)
);

-- Checkout gate: a customer cannot order until all ten are on file.
create view profile_measurement_status as
  select p.id as profile_id,
         count(m.*) as measured,
         count(m.*) = 10 as is_complete
  from profiles p
  left join measurements m on m.profile_id = p.id
  group by p.id;

-- ---------------------------------------------------------------------------
-- Cart
-- ---------------------------------------------------------------------------

create table carts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on carts (profile_id);

create table cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references carts(id) on delete cascade,
  -- Which of the ten slots this fills. Null for `single` purchase modes.
  slot_hand   hand,
  slot_finger finger,
  variant_id  uuid not null references product_variants(id) on delete restrict,
  qty         int not null default 1 check (qty > 0),
  created_at  timestamptz not null default now()
);

-- One item per finger. This is what makes "empty slot blocks checkout"
-- enforceable rather than a front-end convention.
create unique index on cart_items (cart_id, slot_hand, slot_finger)
  where slot_hand is not null;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create type order_status as enum (
  'pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded'
);

create table orders (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete restrict,
  reference         text not null unique,          -- Paystack reference
  status            order_status not null default 'pending_payment',
  subtotal_kes      int not null check (subtotal_kes >= 0),
  shipping_kes      int not null default 0 check (shipping_kes >= 0),
  total_kes         int not null check (total_kes >= 0),
  -- Sizes are COPIED here at checkout, never read live from `measurements`.
  -- A customer editing their profile three weeks later must not silently
  -- change what the workshop is printing.
  measurements      jsonb not null,
  shipping_address  jsonb,
  packaging         text,
  notes             text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index on orders (profile_id, created_at desc);
create index on orders (status) where status in ('paid', 'in_production');

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  variant_id   uuid references product_variants(id) on delete set null,
  slot_hand    hand,
  slot_finger  finger,
  qty          int not null default 1 check (qty > 0),
  -- Snapshots. The catalogue reprices monthly; an invoice must not move.
  product_name text not null,
  options      jsonb not null default '{}'::jsonb,
  unit_price_kes int not null check (unit_price_kes >= 0)
);

create index on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Wishlists · PRIVATE EDIT commissions
-- ---------------------------------------------------------------------------

create table wishlist_items (
  profile_id  uuid not null references profiles(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, product_id)
);

create type commission_stage as enum ('brief', 'sculpting', 'finalization', 'complete', 'declined');

-- PRIVATE EDIT has no contact form by design — the customer must have an
-- account, and their details come from the profile.
create table commissions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  stage       commission_stage not null default 'brief',
  brief       text not null,
  reference_urls text[],
  quoted_kes  int check (quoted_kes >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on commissions (stage, created_at desc);

create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
