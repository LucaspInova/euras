begin;

create extension if not exists pgcrypto;
create schema if not exists euras;
create schema if not exists euras_private;

revoke all on schema euras_private from public;
grant usage on schema euras_private to authenticated;

do $$
begin
  if to_regtype('euras.tipo_papel_usuario') is null then
    create type euras.tipo_papel_usuario as enum ('admin', 'aluno', 'parceiro');
  else
    alter type euras.tipo_papel_usuario add value if not exists 'admin';
    alter type euras.tipo_papel_usuario add value if not exists 'aluno';
    alter type euras.tipo_papel_usuario add value if not exists 'parceiro';
  end if;
end
$$;

alter table if exists euras.perfis
  add column if not exists auth_user_id uuid;

alter table if exists euras.perfis
  add column if not exists ativo boolean not null default true;

alter table if exists euras.perfis
  alter column id set default gen_random_uuid();

do $$
declare
  fk_name text;
begin
  select c.conname
    into fk_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
  where n.nspname = 'euras'
    and t.relname = 'perfis'
    and c.contype = 'f'
    and c.confrelid = 'auth.users'::regclass
    and a.attname = 'id'
  limit 1;

  if fk_name is not null then
    execute format('alter table euras.perfis drop constraint %I', fk_name);
  end if;
end
$$;

update euras.perfis p
set auth_user_id = p.id
where p.auth_user_id is null
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
  );

do $$
begin
  if to_regclass('euras.perfis') is not null
     and not exists (
       select 1
       from pg_constraint c
       join pg_class t on t.oid = c.conrelid
       join pg_namespace n on n.oid = t.relnamespace
       where n.nspname = 'euras'
         and t.relname = 'perfis'
         and c.conname = 'perfis_auth_user_id_fkey'
     ) then
    alter table euras.perfis
      add constraint perfis_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null
      not valid;
  end if;
end
$$;

create unique index if not exists uq_euras_perfis_auth_user_id
  on euras.perfis(auth_user_id)
  where auth_user_id is not null;

create index if not exists idx_euras_perfis_auth_user_id
  on euras.perfis(auth_user_id);

create index if not exists idx_euras_perfis_papel_ativo
  on euras.perfis(papel, ativo);

create index if not exists idx_euras_perfis_email_normalizado
  on euras.perfis(lower(email))
  where email is not null;

create or replace function euras_private.perfil_autenticado_id()
returns uuid
language plpgsql
stable
security definer
set search_path = euras, auth, pg_catalog
as $$
declare
  resolved_id uuid;
begin
  select p.id
    into resolved_id
  from euras.perfis p
  where p.auth_user_id = auth.uid()
     or p.id = auth.uid()
  order by case
    when p.auth_user_id = auth.uid() then 0
    when p.id = auth.uid() then 1
    else 2
  end
  limit 1;

  return resolved_id;
end;
$$;

revoke all on function euras_private.perfil_autenticado_id() from public;
grant execute on function euras_private.perfil_autenticado_id() to authenticated;

create or replace function euras_private.usuario_tem_papel(p_papel text)
returns boolean
language sql
stable
security definer
set search_path = euras, auth, pg_catalog
as $$
  select exists (
    select 1
    from euras.perfis p
    where (p.auth_user_id = auth.uid() or p.id = auth.uid())
      and p.papel::text = p_papel
      and p.ativo = true
  );
$$;

revoke all on function euras_private.usuario_tem_papel(text) from public;
grant execute on function euras_private.usuario_tem_papel(text) to authenticated;

do $$
begin
  if to_regclass('euras.perfis') is not null then
    comment on table euras.perfis is
      'Fonte principal de identidade e cadastro dos usuarios EURAS. O papel valido fica em papel: admin, parceiro ou aluno.';
    comment on column euras.perfis.auth_user_id is
      'Vinculo opcional com auth.users(id). Autorizacao deve usar euras.perfis.papel, nao user_metadata.';
    comment on column euras.perfis.papel is
      'Tipo de usuario usado como fonte de verdade: admin, parceiro ou aluno.';
  end if;
end
$$;

commit;
