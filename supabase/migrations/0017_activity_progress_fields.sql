-- 0017 — Campos de evolução, pendências e continuação em atividades
--
-- Adiciona três colunas à tabela activities:
--   evolucao       — o que avançou / foi executado
--   pendencias     — o que ficou pendente
--   continuation_of — FK para atividade anterior (cadeia de continuações)

alter table activities
  add column if not exists evolucao       text,
  add column if not exists pendencias     text,
  add column if not exists continuation_of uuid references activities(id) on delete set null;

create index if not exists idx_activities_continuation_of on activities (continuation_of);
