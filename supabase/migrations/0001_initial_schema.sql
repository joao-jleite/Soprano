-- Soprano — Schema inicial
-- Rodar: supabase db push (ou aplicar manualmente no dashboard SQL)

-- ======================================================================
-- EXTENSIONS
-- ======================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ======================================================================
-- ENUMS
-- ======================================================================
create type role as enum ('admin', 'supervisor', 'cliente');
create type location_kind as enum ('estacao', 'vse', 'se', 'escadaria', 'patio', 'outro');
create type activity_status as enum ('rascunho', 'enviada', 'assinada', 'rejeitada');

-- ======================================================================
-- PROFILES
-- Extensão do auth.users do Supabase com metadata do app.
-- ======================================================================
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null unique,
  role              role not null default 'supervisor',
  avatar_url        text,
  phone             text,
  company           text,
  preferred_locale  text not null default 'pt',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Trigger: cria profile automaticamente quando um novo usuário se cadastra em auth.users
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::role, 'supervisor')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: role do usuário atual
create or replace function current_role_name()
returns role
language sql stable
security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ======================================================================
-- LOCATIONS (estações, VSEs, saídas de emergência, etc.)
-- ======================================================================
create table locations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  kind         location_kind not null,
  line         text not null default 'linha-6',
  sort_order   int not null default 0,
  address      text,
  lat          double precision,
  lng          double precision,
  created_at   timestamptz not null default now(),
  created_by   uuid references profiles(id) on delete set null,
  unique (name, line)
);

create index idx_locations_line_kind on locations (line, kind);

-- ======================================================================
-- ACTIVITY TYPES (elétrica, pintura, etc.) — expansível por supervisor
-- ======================================================================
create table activity_types (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  label_pt    text not null,
  label_en    text not null,
  label_es    text not null,
  icon        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);

