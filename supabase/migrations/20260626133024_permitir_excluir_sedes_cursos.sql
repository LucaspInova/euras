begin;

grant delete on euras.sedes to authenticated, service_role;
grant delete on euras.cursos to authenticated, service_role;

drop policy if exists "euras_sedes_admin_excluir" on euras.sedes;
create policy "euras_sedes_admin_excluir"
on euras.sedes
for delete
to authenticated
using (euras_private.usuario_tem_papel('admin'));

drop policy if exists "euras_cursos_admin_excluir" on euras.cursos;
create policy "euras_cursos_admin_excluir"
on euras.cursos
for delete
to authenticated
using (euras_private.usuario_tem_papel('admin'));

commit;
