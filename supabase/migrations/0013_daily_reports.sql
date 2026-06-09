-- Soprano 0013 — Resumo Diário (daily_reports)
--
-- RECONSTRUÇÃO da migration ausente. As tabelas eram usadas pelo código
-- (src/app/actions/daily-reports.ts, api/resumo-diario/.../sign) mas não havia
-- migration versionada — impossível auditar RLS. Esta migration é IDEMPOTENTE:
-- segura de aplicar mesmo que as tabelas já existam em produção (o ponto crítico
-- é garantir RLS habilitada e correta).

-- ── Enum de status ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'daily_report_status') then
    create type daily_report_status as enum
      ('rascunho', 'aguardando_assinatura', 'assinado', 'cancelado');
  end if;
end $$;

-- ── Tabelas ─────────────────────────────────────────────────────────────────
create table if not exists daily_reports (
  id                  uuid primary key default uuid_generate_v4(),
  report_date         date not null,
  supervisor_id       uuid not null references profiles(id),
  client_id           uuid references profiles(id),
  notes               text,
  status              daily_report_status not null default 'rascunho',
  sent_at             timestamptz,
  signed_at           timestamptz,
  cancellation_reason text,
  verification_code   text not null default encode(gen_random_bytes(8), 'hex'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table if not exists daily_report_activities (
  id               uuid primary key default uuid_generate_v4(),
  daily_report_id  uuid not null references daily_reports(id) on delete cascade,
  activity_id      uuid not null references activities(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (daily_report_id, activity_id)
);

create table if not exists daily_report_signatures (
  id               uuid primary key default uuid_generate_v4(),
  daily_report_id  uuid not null references daily_reports(id) on delete cascade,
  signer_id        uuid not null references profiles(id),
  signer_name      text not null,
  svg_data         text,
  signed_at        timestamptz not null default now(),
  ip_address       inet,
  user_agent       text,
  cancelled        boolean not null default false,
  cancel_reason    text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_dr_supervisor on daily_reports (supervisor_id);
create index if not exists idx_dr_client     on daily_reports (client_id);
create index if not exists idx_dr_status     on daily_reports (status);
create index if not exists idx_dr_verify     on daily_reports (verification_code);
create index if not exists idx_dr_not_deleted on daily_reports (deleted_at) where deleted_at is null;
create index if not exists idx_dra_report    on daily_report_activities (daily_report_id);
create index if not exists idx_dra_activity  on daily_report_activities (activity_id);
create index if not exists idx_drs_report    on daily_report_signatures (daily_report_id);

-- updated_at automático (função touch_updated_at definida em 0001)
drop trigger if exists daily_reports_touch on daily_reports;
create trigger daily_reports_touch before update on daily_reports
  for each row execute function touch_updated_at();

-- verification_code automático
create or replace function set_dr_verification_code() returns trigger
language plpgsql as $$
begin
  if new.verification_code is null then
    new.verification_code := encode(gen_random_bytes(8), 'hex');
  end if;
  return new;
end;
$$;
drop trigger if exists daily_reports_verification_code on daily_reports;
create trigger daily_reports_verification_code before insert on daily_reports
  for each row execute function set_dr_verification_code();

-- Ao inserir assinatura, aplica status ao resumo
create or replace function apply_daily_report_signature() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cancelled then
    update daily_reports
       set status = 'cancelado', cancellation_reason = new.cancel_reason
     where id = new.daily_report_id;
  else
    update daily_reports
       set status = 'assinado', signed_at = coalesce(new.signed_at, now())
     where id = new.daily_report_id;
  end if;
  return new;
end;
$$;
drop trigger if exists daily_report_signatures_apply on daily_report_signatures;
create trigger daily_report_signatures_apply after insert on daily_report_signatures
  for each row execute function apply_daily_report_signature();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table daily_reports            enable row level security;
alter table daily_report_activities  enable row level security;
alter table daily_report_signatures  enable row level security;

-- daily_reports: admin tudo; supervisor só os seus; cliente só os seus (não-rascunho)
drop policy if exists dr_read on daily_reports;
create policy dr_read on daily_reports
  for select using (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and supervisor_id = auth.uid())
    or (current_role_name() = 'cliente' and client_id = auth.uid() and status <> 'rascunho')
  );

drop policy if exists dr_insert on daily_reports;
create policy dr_insert on daily_reports
  for insert with check (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and supervisor_id = auth.uid())
  );

drop policy if exists dr_update on daily_reports;
create policy dr_update on daily_reports
  for update using (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and supervisor_id = auth.uid())
  );

-- daily_report_activities: leitura herda do resumo pai; escrita admin/supervisor-dono
drop policy if exists dra_read on daily_report_activities;
create policy dra_read on daily_report_activities
  for select using (
    exists (
      select 1 from daily_reports dr where dr.id = daily_report_id and (
        current_role_name() = 'admin'
        or (current_role_name() = 'supervisor' and dr.supervisor_id = auth.uid())
        or (current_role_name() = 'cliente' and dr.client_id = auth.uid() and dr.status <> 'rascunho')
      )
    )
  );

drop policy if exists dra_write on daily_report_activities;
create policy dra_write on daily_report_activities
  for all using (
    exists (
      select 1 from daily_reports dr where dr.id = daily_report_id and (
        current_role_name() = 'admin'
        or (current_role_name() = 'supervisor' and dr.supervisor_id = auth.uid())
      )
    )
  );

-- daily_report_signatures: cliente assina o próprio resumo (aguardando); envolvidos leem
drop policy if exists drs_read on daily_report_signatures;
create policy drs_read on daily_report_signatures
  for select using (
    exists (
      select 1 from daily_reports dr where dr.id = daily_report_id and (
        current_role_name() = 'admin'
        or (current_role_name() = 'supervisor' and dr.supervisor_id = auth.uid())
        or (current_role_name() = 'cliente' and dr.client_id = auth.uid())
      )
    )
  );

drop policy if exists drs_insert on daily_report_signatures;
create policy drs_insert on daily_report_signatures
  for insert with check (
    current_role_name() = 'cliente'
    and signer_id = auth.uid()
    and exists (
      select 1 from daily_reports dr
      where dr.id = daily_report_id
        and dr.client_id = auth.uid()
        and dr.status = 'aguardando_assinatura'
    )
  );

-- ── Auditoria (função log_audit definida em 0004) ────────────────────────────
drop trigger if exists audit_daily_reports on daily_reports;
create trigger audit_daily_reports
  after insert or update or delete on daily_reports
  for each row execute function log_audit();

drop trigger if exists audit_daily_report_activities on daily_report_activities;
create trigger audit_daily_report_activities
  after insert or update or delete on daily_report_activities
  for each row execute function log_audit();

drop trigger if exists audit_daily_report_signatures on daily_report_signatures;
create trigger audit_daily_report_signatures
  after insert or update or delete on daily_report_signatures
  for each row execute function log_audit();
