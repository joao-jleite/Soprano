-- Soprano 0019 — Corrige escalonamento de privilégio em profiles
--
-- PROBLEMA: as policies de UPDATE de profiles (0001 profiles_self_update e
-- 0009 profiles_admin_update) reduzem-se a `auth.uid() = id OR admin` SEM
-- restrição de coluna. Um cliente/supervisor autenticado pode chamar a REST
-- do Supabase diretamente (anon key + próprio JWT) e setar o próprio
-- role = 'admin' — RLS permite, pois auth.uid() = id. O guard de aplicação
-- em updateProfile() é irrelevante porque o cliente não passa por ele.
--
-- SOLUÇÃO: trigger BEFORE UPDATE que bloqueia mudança de `role` quando o autor
-- não é admin. Funciona mesmo contra chamadas REST diretas.
--   - auth.uid() null  → service role / migração / seed → permitido (confiável)
--   - autor admin       → permitido
--   - cliente/supervisor mexendo em role (próprio ou de terceiros) → bloqueado

create or replace function prevent_role_self_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(current_role_name(), 'cliente') <> 'admin' then
    raise exception 'Apenas administradores podem alterar o papel (role) de um perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on profiles;
create trigger profiles_prevent_role_escalation
  before update on profiles
  for each row execute function prevent_role_self_escalation();
