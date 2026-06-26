begin;

create extension if not exists pgcrypto;
create schema if not exists euras;
create schema if not exists euras_private;

revoke all on schema euras_private from public;
grant usage on schema euras_private to authenticated;

create or replace function euras.definir_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = timezone('utc', now());
  return new;
end;
$$;

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

create table if not exists euras.sedes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

create table if not exists euras.cursos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references euras.sedes(id) on delete restrict,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now()),
  unique (sede_id, nome)
);

alter table if exists euras.perfis
  add column if not exists sede_id uuid references euras.sedes(id),
  add column if not exists curso_id uuid references euras.cursos(id);

alter table if exists euras.alunos
  add column if not exists sede_id uuid references euras.sedes(id),
  add column if not exists curso_id uuid references euras.cursos(id);

create index if not exists idx_euras_sedes_nome on euras.sedes(nome);
create index if not exists idx_euras_sedes_ativo on euras.sedes(ativo);
create index if not exists idx_euras_cursos_sede_id on euras.cursos(sede_id);
create index if not exists idx_euras_cursos_ativo on euras.cursos(ativo);
create index if not exists idx_euras_perfis_sede_id on euras.perfis(sede_id);
create index if not exists idx_euras_perfis_curso_id on euras.perfis(curso_id);
create index if not exists idx_euras_alunos_sede_id on euras.alunos(sede_id);
create index if not exists idx_euras_alunos_curso_id on euras.alunos(curso_id);

drop trigger if exists trg_euras_sedes_atualizado_em on euras.sedes;
create trigger trg_euras_sedes_atualizado_em
before update on euras.sedes
for each row
execute function euras.definir_atualizado_em();

drop trigger if exists trg_euras_cursos_atualizado_em on euras.cursos;
create trigger trg_euras_cursos_atualizado_em
before update on euras.cursos
for each row
execute function euras.definir_atualizado_em();

with sedes_atuais as (
  select distinct upper(btrim(campus)) as nome
  from euras.perfis
  where nullif(btrim(campus), '') is not null
  union
  select distinct upper(btrim(campus)) as nome
  from euras.alunos
  where nullif(btrim(campus), '') is not null
)
insert into euras.sedes (nome)
select nome
from sedes_atuais
where nome is not null
on conflict (nome) do nothing;

with cursos_atuais as (
  select distinct
    upper(btrim(campus)) as sede_nome,
    upper(btrim(curso)) as curso_nome
  from euras.perfis
  where nullif(btrim(campus), '') is not null
    and nullif(btrim(curso), '') is not null
  union
  select distinct
    upper(btrim(campus)) as sede_nome,
    upper(btrim(curso)) as curso_nome
  from euras.alunos
  where nullif(btrim(campus), '') is not null
    and nullif(btrim(curso), '') is not null
)
insert into euras.cursos (sede_id, nome)
select s.id, ca.curso_nome
from cursos_atuais ca
join euras.sedes s on s.nome = ca.sede_nome
where ca.curso_nome is not null
on conflict (sede_id, nome) do nothing;

update euras.perfis p
set
  sede_id = s.id,
  curso_id = c.id
from euras.sedes s
left join euras.cursos c on c.sede_id = s.id
where s.nome = upper(btrim(p.campus))
  and c.nome = upper(btrim(p.curso))
  and (p.sede_id is null or p.curso_id is null);

update euras.alunos a
set
  sede_id = s.id,
  curso_id = c.id
from euras.sedes s
left join euras.cursos c on c.sede_id = s.id
where s.nome = upper(btrim(a.campus))
  and c.nome = upper(btrim(a.curso))
  and (a.sede_id is null or a.curso_id is null);

alter table euras.sedes enable row level security;
alter table euras.cursos enable row level security;

grant usage on schema euras to authenticated, service_role;
grant select, insert, update on euras.sedes to authenticated, service_role;
grant select, insert, update on euras.cursos to authenticated, service_role;

