-- Product media lives in a public bucket: the catalogue is public, and a
-- signed URL per image would defeat CDN caching on a page showing dozens.
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

create policy "product media is publicly readable" on storage.objects
  for select using (bucket_id = 'product-media');

create policy "admins upload product media" on storage.objects
  for insert with check (bucket_id = 'product-media' and is_admin());

create policy "admins replace product media" on storage.objects
  for update using (bucket_id = 'product-media' and is_admin())
  with check (bucket_id = 'product-media' and is_admin());

create policy "admins delete product media" on storage.objects
  for delete using (bucket_id = 'product-media' and is_admin());
