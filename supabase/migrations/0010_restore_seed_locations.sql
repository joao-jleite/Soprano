-- Soprano 0010 — Restaurar locais da Linha 6 apagados acidentalmente
--
-- Se locais foram soft-deletados, restaura (deleted_at = null).
-- Se não existem de forma alguma, re-insere o seed original.
-- ON CONFLICT DO NOTHING garante idempotência.

-- 1. Restaura soft-deletados
update locations
set deleted_at = null
where line = 'linha-6'
  and deleted_at is not null;

-- 2. Re-insere qualquer estação que não exista
insert into locations (name, kind, line, sort_order) values
  ('Brasilândia',                      'estacao', 'linha-6',  10),
  ('Maristela',                        'estacao', 'linha-6',  20),
  ('Itaberaba-Hospital Vila Penteado', 'estacao', 'linha-6',  30),
  ('João Paulo I',                     'estacao', 'linha-6',  40),
  ('Freguesia do Ó',                   'estacao', 'linha-6',  50),
  ('Santa Marina',                     'estacao', 'linha-6',  60),
  ('Água Branca',                      'estacao', 'linha-6',  70),
  ('SESC-Pompeia',                     'estacao', 'linha-6',  80),
  ('Perdizes',                         'estacao', 'linha-6',  90),
  ('PUC-Cardoso de Almeida',           'estacao', 'linha-6', 100),
  ('FAAP-Pacaembu',                    'estacao', 'linha-6', 110),
  ('Higienópolis-Mackenzie',           'estacao', 'linha-6', 120),
  ('14 Bis - Saracura',                'estacao', 'linha-6', 130),
  ('Bela Vista',                       'estacao', 'linha-6', 140),
  ('São Joaquim',                      'estacao', 'linha-6', 150),
  ('Pátio Morro Grande',               'patio',   'linha-6', 160),
  ('VSE Domingos Vega',                'vse',     'linha-6',  15),
  ('VSE Imirim',                       'vse',     'linha-6',  25),
  ('VSE Cachoeira',                    'vse',     'linha-6',  35),
  ('VSE Voluntários da Pátria',        'vse',     'linha-6',  45),
  ('VSE Santa Marina',                 'vse',     'linha-6',  55),
  ('VSE Pompeia',                      'vse',     'linha-6',  65),
  ('VSE Cardoso de Almeida',           'vse',     'linha-6',  75),
  ('VSE Pacaembu',                     'vse',     'linha-6',  85),
  ('VSE Higienópolis',                 'vse',     'linha-6',  95),
  ('VSE Avanhandava',                  'vse',     'linha-6', 105),
  ('VSE Bela Vista',                   'vse',     'linha-6', 115),
  ('SE Domingos Vega',                 'se',      'linha-6',  14),
  ('SE Imirim',                        'se',      'linha-6',  24),
  ('SE Voluntários',                   'se',      'linha-6',  44),
  ('SE Pompeia',                       'se',      'linha-6',  64),
  ('SE Cardoso de Almeida',            'se',      'linha-6',  74),
  ('SE Higienópolis',                  'se',      'linha-6',  94)
on conflict (name, line) do nothing;
