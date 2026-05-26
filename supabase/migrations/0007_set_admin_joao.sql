-- Soprano 0007 — Promove joaovitor.leite@zitron.com a admin
-- Execute no SQL Editor do Supabase Dashboard.

update profiles
  set role    = 'admin',
      company = 'Zitrón Brasil'
  where email = 'joaovitor.leite@zitron.com';
