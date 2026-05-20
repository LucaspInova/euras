begin;

create schema if not exists euras_private;

revoke all on schema euras_private from public;
grant usage on schema euras_private to authenticated;

create or replace function euras_private.desativar_produtos_por_perfil_parceiro(
  p_perfil_parceiro_id uuid
)
returns void
language plpgsql
security definer
set search_path = euras, pg_catalog
as $$
begin
  if p_perfil_parceiro_id is null then
    return;
  end if;

  if to_regclass('euras.produtos') is null then
    return;
  end if;

  update euras.produtos
     set ativo = false
   where perfil_parceiro_id = p_perfil_parceiro_id
     and ativo is distinct from false;
end;
$$;

revoke all on function euras_private.desativar_produtos_por_perfil_parceiro(uuid) from public;

create or replace function euras_private.desativar_produtos_ao_desativar_parceiro()
returns trigger
language plpgsql
security definer
set search_path = euras, pg_catalog
as $$
begin
  perform euras_private.desativar_produtos_por_perfil_parceiro(new.perfil_parceiro_id);
  return new;
end;
$$;

revoke all on function euras_private.desativar_produtos_ao_desativar_parceiro() from public;

create or replace function euras_private.desativar_produtos_ao_desativar_perfil_parceiro()
returns trigger
language plpgsql
security definer
set search_path = euras, pg_catalog
as $$
begin
  if new.papel::text = 'parceiro' then
    perform euras_private.desativar_produtos_por_perfil_parceiro(new.id);
  end if;

  return new;
end;
$$;

revoke all on function euras_private.desativar_produtos_ao_desativar_perfil_parceiro() from public;

do $$
begin
  if to_regclass('euras.parceiros') is not null then
    execute 'drop trigger if exists desativar_produtos_ao_desativar_parceiro on euras.parceiros';

    execute $trigger$
    create trigger desativar_produtos_ao_desativar_parceiro
      after update of ativo on euras.parceiros
      for each row
      when (
        old.ativo is distinct from new.ativo
        and new.ativo is false
      )
      execute function euras_private.desativar_produtos_ao_desativar_parceiro()
    $trigger$;
  end if;

  if to_regclass('euras.perfis') is not null then
    execute 'drop trigger if exists desativar_produtos_ao_desativar_perfil_parceiro on euras.perfis';

    execute $trigger$
    create trigger desativar_produtos_ao_desativar_perfil_parceiro
      after update of ativo on euras.perfis
      for each row
      when (
        old.ativo is distinct from new.ativo
        and new.ativo is false
      )
      execute function euras_private.desativar_produtos_ao_desativar_perfil_parceiro()
    $trigger$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('euras.produtos') is null then
    return;
  end if;

  if to_regclass('euras.parceiros') is not null then
    execute $sql$
      update euras.produtos p
         set ativo = false
       where p.ativo is distinct from false
         and (
           p.perfil_parceiro_id is null
           or not exists (
             select 1
               from euras.parceiros pa
              where pa.perfil_parceiro_id = p.perfil_parceiro_id
                and pa.ativo is distinct from false
           )
         )
    $sql$;
  elsif to_regclass('euras.perfis') is not null then
    execute $sql$
      update euras.produtos p
         set ativo = false
       where p.ativo is distinct from false
         and (
           p.perfil_parceiro_id is null
           or not exists (
             select 1
               from euras.perfis pf
              where pf.id = p.perfil_parceiro_id
                and pf.papel::text = 'parceiro'
                and pf.ativo is distinct from false
           )
         )
    $sql$;
  end if;
end;
$$;

commit;
