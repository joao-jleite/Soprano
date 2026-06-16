-- Soprano 0024 — Permite participantes com nome repetido na mesma atividade
--
-- A PK composta (activity_id, name) definida em 0001 impedia dois participantes
-- com o MESMO nome na mesma atividade (ex.: dois "José" na equipe de campo) —
-- a segunda inserção violava a primary key e o salvamento falhava.
--
-- Solução: troca a PK por uma chave surrogate `id` (uuid). O par
-- (activity_id, name) deixa de ser único, então nomes repetidos passam a ser
-- aceitos. Idempotente: seguro reaplicar.

-- 1. Coluna id (surrogate). default cobre as linhas existentes ao adicionar.
alter table activity_participants add column if not exists id uuid default uuid_generate_v4();

-- 2. Garante id preenchido em qualquer linha legada que tenha ficado nula.
update activity_participants set id = uuid_generate_v4() where id is null;
alter table activity_participants alter column id set not null;

-- 3. Troca a primary key: remove (activity_id, name), adota (id).
alter table activity_participants drop constraint if exists activity_participants_pkey;
alter table activity_participants add constraint activity_participants_pkey primary key (id);

-- Índice para continuar buscando participantes por atividade com eficiência
-- (antes a PK composta cobria isso).
create index if not exists idx_activity_participants_activity on activity_participants (activity_id);

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';
