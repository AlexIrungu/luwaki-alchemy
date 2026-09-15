-- LUWAKI COLLECTIVE — row level security
--
-- Shape of the policy set: the catalogue is world-readable when published
-- (browsing is open to anyone), everything customer-owned is private to its
-- owner, and admins see all. Writes to the catalogue are admin-only.

-- An admin check as a security-definer function, so policies can call it
-- without recursing into `profiles`' own RLS.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table collections      enable row level security;
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table product_media    enable row level security;
alter table profiles         enable row level security;
alter table measurements     enable row level security;
alter table carts            enable row level security;
alter table cart_items       enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table wishlist_items   enable row level security;
alter table commissions      enable row level security;
alter table contact_messages enable row level security;

-- Catalogue: public reads published rows, admins do everything.
create policy "published collections are public" on collections
  for select using (is_published or is_admin());
create policy "admins write collections" on collections
  for all using (is_admin()) with check (is_admin());

create policy "published products are public" on products
  for select using (is_published or is_admin());
create policy "admins write products" on products
  for all using (is_admin()) with check (is_admin());

create policy "published variants are public" on product_variants
  for select using (is_published or is_admin());
create policy "admins write variants" on product_variants
  for all using (is_admin()) with check (is_admin());

create policy "media follows its product" on product_media
  for select using (
    exists (select 1 from products p where p.id = product_id and (p.is_published or is_admin()))
  );
create policy "admins write media" on product_media
  for all using (is_admin()) with check (is_admin());

-- Profiles: you see and edit yourself. Note the `with check` on role — without
-- it a customer could promote themselves to admin with one PATCH.
create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid() and role = 'customer');
create policy "update own profile" on profiles
  for update using (id = auth.uid() or is_admin())
  with check ((id = auth.uid() and role = 'customer') or is_admin());

-- Measurements: private production data.
create policy "own measurements" on measurements
  for all using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid());

create policy "own cart" on carts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "own cart items" on cart_items
  for all using (exists (select 1 from carts c where c.id = cart_id and c.profile_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.profile_id = auth.uid()));

-- Orders are readable by their owner but never writable by them: they are
-- created server-side after Paystack confirms, using the service role.
create policy "read own orders" on orders
  for select using (profile_id = auth.uid() or is_admin());
create policy "admins manage orders" on orders
  for all using (is_admin()) with check (is_admin());

create policy "read own order items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.profile_id = auth.uid() or is_admin()))
  );
create policy "admins manage order items" on order_items
  for all using (is_admin()) with check (is_admin());

create policy "own wishlist" on wishlist_items
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "own commissions" on commissions
  for select using (profile_id = auth.uid() or is_admin());
create policy "create own commission" on commissions
  for insert with check (profile_id = auth.uid());
create policy "admins manage commissions" on commissions
  for all using (is_admin()) with check (is_admin());

create policy "anyone can send a message" on contact_messages
  for insert with check (true);
create policy "admins read messages" on contact_messages
  for select using (is_admin());

-- A profile row must exist for every auth user, or the mandatory-account
-- checkout path has nothing to read.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
