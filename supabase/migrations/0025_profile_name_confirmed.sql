-- Soprano 0025 — name_confirmed em profiles (onboarding de nome)
--
-- Marca se o usuário já confirmou o próprio nome (primeiro + último). Enquanto
-- false, o app mostra um pop-up obrigatório pedindo nome e sobrenome. Resolve a
-- causa raiz de e-mails aparecendo no lugar do nome: antes, quem nunca definiu
-- nome ficava com full_name = e-mail, e isso vazava nas atividades.
--
-- Todas as linhas existentes recebem false → todos os usuários atuais serão
-- convidados a confirmar o nome no próximo acesso.

alter table profiles add column if not exists name_confirmed boolean not null default false;

notify pgrst, 'reload schema';
