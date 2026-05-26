-- Soprano 0013 — Resumo diário por estação (daily_reports)
--
-- CONTEXTO:
--   Antes: supervisor enviava cada atividade individualmente para assinatura.
--   Agora:  supervisor agrupa as atividades do dia por estação, revisa o resumo
--           e envia uma única vez para o cliente assinar.
--
-- PRINCÍPIOS DESTA MIGRATION:
--   - Não altera nenhuma tabela, enum ou trigger existente.
--   - Usa os helpers já existentes: touch_updated_at(), log_audit(), current_role_name().
--   - Segue os mesmos padrões de RLS das migrations anteriores (sem recursão em profiles).
--   - Idempotente onde possível (create ... if not exists, drop ... if exists).

-- ======================================================================
-- 1. ENUM: status do resumo diário
-- ======================================================================
do $$ begin
  create type daily_report_status as enum (
    'rascunho',              -- supervisor revisando, ainda não enviado
    'aguardando_assinatura', -- enviado para o cliente
    'assinado',              -- cliente assinou
    'cancelado'              -- cliente cancelou — supervisor precisa revisar e reenviar
  );
exception when duplicate_object then null;
end $$;

-- ======================================================================
-- 2. DAILY_REPORTS
--    Uma estação tem no máximo um resumo por dia (unique report_date + station_id).
-- ======================================================================
create table if not exists daily_reports (
  id                  uuid primary key default uuid_generate_v4(),
  report_date         date not null,
  station_id          uuid not null references locations(id),    -- espera kind = 'estacao'
  supervisor_id       uuid not null references profiles(id),
  client_id           uuid references profiles(id),              -- quem assina
  status              daily_report_status not null default 'rascunho',
  notes               text,                                       -- observações gerais do supervisor
  verification_code   text not null default encode(gen_random_bytes(8), 'hex'),
  sent_at             timestamptz,
  signed_at           timestamptz,
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (report_date, station_id)
);

create index if not exists idx_dr_date        on daily_reports (report_date desc);
create index if not exists idx_dr_station     on daily_reports (station_id);
create index if not exists idx_dr_supervisor  on daily_reports (supervisor_id);
create index if not exists idx_dr_client      on daily_reports (client_id);
create index if not exists idx_dr_status      on daily_reports (status);
create index if not exists idx_dr_verify      on daily_reports (verification_code);
create index if not exists idx_dr_not_deleted on daily_reports (deleted_at) where deleted_at is null;

drop trigger if exists daily_reports_touch on daily_reports;
create trigger daily_reports_touch
  before update on daily_reports
  for each row execute function touch_updated_at();

-- ======================================================================
-- 3. DAILY_REPORT_ACTIVITIES
--    Tabela pivô: quais atividades fazem parte de cada resumo.
--    Restrição: uma atividade só pode estar em um resumo por vez
--    (validado pela aplicação ao montar o resumo).
-- ======================================================================
create table if not exists daily_report_activities (
  daily_report_id  uuid not null references daily_reports(id) on delete cascade,
  activity_id      uuid not null references activities(id) on delete cascade,
  added_at         timestamptz not null default now(),
  primary key (daily_report_id, activity_id)
);

create index if not exists idx_dra_report   on daily_report_activities (daily_report_id);
create index if not exists idx_dra_activity on daily_report_activities (activity_id);

-- ======================================================================
-- 4. DAILY_REPORT_SIGNATURES
--    Assinatura (ou cancelamento) do cliente para o resumo.
--    Um resumo tem no máximo uma linha aqui (unique daily_report_id).
-- ======================================================================
create table if not exists daily_report_signatures (
  id               uuid primary key default uuid_generate_v4(),
  daily_report_id  uuid not null references daily_reports(id) on delete cascade,
  signer_id        uuid not null references profiles(id),
  signer_name      text not null,
  svg_data         text,                           -- null quando é cancelamento sem assinatura
  signed_at        timestamptz not null default now(),
  ip_address       inet,
  user_agent       text,
  cancelled        boolean not null default false,
  cancel_reason    text,
  unique (daily_report_id)
);

create index if not exists idx_drs_report on daily_report_signatures (daily_report_id);

-- ======================================================================
-- 5. TRIGGER: aplica resultado da assinatura ao resumo e às atividades
-- ======================================================================
create or replace function apply_signature_to_daily_report()
returns trigger language plpgsql as $$
begin
  if new.cancelled then
    -- Cliente cancelou: resumo volta para rascunho aguardando revisão do supervisor
    update daily_reports
      set status = 'cancelado',
          cancellation_reason = new.cancel_reason
      where id = new.daily_report_id;
  else
    -- Cliente assinou: marca o resumo e todas as atividades incluídas como assinadas
    update daily_reports
      set status = 'assinado',
          signed_at = new.signed_at
      where id = new.daily_report_id;

    update activities
      set status = 'assinada'
      where id in (
        select activity_id
          from daily_report_activities
         where daily_report_id = new.daily_report_id
      );
  end if;
  return new;
end;
$$;

