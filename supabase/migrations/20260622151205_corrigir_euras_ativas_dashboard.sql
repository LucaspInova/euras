create or replace view euras.v_dashboard_kpis as
select
  coalesce(
    (
      select sum(
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
      )
      from euras.razao_carteira rc
    ),
    0
  ) as euras_ativas,
  (
    select count(*)
    from euras.perfis p
    where p.papel = 'aluno'::euras.tipo_papel_usuario
      and p.ativo = true
  ) as alunos_cadastrados,
  8.9 as avaliacao_app;