drop policy if exists "euras_sedes_ler_ativas_ou_admin" on euras.sedes;
create policy "euras_sedes_ler_ativas_ou_admin"
on euras.sedes
for select
to authenticated
using (
  ativo = true
  or euras_private.usuario_tem_papel('admin')
);

drop policy if exists "euras_sedes_admin_inserir" on euras.sedes;
create policy "euras_sedes_admin_inserir"
on euras.sedes
for insert
to authenticated
with check (euras_private.usuario_tem_papel('admin'));

drop policy if exists "euras_sedes_admin_atualizar" on euras.sedes;
create policy "euras_sedes_admin_atualizar"
on euras.sedes
for update
to authenticated
using (euras_private.usuario_tem_papel('admin'))
with check (euras_private.usuario_tem_papel('admin'));

drop policy if exists "euras_cursos_ler_ativos_ou_admin" on euras.cursos;
create policy "euras_cursos_ler_ativos_ou_admin"
on euras.cursos
for select
to authenticated
using (
  (
    ativo = true
    and exists (
      select 1
      from euras.sedes s
      where s.id = cursos.sede_id
        and s.ativo = true
    )
  )
  or euras_private.usuario_tem_papel('admin')
);

drop policy if exists "euras_cursos_admin_inserir" on euras.cursos;
create policy "euras_cursos_admin_inserir"
on euras.cursos
for insert
to authenticated
with check (euras_private.usuario_tem_papel('admin'));

drop policy if exists "euras_cursos_admin_atualizar" on euras.cursos;
create policy "euras_cursos_admin_atualizar"
on euras.cursos
for update
to authenticated
using (euras_private.usuario_tem_papel('admin'))
with check (euras_private.usuario_tem_papel('admin'));

create or replace view euras.alunos_com_saldo
with (security_invoker = true) as
select
  p.id,
  p.nome_completo,
  p.telefone,
  p.email,
  coalesce(p.campus, s.nome) as campus,
  coalesce(p.curso, c.nome) as curso,
  p.data_entrada,
  p.ativo,
  p.criado_em,
  p.atualizado_em,
  coalesce(
    sum(
      case
        when rc.tipo_entrada in (
          'credito'::euras.tipo_lancamento_razao,
          'ajuste'::euras.tipo_lancamento_razao
        ) then rc.valor
        when rc.tipo_entrada in (
          'debito'::euras.tipo_lancamento_razao,
          'resgate'::euras.tipo_lancamento_razao
        ) then -rc.valor
        else 0
      end
    ),
    0
  ) as saldo_euras,
  p.sede_id,
  s.nome as sede_nome,
  p.curso_id,
  c.nome as curso_nome
from euras.perfis p
left join euras.razao_carteira rc on rc.aluno_id = p.id
left join euras.sedes s on s.id = p.sede_id
left join euras.cursos c on c.id = p.curso_id
where p.papel = 'aluno'::euras.tipo_papel_usuario
group by
  p.id,
  p.nome_completo,
  p.telefone,
  p.email,
  p.campus,
  p.curso,
  p.data_entrada,
  p.ativo,
  p.criado_em,
  p.atualizado_em,
  p.sede_id,
  s.nome,
  p.curso_id,
  c.nome;

grant select on euras.alunos_com_saldo to authenticated, service_role;

comment on table euras.sedes is 'Sedes disponiveis para cadastro e organizacao de alunos.';
comment on table euras.cursos is 'Cursos vinculados a uma sede.';
comment on column euras.perfis.sede_id is 'Referencia estruturada para euras.sedes; campus textual fica mantido por compatibilidade.';
comment on column euras.perfis.curso_id is 'Referencia estruturada para euras.cursos; curso textual fica mantido por compatibilidade.';
comment on column euras.alunos.sede_id is 'Referencia estruturada para euras.sedes; campus textual fica mantido por compatibilidade.';
comment on column euras.alunos.curso_id is 'Referencia estruturada para euras.cursos; curso textual fica mantido por compatibilidade.';

commit;
