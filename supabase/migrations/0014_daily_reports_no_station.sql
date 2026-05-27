-- Migration 0014: Remove obrigatoriedade de station_id no resumo diário
-- O resumo diário cobre TODAS as obras do dia, não é por estação.

-- 1. Torna station_id opcional
ALTER TABLE daily_reports ALTER COLUMN station_id DROP NOT NULL;

-- 2. Remove a constraint única que exigia (report_date, station_id)
--    pois sem estação ela não faz mais sentido
ALTER TABLE daily_reports
  DROP CONSTRAINT IF EXISTS daily_reports_report_date_station_id_key;

-- 3. Nova constraint: um supervisor pode ter no máximo um resumo por data
--    (evita duplicatas acidentais, mas permite que clientes diferentes
--     tenham resumos separados no mesmo dia se necessário)
--    Comentado: deixar sem constraint para máxima flexibilidade.
-- ALTER TABLE daily_reports
--   ADD CONSTRAINT daily_reports_date_supervisor_key
--   UNIQUE (report_date, supervisor_id);
