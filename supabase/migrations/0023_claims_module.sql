-- Soprano 0023 — Módulo de Reclamos (Pleitos Contratuais)
--
-- Registro de reclamos/pleitos que a Zitrón emite CONTRA a Acciona (cliente da
-- Linha 6). Cada reclamo é um fundamento contratual (estilo FIDIC) para pleitear
-- prazo e/ou custo. Notifica a Acciona por EMAIL + APP, com prova de envio
-- (notified_at) e de recebimento (acuse: acknowledged_at + IP/UA).
--
-- A tabela `complaints` (0001) era um esqueleto genérico e NÃO é reaproveitada —
-- fica intacta para não quebrar nada, mas o módulo usa as tabelas novas abaixo.
--
-- Migration IDEMPOTENTE: segura de reaplicar. Após aplicar no SQL Editor, rode
--   NOTIFY pgrst, 'reload schema';
-- (incluído no fim) para o PostgREST enxergar as novas colunas/tabelas.

-- ── Enums ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'claim_type') then
    create type claim_type as enum (
      'suspensao_conveniencia',        -- 1. Suspensão dos trabalhos por conveniência
      'suspensao_falta_pagamento',     -- 2. Suspensão por falta de pagamento (90 dias)
      'falta_acesso_area',             -- 3. Falha da contratante em dar acesso à área
      'interferencia_terceiros',       -- 4. Interferências de outras contratistas
      'alteracao_escopo',              -- 5. Alteração do alcance do trabalho
      'risco_geotecnico_ambiental',    -- 6. Riscos geotécnicos ou ambientais
      'forca_maior',                   -- 7. Caso fortuito ou força maior
      'suspensao_poder_concedente'     -- 8. Suspensão por ordem do poder concedente
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'claim_status') then
    create type claim_status as enum (
      'rascunho',     -- criado, ainda não enviado
      'enviado',      -- notificado à Acciona (email + app)
      'recebido',     -- Acciona acusou recebimento
      'em_analise',   -- Acciona está analisando
      'respondido',   -- Acciona respondeu (aceito/rejeitado/parcial)
      'encerrado'     -- fechado pela Zitrón
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'claim_outcome') then
    create type claim_outcome as enum ('aceito', 'rejeitado', 'parcial');
  end if;
end $$;

-- ── Sequência para o código de referência (ZB-RC-AAAA-NNNN) ───────────────────
create sequence if not exists claims_ref_seq start 1;

