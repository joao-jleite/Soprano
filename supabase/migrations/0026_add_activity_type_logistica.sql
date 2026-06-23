-- Soprano 0026 — Novo tipo de atividade: Logística
--
-- Adiciona "Logística" à lista de tipos (aparece no seletor de Nova Atividade
-- e no filtro da lista). Idempotente via on conflict (slug).

insert into activity_types (slug, label_pt, label_en, label_es, icon) values
  ('logistica', 'Logística', 'Logistics', 'Logística', 'truck')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
