-- Required by Storage upsert so users can replace their own avatar.
drop policy if exists "StudentOS avatar reads are owned by the user" on storage.objects;
create policy "StudentOS avatar reads are owned by the user" on storage.objects for select to authenticated
using (bucket_id = 'studentos-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
