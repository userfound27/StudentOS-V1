-- Profile avatar storage. Run after schema.sql when configuring a new StudentOS project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studentos-avatars', 'studentos-avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "StudentOS avatar uploads are owned by the user" on storage.objects;
create policy "StudentOS avatar uploads are owned by the user" on storage.objects for insert to authenticated
with check (bucket_id = 'studentos-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "StudentOS avatar updates are owned by the user" on storage.objects;
create policy "StudentOS avatar updates are owned by the user" on storage.objects for update to authenticated
using (bucket_id = 'studentos-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'studentos-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "StudentOS avatar deletes are owned by the user" on storage.objects;
create policy "StudentOS avatar deletes are owned by the user" on storage.objects for delete to authenticated
using (bucket_id = 'studentos-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
