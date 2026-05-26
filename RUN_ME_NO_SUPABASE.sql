-- Soprano 0004 — Soft delete + audit log
-- Compliance e rastreabilidade para contrato Linha 6

------------------------------------------------------------
-- 1. Soft delete: adiciona deleted_at nas tabelas principais
------------------------------------------------------------

alter table activities add column if not exists deleted_at timestamptz;
alter table locations add column if not exists deleted_at timestamptz;
alter table activity_types add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists deleted_at timestamptz;

create index if not exists idx_activities_not_deleted on activities (deleted_at) where deleted_at is null;
create index if not exists idx_locations_not_deleted on locations (deleted_at) where deleted_at is null;

------------------------------------------------------------
-- 2. Audit log
------------------------------------------------------------

create table if not exists audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert','update','delete','soft_delete','restore')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_table_record on audit_log (table_name, record_id);
create index if not exists idx_audit_actor on audit_log (actor_id);
create index if not exists idx_audit_created on audit_log (created_at desc);

alter table audit_log enable row level security;

-- Só admin vê audit log
drop policy if exists audit_admin_read on audit_log;
create policy audit_admin_read on audit_log
  for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

------------------------------------------------------------
-- 3. Trigger genérica para auditoria
------------------------------------------------------------

create or replace function log_audit() returns trigger as $$
declare
  v_actor uuid;
  v_email text;
  v_diff jsonb;
  v_action text;
  v_record_id uuid;
begin
  v_actor := auth.uid();
  select email into v_email from auth.users where id = v_actor;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_record_id := (to_jsonb(new)->>'id')::uuid;
    v_diff := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_record_id := (to_jsonb(new)->>'id')::uuid;
    -- Detecta soft delete vs update normal
    if (to_jsonb(old)->>'deleted_at') is null and (to_jsonb(new)->>'deleted_at') is not null then
      v_action := 'soft_delete';
    elsif (to_jsonb(old)->>'deleted_at') is not null and (to_jsonb(new)->>'deleted_at') is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    v_diff := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_record_id := (to_jsonb(old)->>'id')::uuid;
    v_diff := to_jsonb(old);
  end if;

  insert into audit_log (table_name, record_id, action, actor_id, actor_email, diff)
  values (tg_table_name, v_record_id, v_action, v_actor, v_email, v_diff);

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Aplica em tabelas relevantes
drop trigger if exists audit_activities on activities;
create trigger audit_activities
  after insert or update or delete on activities
  for each row execute function log_audit();

drop trigger if exists audit_signatures on signatures;
create trigger audit_signatures
  after insert or update or delete on signatures
  for each row execute function log_audit();

drop trigger if exists audit_locations on locations;
create trigger audit_locations
  after insert or update or delete on locations
  for each row execute function log_audit();

drop trigger if exists audit_activity_types on activity_types;
create trigger audit_activity_types
  after insert or update or delete on activity_types
  for each row execute function log_audit();

------------------------------------------------------------
-- 4. Views que filtram soft-deleted automaticamente
------------------------------------------------------------

create or replace view activities_active as
  select * from activities where deleted_at is null;

create or replace view locations_active as
  select * from locations where deleted_at is null;

create or replace view activity_types_active as
  select * from activity_types where deleted_at is null;

------------------------------------------------------------
-- 5. Campo verification_code garantido em signatures
-- (já existe no 0001, mas reforçando)
------------------------------------------------------------

-- Se não existir, adiciona
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'signatures' and column_name = 'verification_code'
  ) then
    alter table signatures add column verification_code text;
    -- Gera pra linhas existentes
    update signatures set verification_code = substr(md5(id::text || signed_at::text), 1, 12) where verification_code is null;
    alter table signatures alter column verification_code set not null;
    create unique index idx_signatures_verification_code on signatures(verification_code);
  end if;
end $$;

-- Trigger pra gerar verification_code automaticamente em novas linhas
create or replace function set_verification_code() returns trigger as $$
begin
  if new.verification_code is null then
    new.verification_code := substr(md5(new.id::text || new.signed_at::text || random()::text), 1, 12);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists signatures_verification_code on signatures;
create trigger signatures_verification_code
  before insert on signatures
  for each row execute function set_verification_code();
-- Soprano 0005 — RPC pública para verificação por QR/código
-- Usada pela página /verify/[code] que precisa rodar sem login.

create or replace function public.verify_signature(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sig record;
  v_act record;
  v_result jsonb;
begin
  select s.signer_name, s.signed_at, s.verification_code,
         s.rejected, s.reject_reason, s.activity_id
    into v_sig
    from signatures s
   where s.verification_code = p_code
   limit 1;

  if v_sig is null then
    return null;
  end if;

  select a.id, a.description, a.started_at, a.status,
         l.name as location_name,
         t.label_pt as type_label,
         sup.full_name as supervisor_name,
         cli.full_name as client_name
    into v_act
    from activities a
    left join locations l on l.id = a.location_id
    left join activity_types t on t.id = a.activity_type_id
    left join profiles sup on sup.id = a.supervisor_id
    left join profiles cli on cli.id = a.client_id
   where a.id = v_sig.activity_id;

  v_result := jsonb_build_object(
    'signer_name', v_sig.signer_name,
    'signed_at', v_sig.signed_at,
    'verification_code', v_sig.verification_code,
    'rejected', v_sig.rejected,
    'reject_reason', v_sig.reject_reason,
    'activity', case when v_act is null then null else jsonb_build_object(
      'id', v_act.id,
      'description', v_act.description,
      'started_at', v_act.started_at,
      'status', v_act.status,
      'location_name', v_act.location_name,
      'type_label', v_act.type_label,
      'supervisor_name', v_act.supervisor_name,
      'client_name', v_act.client_name
    ) end
  );

  return v_result;
end;
$$;

grant execute on function public.verify_signature(text) to anon, authenticated;
-- Soprano 0006 — Admin pode gerenciar profiles
-- Permite que admins alterem role, full_name, company, phone de outros usuários.

drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Admins precisam ler todos os perfis (já existe, mas reforçando)
drop policy if exists profiles_admin_read_all on profiles;
create policy profiles_admin_read_all on profiles
  for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
