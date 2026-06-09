-- Soprano 0021 — Restringe INSERT no audit_log
--
-- PROBLEMA: a policy audit_service_insert (0008) usa `with check (true)`, ou
-- seja, QUALQUER usuário autenticado pode inserir linhas arbitrárias no
-- audit_log — forjando ou poluindo a trilha de auditoria.
--
-- SOLUÇÃO: só o service_role insere diretamente. O trigger log_audit() é
-- SECURITY DEFINER (roda como owner), então continua registrando normalmente
-- as mutações disparadas por usuários comuns.

drop policy if exists audit_service_insert on audit_log;
create policy audit_service_insert on audit_log
  for insert
  with check (auth.role() = 'service_role');