-- ======================================================================
-- ACTIVITIES (núcleo do sistema)
-- ======================================================================
create table activities (
  id                uuid primary key default uuid_generate_v4(),
  location_id       uuid not null references locations(id),
  activity_type_id  uuid not null references activity_types(id),
  supervisor_id     uuid not null references profiles(id),
  client_id         uuid references profiles(id),
  description       text not null,
  notes             text,
  status            activity_status not null default 'rascunho',
  started_at        timestamptz not null,
  ended_at          timestamptz,
  submitted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_activities_location on activities (location_id);
create index idx_activities_type on activities (activity_type_id);
create index idx_activities_supervisor on activities (supervisor_id);
create index idx_activities_client on activities (client_id);
create index idx_activities_status on activities (status);
create index idx_activities_started_at on activities (started_at desc);

-- Trigger: updated_at automático
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger activities_touch before update on activities
  for each row execute function touch_updated_at();

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

-- ======================================================================
-- ACTIVITY PARTICIPANTS (equipe que executou a atividade)
-- ======================================================================
create table activity_participants (
  activity_id  uuid not null references activities(id) on delete cascade,
  name         text not null,
  role         text,
  primary key (activity_id, name)
);

-- ======================================================================
-- ACTIVITY PHOTOS
-- ======================================================================
create table activity_photos (
  id            uuid primary key default uuid_generate_v4(),
  activity_id   uuid not null references activities(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  lat           double precision,
  lng           double precision,
  taken_at      timestamptz,
  uploaded_at   timestamptz not null default now()
);

create index idx_photos_activity on activity_photos (activity_id);

-- ======================================================================
-- SIGNATURES (assinatura do cliente)
-- ======================================================================
create table signatures (
  id                 uuid primary key default uuid_generate_v4(),
  activity_id        uuid not null references activities(id) on delete cascade,
  signer_id          uuid not null references profiles(id),
  signer_name        text not null,
  svg_data           text not null,
  verification_code  text not null default encode(gen_random_bytes(6), 'hex'),
  signed_at          timestamptz not null default now(),
  ip_address         inet,
  user_agent         text,
  rejected           boolean not null default false,
  reject_reason      text
);

create unique index uq_signature_per_activity on signatures (activity_id);

-- Trigger: quando uma assinatura é inserida, marca a atividade como assinada/rejeitada
create or replace function apply_signature_to_activity()
returns trigger language plpgsql as $$
begin
  update activities
    set status = case when new.rejected then 'rejeitada'::activity_status else 'assinada'::activity_status end
    where id = new.activity_id;
  return new;
end;
$$;

create trigger signatures_apply after insert on signatures
  for each row execute function apply_signature_to_activity();

-- ======================================================================
-- COMPLAINTS (esqueleto — estrutura final depende da definição com a equipe)
-- ======================================================================
create table complaints (
  id           uuid primary key default uuid_generate_v4(),
  activity_id  uuid references activities(id) on delete set null,
  location_id  uuid references locations(id) on delete set null,
  author_id    uuid not null references profiles(id),
  subject      text not null,
  body         text not null,
  status       text not null default 'aberto',
  created_at   timestamptz not null default now()
);

-- ======================================================================
-- RLS — Row Level Security
-- ======================================================================
alter table profiles              enable row level security;
alter table locations             enable row level security;
alter table activity_types        enable row level security;
alter table activities            enable row level security;
alter table activity_participants enable row level security;
alter table activity_photos       enable row level security;
alter table signatures            enable row level security;
alter table complaints            enable row level security;

-- PROFILES: cada um vê o próprio; admin vê todos
create policy profiles_self_read on profiles
  for select using (auth.uid() = id or current_role_name() = 'admin');

create policy profiles_self_update on profiles
  for update using (auth.uid() = id or current_role_name() = 'admin');

create policy profiles_admin_insert on profiles
  for insert with check (current_role_name() = 'admin');

-- LOCATIONS: todos autenticados leem; supervisor e admin escrevem
create policy locations_read on locations
  for select using (auth.role() = 'authenticated');

create policy locations_write on locations
  for insert with check (current_role_name() in ('admin', 'supervisor'));

create policy locations_update on locations
  for update using (current_role_name() in ('admin', 'supervisor'));

-- ACTIVITY_TYPES: mesmo modelo
create policy activity_types_read on activity_types
  for select using (auth.role() = 'authenticated');

create policy activity_types_write on activity_types
  for insert with check (current_role_name() in ('admin', 'supervisor'));

-- ACTIVITIES:
--   - Admin: tudo
--   - Supervisor: vê todas, cria e edita as próprias enquanto rascunho
--   - Cliente: vê só as atividades em que é o cliente designado (enviada/assinada/rejeitada)
create policy activities_read on activities
  for select using (
    current_role_name() in ('admin', 'supervisor')
    or (current_role_name() = 'cliente' and client_id = auth.uid() and status != 'rascunho')
  );

create policy activities_insert on activities
  for insert with check (
    current_role_name() in ('admin', 'supervisor')
    and supervisor_id = auth.uid()
  );

create policy activities_update on activities
  for update using (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and supervisor_id = auth.uid() and status in ('rascunho', 'rejeitada'))
  );

create policy activities_delete on activities
  for delete using (
    current_role_name() = 'admin'
    or (current_role_name() = 'supervisor' and supervisor_id = auth.uid() and status = 'rascunho')
  );

-- PARTICIPANTS: herda da atividade
create policy participants_read on activity_participants
  for select using (
    exists (select 1 from activities a where a.id = activity_id and (
      current_role_name() in ('admin', 'supervisor')
      or (current_role_name() = 'cliente' and a.client_id = auth.uid() and a.status != 'rascunho')
    ))
  );

create policy participants_write on activity_participants
  for all using (
    exists (select 1 from activities a where a.id = activity_id and current_role_name() in ('admin','supervisor') and (current_role_name() = 'admin' or a.supervisor_id = auth.uid()))
  );

-- PHOTOS: herda da atividade
create policy photos_read on activity_photos
  for select using (
    exists (select 1 from activities a where a.id = activity_id and (
      current_role_name() in ('admin', 'supervisor')
      or (current_role_name() = 'cliente' and a.client_id = auth.uid() and a.status != 'rascunho')
    ))
  );

create policy photos_write on activity_photos
  for all using (
    exists (select 1 from activities a where a.id = activity_id and current_role_name() in ('admin','supervisor') and (current_role_name() = 'admin' or a.supervisor_id = auth.uid()))
  );

-- SIGNATURES:
--   - Cliente só pode inserir assinatura para atividades onde é o client_id e status = 'enviada'
--   - Todos os envolvidos leem
create policy signatures_read on signatures
  for select using (
    current_role_name() = 'admin'
    or exists (select 1 from activities a where a.id = activity_id and (a.supervisor_id = auth.uid() or a.client_id = auth.uid()))
  );

create policy signatures_insert on signatures
  for insert with check (
    current_role_name() = 'cliente'
    and signer_id = auth.uid()
    and exists (
      select 1 from activities a
      where a.id = activity_id
        and a.client_id = auth.uid()
        and a.status = 'enviada'
    )
  );

-- COMPLAINTS: qualquer autenticado cria e vê os próprios; admin vê tudo
create policy complaints_read on complaints
  for select using (
    current_role_name() = 'admin'
    or author_id = auth.uid()
  );

create policy complaints_insert on complaints
  for insert with check (auth.role() = 'authenticated' and author_id = auth.uid());

-- ======================================================================
-- STORAGE: bucket para fotos de atividade e assinaturas renderizadas
-- ======================================================================
insert into storage.buckets (id, name, public)
  values ('activity-photos', 'activity-photos', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('signatures', 'signatures', false)
  on conflict (id) do nothing;

-- Policies de storage: supervisores e admins fazem upload; clientes e equipe leem o que lhes compete
create policy "storage read photos"
  on storage.objects for select
  using (
    bucket_id = 'activity-photos'
    and auth.role() = 'authenticated'
  );

create policy "storage write photos"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-photos'
    and current_role_name() in ('admin', 'supervisor')
  );

create policy "storage read signatures"
  on storage.objects for select
  using (
    bucket_id = 'signatures'
    and auth.role() = 'authenticated'
  );

create policy "storage write signatures"
  on storage.objects for insert
  with check (
    bucket_id = 'signatures'
    and auth.role() = 'authenticated'
  );
