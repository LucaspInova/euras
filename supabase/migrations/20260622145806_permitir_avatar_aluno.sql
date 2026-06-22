insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists auth_select_own_avatar on storage.objects;
drop policy if exists auth_upload_own_avatar on storage.objects;
drop policy if exists auth_update_own_avatar on storage.objects;
drop policy if exists auth_delete_own_avatar on storage.objects;

create policy auth_select_own_avatar
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from euras.perfis p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.id = (select auth.uid())
          or p.auth_user_id = (select auth.uid())
        )
    )
  )
);

create policy auth_upload_own_avatar
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from euras.perfis p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.id = (select auth.uid())
          or p.auth_user_id = (select auth.uid())
        )
    )
  )
);

create policy auth_update_own_avatar
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from euras.perfis p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.id = (select auth.uid())
          or p.auth_user_id = (select auth.uid())
        )
    )
  )
)
with check (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from euras.perfis p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.id = (select auth.uid())
          or p.auth_user_id = (select auth.uid())
        )
    )
  )
);

create policy auth_delete_own_avatar
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from euras.perfis p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.id = (select auth.uid())
          or p.auth_user_id = (select auth.uid())
        )
    )
  )
);
