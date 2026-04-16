-- Habilite RLS na tabela de perfis
alter table public.profiles enable row level security;

-- Permissoes minimas para clientes autenticados no frontend
revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;

-- Cada usuario autenticado pode ler apenas o proprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Cada usuario autenticado pode atualizar apenas a propria linha
-- (necessario para atualizar last_login_at via frontend, quando desejado)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Opcional: caso queira permitir criacao de perfil pelo proprio usuario
-- drop policy if exists "profiles_insert_own" on public.profiles;
-- create policy "profiles_insert_own"
-- on public.profiles
-- for insert
-- to authenticated
-- with check (id = auth.uid());
