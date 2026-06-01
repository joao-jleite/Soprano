-- Soprano 0015 — Corrige RLS de daily_reports para soft-delete
--
-- PROBLEMA:
--   dr_supervisor_update não tem WITH CHECK explícito.
--   PostgreSQL usa o USING como WITH CHECK quando não há cláusula explícita.
--   O USING exige `deleted_at IS NULL` e `status IN ('rascunho','cancelado')`.
--   Após setar deleted_at, a nova linha viola essas condições → erro 42501.
--
-- SOLUÇÃO:
--   Separar USING (quais linhas podem ser modificadas) do WITH CHECK
--   (como a linha pode ficar após a modificação).
--   Admin: permissão total sem restrições de estado.
--   Supervisor: pode modificar só enquanto rascunho/cancelado (USING),
--               mas a nova linha só precisa pertencer ao próprio supervisor (WITH CHECK).

-- ── Admin: recria sem WITH CHECK explícito → usa USING para ambos ──────────
drop policy if exists dr_admin on daily_reports;
create policy dr_admin on daily_reports
  for all
  using     (current_role_name() = 'admin')
  with check(current_role_name() = 'admin');

-- ── Supervisor: separa USING do WITH CHECK ────────────────────────────────
drop policy if exists dr_supervisor_update on daily_reports;
create policy dr_supervisor_update on daily_reports
  for update
  -- Antes da modificação: deve ser rascunho/cancelado, não deletado, e do próprio supervisor
  using (
    current_role_name() = 'supervisor'
    and supervisor_id = auth.uid()
    and status in ('rascunho', 'cancelado')
    and deleted_at is null
  )
  -- Depois da modificação: só precisa continuar sendo do próprio supervisor
  with check (
    current_role_name() = 'supervisor'
    and supervisor_id = auth.uid()
  );
