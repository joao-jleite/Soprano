-- Soprano 0009 — Corrigir recursão infinita na RLS de profiles
--
-- PROBLEMA: migration 0006 criou profiles_admin_read_all com:
--   exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
--
-- Isso consulta a tabela profiles DENTRO de uma policy da tabela profiles,
-- causando recursão infinita (PostgreSQL error 42P17).
--
-- SOLUÇÃO: dropar a policy redundante.
-- A policy profiles_self_read (migration 0001) já cobre admin:
--   using (auth.uid() = id or current_role_name() = 'admin')
-- current_role_name() é SECURITY DEFINER — roda como postgres, bypass RLS, sem recursão.

drop policy if exists profiles_admin_read_all on profiles;

-- Também garante que profiles_admin_update (0006) não tem o mesmo problema
-- (a versão atual usa exists(select from profiles), trocar para current_role_name)
drop policy if exists profiles_admin_update on profiles;

create policy profiles_admin_update on profiles
  for update
  using (auth.uid() = id or current_role_name() = 'admin')
  with check (auth.uid() = id or current_role_name() = 'admin');
