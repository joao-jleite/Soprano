-- 0016 — Corrige restrição única de assinatura
--
-- PROBLEMA: o índice único irrestrito em signatures(activity_id) impedia que
-- uma atividade rejeitada fosse re-assinada após o supervisor reenviar.
-- O fluxo rejeitada → enviada → assinada está quebrado no banco desde o início.
--
-- SOLUÇÃO: substituir pelo índice único parcial que só aplica a constraint
-- na assinatura válida (rejected = false), permitindo múltiplas rejeições
-- seguidas de uma assinatura final.

-- Remove o índice incorreto
drop index if exists uq_signature_per_activity;

-- Novo índice parcial: apenas uma assinatura válida por atividade
create unique index uq_valid_signature_per_activity
  on signatures (activity_id)
  where rejected = false;
