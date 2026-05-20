begin;

create schema if not exists euras_private;

revoke all on schema euras_private from public;
grant usage on schema euras_private to authenticated;

alter table if exists euras.resgates
  add column if not exists motivo_recusa text;

create or replace function euras_private.perfil_autenticado_id()
returns uuid
language plpgsql
stable
security definer
set search_path = euras, auth, pg_catalog
as $$
declare
  resolved_id uuid;
  has_auth_user_id boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'euras'
      and table_name = 'perfis'
      and column_name = 'auth_user_id'
  )
  into has_auth_user_id;

  if has_auth_user_id then
    execute $query$
      select p.id
      from euras.perfis p
      where p.id = auth.uid()
         or p.auth_user_id = auth.uid()
      order by case when p.id = auth.uid() then 0 else 1 end
      limit 1
    $query$
    into resolved_id;
  else
    select p.id
      into resolved_id
    from euras.perfis p
    where p.id = auth.uid()
    limit 1;
  end if;

  return resolved_id;
end;
$$;

revoke all on function euras_private.perfil_autenticado_id() from public;
grant execute on function euras_private.perfil_autenticado_id() to authenticated;

create or replace function euras_private.recusar_resgate_parceiro(
  p_resgate_id uuid,
  p_motivo text
)
returns table (
  id uuid,
  aluno_id uuid,
  produto_id uuid,
  valor_euras integer,
  status euras.status_resgate,
  criado_em timestamptz,
  confirmado_em timestamptz,
  motivo_recusa text
)
language plpgsql
security definer
set search_path = euras, auth, pg_catalog
as $$
declare
  v_parceiro_id uuid;
  v_resgate euras.resgates%rowtype;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_agora timestamptz := timezone('utc', now());
begin
  if v_motivo is null then
    raise exception 'Informe o motivo para recusar a solicitacao.';
  end if;

  v_parceiro_id := euras_private.perfil_autenticado_id();

  if v_parceiro_id is null then
    raise exception 'Sessao expirada. Faca login novamente.';
  end if;

  select r.*
    into v_resgate
  from euras.resgates r
  where r.id = p_resgate_id
  for update;

  if not found then
    raise exception 'Solicitacao nao encontrada.';
  end if;

  if v_resgate.parceiro_id is distinct from v_parceiro_id then
    raise exception 'Sem permissao para recusar esta solicitacao.';
  end if;

  if v_resgate.status <> 'pendente'::euras.status_resgate then
    raise exception 'Solicitacao nao encontrada ou ja processada.';
  end if;

  update euras.resgates r
  set
    status = 'cancelado'::euras.status_resgate,
    confirmado_por = v_parceiro_id,
    confirmado_em = v_agora,
    motivo_recusa = v_motivo
  where r.id = v_resgate.id
  returning r.*
    into v_resgate;

  insert into euras.razao_carteira (
    aluno_id,
    tipo_entrada,
    valor,
    resgate_id,
    criado_por,
    observacao,
    criado_em
  )
  values (
    v_resgate.aluno_id,
    'credito'::euras.tipo_lancamento_razao,
    v_resgate.valor_euras,
    v_resgate.id,
    v_parceiro_id,
    'Estorno automatico por recusa de resgate: ' || v_motivo,
    v_agora
  );

  if to_regclass('euras.lancamentos_alunos') is not null
     and to_regclass('euras.alunos') is not null
     and exists (
       select 1
       from euras.alunos a
       where a.id = v_resgate.aluno_id
     ) then
    insert into euras.lancamentos_alunos (
      aluno_id,
      tipo,
      valor,
      observacao,
      criado_por,
      criado_em
    )
    values (
      v_resgate.aluno_id,
      'credito'::euras.tipo_lancamento_aluno,
      v_resgate.valor_euras,
      'Estorno automatico por recusa de resgate: ' || v_motivo,
      v_parceiro_id,
      v_agora
    );
  end if;

  return query
  select
    v_resgate.id,
    v_resgate.aluno_id,
    v_resgate.produto_id,
    v_resgate.valor_euras,
    v_resgate.status,
    v_resgate.criado_em,
    v_resgate.confirmado_em,
    v_resgate.motivo_recusa;
end;
$$;

revoke all on function euras_private.recusar_resgate_parceiro(uuid, text) from public;
grant execute on function euras_private.recusar_resgate_parceiro(uuid, text) to authenticated;

create or replace function euras.recusar_resgate_parceiro(
  p_resgate_id uuid,
  p_motivo text
)
returns table (
  id uuid,
  aluno_id uuid,
  produto_id uuid,
  valor_euras integer,
  status euras.status_resgate,
  criado_em timestamptz,
  confirmado_em timestamptz,
  motivo_recusa text
)
language sql
volatile
security invoker
set search_path = euras, euras_private, pg_catalog
as $$
  select *
  from euras_private.recusar_resgate_parceiro(p_resgate_id, p_motivo);
$$;

revoke all on function euras.recusar_resgate_parceiro(uuid, text) from public;
grant execute on function euras.recusar_resgate_parceiro(uuid, text) to authenticated;

commit;