drop trigger if exists daily_report_signatures_apply on daily_report_signatures;
create trigger daily_report_signatures_apply
  after insert on daily_report_signatures
  for each row execute function apply_signature_to_daily_report();

-- ======================================================================
-- 6. TRIGGER: registra sent_at quando supervisor envia para assinatura
-- ======================================================================
create or replace function set_daily_report_sent_at()
returns trigger language plpgsql as $$
begin
  if old.status in ('rascunho', 'cancelado')
     and new.status = 'aguardando_assinatura' then
    new.sent_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists daily_reports_set_sent_at on daily_reports;
create trigger daily_reports_set_sent_at
  before update on daily_reports
  for each row execute function set_daily_report_sent_at();

-- ======================================================================
-- 7. RLS — Row Level Security
-- ======================================================================
alter table daily_reports            enable row level security;
alter table daily_report_activities  enable row level security;
alter table daily_report_signatures  enable row level security;

-- ── DAILY_REPORTS ──────────────────────────────────────────────────────

-- Admin: acesso total
drop policy if exists dr_admin on daily_reports;
create policy dr_admin on daily_reports
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- Supervisor: lê todos os resumos (para coordenação entre turnos)
drop policy if exists dr_supervisor_read on daily_reports;
create policy dr_supervisor_read on daily_reports
  for select
  using (current_role_name() = 'supervisor' and deleted_at is null);

-- Supervisor: cria resumos como supervisor_id
drop policy if exists dr_supervisor_insert on daily_reports;
create policy dr_supervisor_insert on daily_reports
  for insert
  with check (
    current_role_name() = 'supervisor'
    and supervisor_id = auth.uid()
  );

-- Supervisor: edita o próprio resumo enquanto rascunho ou cancelado
drop policy if exists dr_supervisor_update on daily_reports;
create policy dr_supervisor_update on daily_reports
  for update
  using (
    current_role_name() = 'supervisor'
    and supervisor_id = auth.uid()
    and status in ('rascunho', 'cancelado')
    and deleted_at is null
  );

-- Cliente: vê apenas os resumos onde está designado e que foram enviados
drop policy if exists dr_client_read on daily_reports;
create policy dr_client_read on daily_reports
  for select
  using (
    current_role_name() = 'cliente'
    and client_id = auth.uid()
    and status != 'rascunho'
    and deleted_at is null
  );

-- ── DAILY_REPORT_ACTIVITIES ────────────────────────────────────────────

-- Leitura: supervisor/admin vê todas; cliente vê as do seu resumo não-rascunho
drop policy if exists dra_read on daily_report_activities;
create policy dra_read on daily_report_activities
  for select
  using (
    exists (
      select 1 from daily_reports dr
       where dr.id = daily_report_id
         and (
           current_role_name() in ('admin', 'supervisor')
           or (
             current_role_name() = 'cliente'
             and dr.client_id = auth.uid()
             and dr.status != 'rascunho'
           )
         )
         and dr.deleted_at is null
    )
  );

-- Escrita: supervisor/admin gerencia atividades do resumo enquanto está em rascunho
drop policy if exists dra_write on daily_report_activities;
create policy dra_write on daily_report_activities
  for all
  using (
    exists (
      select 1 from daily_reports dr
       where dr.id = daily_report_id
         and current_role_name() in ('admin', 'supervisor')
         and (current_role_name() = 'admin' or dr.supervisor_id = auth.uid())
         and dr.status in ('rascunho', 'cancelado')
         and dr.deleted_at is null
    )
  );

-- ── DAILY_REPORT_SIGNATURES ────────────────────────────────────────────

-- Leitura: admin, supervisor do resumo, cliente do resumo
drop policy if exists drs_read on daily_report_signatures;
create policy drs_read on daily_report_signatures
  for select
  using (
    current_role_name() = 'admin'
    or exists (
      select 1 from daily_reports dr
       where dr.id = daily_report_id
         and (dr.supervisor_id = auth.uid() or dr.client_id = auth.uid())
    )
  );

-- Escrita: apenas o cliente designado, quando o resumo está aguardando assinatura
drop policy if exists drs_insert on daily_report_signatures;
create policy drs_insert on daily_report_signatures
  for insert
  with check (
    current_role_name() = 'cliente'
    and signer_id = auth.uid()
    and exists (
      select 1 from daily_reports dr
       where dr.id = daily_report_id
         and dr.client_id = auth.uid()
         and dr.status = 'aguardando_assinatura'
    )
  );

-- ======================================================================
-- 8. AUDITORIA: aplica log_audit nas novas tabelas
-- ======================================================================
drop trigger if exists audit_daily_reports on daily_reports;
create trigger audit_daily_reports
  after insert or update or delete on daily_reports
  for each row execute function log_audit();

drop trigger if exists audit_daily_report_signatures on daily_report_signatures;
create trigger audit_daily_report_signatures
  after insert or update or delete on daily_report_signatures
  for each row execute function log_audit();

-- ======================================================================
-- 9. VIEW: resumos ativos (sem soft-deleted)
-- ======================================================================
create or replace view daily_reports_active as
  select * from daily_reports where deleted_at is null;
