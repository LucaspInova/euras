begin;

alter table if exists euras.perfis
  drop constraint if exists perfis_curso_id_fkey;

alter table if exists euras.perfis
  add constraint perfis_curso_id_fkey
  foreign key (curso_id)
  references euras.cursos(id)
  on delete set null;

alter table if exists euras.alunos
  drop constraint if exists alunos_curso_id_fkey;

alter table if exists euras.alunos
  add constraint alunos_curso_id_fkey
  foreign key (curso_id)
  references euras.cursos(id)
  on delete set null;

comment on constraint perfis_curso_id_fkey on euras.perfis is
  'Ao excluir um curso, preserva o perfil do aluno e limpa apenas a referencia estruturada.';

comment on constraint alunos_curso_id_fkey on euras.alunos is
  'Ao excluir um curso, preserva o aluno legado e limpa apenas a referencia estruturada.';

commit;