-- ── Tabelas ───────────────────────────────────────────────────────────────────
create table if not exists claims (
  id                  uuid primary key default uuid_generate_v4(),
  ref_code            text unique,                       -- ZB-RC-2026-0001 (gerado por trigger)
  verification_code   text not null default encode(gen_random_bytes(8), 'hex'),
  claim_type          claim_type not null,
  title               text not null,
  description         text not null,
  event_date          date not null,                     -- data do evento gerador
  time_impact_days    int,                               -- impacto de prazo pleiteado
  cost_impact_amount  numeric(14,2),                     -- impacto de custo pleiteado
  currency            text not null default 'BRL',
  location_id         uuid references locations(id) on delete set null,
  activity_id         uuid references activities(id) on delete set null,
  author_id           uuid references profiles(id) on delete set null,  -- Zitrón
  client_id           uuid references profiles(id) on delete set null,  -- Acciona (destinatário)
  status              claim_status not null default 'rascunho',
  notified_at         timestamptz,                       -- quando foi enviado/notificado
  acknowledged_at     timestamptz,                       -- prova de recebimento (acuse)
  acknowledged_by     uuid references profiles(id) on delete set null,
  ack_ip              inet,
  ack_user_agent      text,
  response_at         timestamptz,
  response_outcome    claim_outcome,
  response_note       text,
  responded_by        uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table if not exists claim_attachments (
  id            uuid primary key default uuid_generate_v4(),
  claim_id      uuid not null references claims(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  uploaded_by   uuid references profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

-- Log imutável de eventos — a prova contratual da tramitação do reclamo.
create table if not exists claim_timeline (
  id          uuid primary key default uuid_generate_v4(),
  claim_id    uuid not null references claims(id) on delete cascade,
  event       text not null,           -- created | sent | viewed | acknowledged | analyzing | responded | closed | reopened
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_claims_author      on claims (author_id);
create index if not exists idx_claims_client      on claims (client_id);
create index if not exists idx_claims_status       on claims (status);
create index if not exists idx_claims_type         on claims (claim_type);
create index if not exists idx_claims_verify       on claims (verification_code);
create index if not exists idx_claims_event_date   on claims (event_date desc);
create index if not exists idx_claims_not_deleted  on claims (deleted_at) where deleted_at is null;
create index if not exists idx_claim_attach_claim  on claim_attachments (claim_id);
create index if not exists idx_claim_timeline_claim on claim_timeline (claim_id, created_at);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- updated_at automático (touch_updated_at definido em 0001)
drop trigger if exists claims_touch on claims;
create trigger claims_touch before update on claims
  for each row execute function touch_updated_at();

-- ref_code + verification_code automáticos na criação
create or replace function set_claim_codes() returns trigger
language plpgsql as $$
begin
  if new.ref_code is null then
    new.ref_code := 'ZB-RC-' || to_char(now(), 'YYYY') || '-' ||
                    lpad(nextval('claims_ref_seq')::text, 4, '0');
  end if;
  if new.verification_code is null then
    new.verification_code := encode(gen_random_bytes(8), 'hex');
  end if;
  return new;
end;
$$;
drop trigger if exists claims_set_codes on claims;
create trigger claims_set_codes before insert on claims
  for each row execute function set_claim_codes();

-- Auditoria (log_audit definida em 0004)
drop trigger if exists audit_claims on claims;
create trigger audit_claims
  after insert or update or delete on claims
  for each row execute function log_audit();

drop trigger if exists audit_claim_attachments on claim_attachments;
create trigger audit_claim_attachments
  after insert or update or delete on claim_attachments
  for each row execute function log_audit();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table claims            enable row level security;
alter table claim_attachments enable row level security;
alter table claim_timeline    enable row level security;

-- claims:
--   - admin/supervisor: leem todos (ativo de empresa)
--   - cliente (Acciona): lê só os destinados a ele, e nunca rascunho
drop policy if exists claims_read on claims;
create policy claims_read on claims
  for select using (
    current_role_name() in ('admin', 'supervisor')
    or (current_role_name() = 'cliente' and client_id = auth.uid() and status <> 'rascunho')
  );

drop policy if exists claims_insert on claims;
create policy claims_insert on claims
  for insert with check (
    current_role_name() in ('admin', 'supervisor')
    and author_id = auth.uid()
  );

-- Edição direta só pela Zitrón. Acuse/resposta do cliente passam pelo service
-- client na server action (após checar client_id), evitando policy permissiva.
drop policy if exists claims_update on claims;
create policy claims_update on claims
  for update using (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and author_id = auth.uid())
  );

-- attachments: leitura herda do reclamo; escrita admin/supervisor autor
drop policy if exists claim_attach_read on claim_attachments;
create policy claim_attach_read on claim_attachments
  for select using (
    exists (
      select 1 from claims c where c.id = claim_id and (
        current_role_name() in ('admin', 'supervisor')
        or (current_role_name() = 'cliente' and c.client_id = auth.uid() and c.status <> 'rascunho')
      )
    )
  );

drop policy if exists claim_attach_write on claim_attachments;
create policy claim_attach_write on claim_attachments
  for all using (
    exists (
      select 1 from claims c where c.id = claim_id and (
        current_role_name() = 'admin'
        or (current_role_name() = 'supervisor' and c.author_id = auth.uid())
      )
    )
  );

-- timeline: leitura herda do reclamo (cliente vê a tramitação dos seus); inserções
-- de eventos do cliente (acuse/resposta) são feitas via service client na action.
drop policy if exists claim_timeline_read on claim_timeline;
create policy claim_timeline_read on claim_timeline
  for select using (
    exists (
      select 1 from claims c where c.id = claim_id and (
        current_role_name() in ('admin', 'supervisor')
        or (current_role_name() = 'cliente' and c.client_id = auth.uid() and c.status <> 'rascunho')
      )
    )
  );

drop policy if exists claim_timeline_insert on claim_timeline;
create policy claim_timeline_insert on claim_timeline
  for insert with check (
    exists (
      select 1 from claims c where c.id = claim_id and (
        current_role_name() = 'admin'
        or (current_role_name() = 'supervisor' and c.author_id = auth.uid())
      )
    )
  );

-- ── Storage: bucket para evidências de reclamo ────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('claim-attachments', 'claim-attachments', false)
  on conflict (id) do nothing;

drop policy if exists "storage read claim attachments" on storage.objects;
create policy "storage read claim attachments"
  on storage.objects for select
  using (bucket_id = 'claim-attachments' and auth.role() = 'authenticated');

drop policy if exists "storage write claim attachments" on storage.objects;
create policy "storage write claim attachments"
  on storage.objects for insert
  with check (bucket_id = 'claim-attachments' and current_role_name() in ('admin', 'supervisor'));

-- ── Recarrega o cache de schema do PostgREST ──────────────────────────────────
notify pgrst, 'reload schema';
