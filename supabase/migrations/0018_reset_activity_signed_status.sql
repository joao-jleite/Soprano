-- Atividades não têm mais status 'assinada' — assinatura é controlada pelo resumo diário.
-- Reseta todas as atividades marcadas como 'assinada' de volta para 'rascunho'.
update activities
  set status = 'rascunho', updated_at = now()
  where status = 'assinada';
