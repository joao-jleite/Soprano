-- Soprano 0022 — Chave de idempotência para criação offline
--
-- PROBLEMA: createActivity não é idempotente. Quando o app cria uma atividade
-- (online ou via sync da fila offline) e a resposta se perde no caminho — algo
-- comum em campo, sinal instável no metrô — o cliente acha que falhou e tenta
-- de novo. O servidor já havia commitado o insert → atividade DUPLICADA.
--
-- SOLUÇÃO: cada atividade carrega uma `client_key` gerada no dispositivo
-- (formato `<draftId>:<activity_type_id>`, estável por submissão + tipo). Um
-- índice único parcial garante que o retry com a mesma chave não cria uma
-- segunda linha — o createActivity detecta a existente e devolve o id dela.
--
-- A coluna é nullable: linhas antigas e qualquer insert sem chave (caminhos
-- legados) continuam válidos; o índice só vigia linhas com client_key.

alter table activities add column if not exists client_key text;

create unique index if not exists uq_activities_client_key
  on activities (client_key)
  where client_key is not null;
