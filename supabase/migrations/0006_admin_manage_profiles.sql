-- Soprano 0006 — Admin pode gerenciar profiles
-- Permite que admins alterem role, full_name, company, phone de outros usuários.

drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Admins precisam ler todos os perfis (já existe, mas reforçando)
drop policy if exists profiles_admin_read_all on profiles;
create policy profiles_admin_read_all on profiles
  for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
