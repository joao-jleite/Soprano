-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011 — Corrigir deleção de usuários
--
-- Problema: ao deletar um usuário no painel do Supabase (auth.users),
-- as FK constraints em activities, signatures e audit_log bloqueiam o cascade
-- com erro "Database error deleting user".
--
-- Solução:
--   1. Tornar activities.supervisor_id nullable (era NOT NULL)
--   2. Recriar as FKs com ON DELETE SET NULL onde faz sentido preservar o dado
--   3. Signatures: signer_id vira nullable (o signer_name já está gravado no registro)
--   4. Audit_log: author_id vira nullable (o registro histórico é preservado)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── activities ───────────────────────────────────────────────────────────────

-- Remove FK antiga de supervisor_id (sem ON DELETE)
alter table activities
  drop constraint if exists activities_supervisor_id_fkey;

-- Torna nullable para suportar SET NULL
alter table activities
  alter column supervisor_id drop not null;

-- Recria FK com ON DELETE SET NULL
alter table activities
  add constraint activities_supervisor_id_fkey
  foreign key (supervisor_id)
  references profiles(id)
  on delete set null;

-- client_id já era nullable — apenas garante o ON DELETE SET NULL
alter table activities
  drop constraint if exists activities_client_id_fkey;

alter table activities
  add constraint activities_client_id_fkey
  foreign key (client_id)
  references profiles(id)
  on delete set null;

-- ── signatures ───────────────────────────────────────────────────────────────
-- signer_name já está gravado no registro, então podemos perder o signer_id
-- sem perder o dado da assinatura.

alter table signatures
  drop constraint if exists signatures_signer_id_fkey;

alter table signatures
  alter column signer_id drop not null;

alter table signatures
  add constraint signatures_signer_id_fkey
  foreign key (signer_id)
  references profiles(id)
  on delete set null;

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- O log histórico deve ser preservado mesmo após a saída do usuário.
-- Nota: a coluna é actor_id (referencia auth.users diretamente, não profiles).
-- Já tem ON DELETE SET NULL definido em 0004 — só garantimos aqui.

alter table audit_log
  drop constraint if exists audit_log_actor_id_fkey;

alter table audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id)
  references auth.users(id)
  on delete set null;

-- ── Confirma ─────────────────────────────────────────────────────────────────
-- Após esta migration, deletar um usuário em auth.users vai:
--   1. Disparar CASCADE em profiles (apaga o profile)
--   2. profiles cascade → activities.supervisor_id  SET NULL
--   3. profiles cascade → activities.client_id      SET NULL
--   4. profiles cascade → signatures.signer_id      SET NULL
--   5. audit_log.actor_id                           SET NULL (FK → auth.users)
-- Toda a história de atividades e assinaturas é preservada.
