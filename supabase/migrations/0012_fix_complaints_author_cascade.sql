-- Soprano 0012 — Corrigir FK de complaints.author_id
-- complaints.author_id era NOT NULL sem ON DELETE, bloqueando deleção de usuários.

ALTER TABLE complaints
  DROP CONSTRAINT IF EXISTS complaints_author_id_fkey;

ALTER TABLE complaints
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE complaints
  ADD CONSTRAINT complaints_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
