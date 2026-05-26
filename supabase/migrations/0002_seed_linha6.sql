-- Soprano — Seed da Linha 6 Laranja
-- Fonte: linhauni.com.br/linha-6-laranja (consórcio Linha Uni / Acciona)
-- Rodar depois de 0001_initial_schema.sql

-- ======================================================================
-- ESTAÇÕES (15) — ordem geográfica Brasilândia → São Joaquim
-- ======================================================================
insert into locations (name, kind, line, sort_order) values
  ('Brasilândia',                  'estacao', 'linha-6',  10),
  ('Maristela',                    'estacao', 'linha-6',  20),
  ('Itaberaba-Hospital Vila Penteado', 'estacao', 'linha-6',  30),
  ('João Paulo I',                 'estacao', 'linha-6',  40),
  ('Freguesia do Ó',               'estacao', 'linha-6',  50),
  ('Santa Marina',                 'estacao', 'linha-6',  60),
  ('Água Branca',                  'estacao', 'linha-6',  70),
  ('SESC-Pompeia',                 'estacao', 'linha-6',  80),
  ('Perdizes',                     'estacao', 'linha-6',  90),
  ('PUC-Cardoso de Almeida',       'estacao', 'linha-6', 100),
  ('FAAP-Pacaembu',                'estacao', 'linha-6', 110),
  ('Higienópolis-Mackenzie',       'estacao', 'linha-6', 120),
  ('14 Bis - Saracura',            'estacao', 'linha-6', 130),
  ('Bela Vista',                   'estacao', 'linha-6', 140),
  ('São Joaquim',                  'estacao', 'linha-6', 150)
on conflict (name, line) do nothing;

-- ======================================================================
-- POÇOS DE VENTILAÇÃO (VSE) — trechos entre estações
-- ======================================================================
insert into locations (name, kind, line, sort_order) values
  ('VSE Domingos Vega',        'vse', 'linha-6',  15),
  ('VSE Saldanha de Oliveira', 'vse', 'linha-6',  25),
  ('VSE Felipe Mendes',        'vse', 'linha-6',  35),
  ('VSE Phillipini',           'vse', 'linha-6',  45),
  ('VSE Simão Velho',          'vse', 'linha-6',  55),
  ('VSE Tietê',                'vse', 'linha-6',  65),
  ('VSE Sara de Souza',        'vse', 'linha-6',  75),
  ('VSE Faustolo',             'vse', 'linha-6',  85),
  ('VSE Venâncio Aires',       'vse', 'linha-6',  95),
  ('VSE João Ramalho',         'vse', 'linha-6', 105),
  ('VSE Pacaembu',             'vse', 'linha-6', 115),
  ('VSE Mato Grosso',          'vse', 'linha-6', 125),
  ('VSE Frei Caneca',          'vse', 'linha-6', 135),
  ('VSE Almirante Marques',    'vse', 'linha-6', 145),
  ('VSE Pedroso',              'vse', 'linha-6', 148),
  ('VSE Felício dos Santos',   'vse', 'linha-6', 155)
on conflict (name, line) do nothing;

-- ======================================================================
-- SAÍDAS DE EMERGÊNCIA (SE)
-- ======================================================================
insert into locations (name, kind, line, sort_order) values
  ('SE Aquinos',   'se', 'linha-6',  72),
  ('SE Itápolis',  'se', 'linha-6', 118)
on conflict (name, line) do nothing;

-- ======================================================================
-- PÁTIO
-- ======================================================================
insert into locations (name, kind, line, sort_order, address) values
  ('Pátio Morro Grande', 'patio', 'linha-6', 1, 'Rua Raimundo da Cunha Matos, 420')
on conflict (name, line) do nothing;

-- ======================================================================
-- TIPOS DE ATIVIDADE (base inicial — supervisores podem adicionar mais)
-- ======================================================================
insert into activity_types (slug, label_pt, label_en, label_es, icon) values
  ('eletrica',              'Elétrica',               'Electrical',       'Eléctrica',            'zap'),
  ('mecanica',              'Mecânica',               'Mechanical',       'Mecánica',             'cog'),
  ('pintura',               'Pintura',                'Painting',         'Pintura',              'brush'),
  ('estrutura',             'Estrutura',              'Structural',       'Estructura',           'building'),
  ('dutos',                 'Dutos',                  'Ducting',          'Conductos',            'wind'),
  ('instalacao_ventilador', 'Instalação de ventilador','Fan installation','Instalación de ventilador','fan'),
  ('comissionamento',       'Comissionamento',        'Commissioning',    'Puesta en marcha',     'check-circle'),
  ('manutencao',            'Manutenção',             'Maintenance',      'Mantenimiento',        'wrench'),
  ('inspecao',              'Inspeção',               'Inspection',       'Inspección',           'search')
on conflict (slug) do nothing;
