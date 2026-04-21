-- Soprano 0008 — Completar cobertura de auditoria
-- Adiciona triggers nas tabelas que ainda não têm log automático

------------------------------------------------------------
-- 1. Profiles (alterações de role, nome, soft-delete de usuário)
------------------------------------------------------------
drop trigger if exists audit_profiles on profiles;
create trigger audit_profiles
  after insert or update or delete on profiles
  for each row execute function log_audit();

------------------------------------------------------------
-- 2. Participantes de atividade (equipe em campo)
------------------------------------------------------------
drop trigger if exists audit_activity_participants on activity_participants;
create trigger audit_activity_participants
  after insert or update or delete on activity_participants
  for each row execute function log_audit();

------------------------------------------------------------
-- 3. Fotos de atividade (upload / remoção)
------------------------------------------------------------
drop trigger if exists audit_activity_photos on activity_photos;
create trigger audit_activity_photos
  after insert or update or delete on activity_photos
  for each row execute function log_audit();

------------------------------------------------------------
-- 4. Índice adicional para buscas por ação (dashboard auditoria)
------------------------------------------------------------
create index if not exists idx_audit_action on audit_log (action);

------------------------------------------------------------
-- 5. Política de INSERT no audit_log via service role
-- (service role precisa inserir; o trigger usa security definer,
--  mas garantimos que a função tem permissão de insert)
------------------------------------------------------------
drop policy if exists audit_service_insert on audit_log;
create policy audit_service_insert on audit_log
  for insert
  with check (true);
