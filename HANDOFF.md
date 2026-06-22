# Soprano — Handoff (estado do projeto)

Documento para retomar o desenvolvimento em outra máquina / outra sessão do Claude Code.
Leia também o **CLAUDE.md** (guia técnico) na raiz. Última atualização: 2026-06-22.

> Repositório: https://github.com/joao-jleite/Soprano · Deploy: Vercel (push na `main` = deploy automático) · Banco: Supabase.

---

## ⚠️ Pegadinhas que você PRECISA saber antes de mexer

1. **As migrations do Supabase são MANUAIS.** O `git push` na `main` dispara o deploy na Vercel **na hora**, mas as migrations em `supabase/migrations/` precisam ser rodadas **à mão** no SQL Editor do Supabase. Consequência: **nunca suba código que dependa de uma coluna/tabela ainda não migrada** — isso já causou um lockout total (tela "Perfil não encontrado" para todos). Ou avise para rodar a migration **antes**, ou escreva o código tolerando a ausência (leitura defensiva, fora do caminho crítico de auth/layout). Toda migration nova deve terminar com `notify pgrst, 'reload schema';` e vir com uma query de verificação (`information_schema.columns`).

2. **A pasta do projeto pode estar aninhada.** Em alguns checkouts o código real fica em `Soprano-main/Soprano-main/`. Rode os comandos npm de dentro da pasta que tem o `package.json` (ou use `npm --prefix <caminho>`).

3. **Commit e deploy são automáticos por preferência do dono.** Ao concluir um trabalho, **faça o commit e o push você mesmo** (na `main`), sem pedir. O push já publica na Vercel.

4. **Mensagens de commit:** evite aspas/parênteses dentro de here-strings do PowerShell (quebram o `-m`). Termine com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Visão geral

App interno da **Zitrón Brasil** para registro digital de atividades da obra do **Metrô Linha 6 Laranja (SP)**, cliente **Acciona**. Next.js 14 (App Router) · TypeScript · Supabase (Postgres + RLS) · Tailwind/shadcn · i18n PT/EN/ES · PWA com modo offline.

Papéis: **admin**, **supervisor**, **cliente**. Fluxo central: supervisor cria atividade → resumo diário → cliente assina → verificável em `/verify/[código]`.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencher NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
# Verificação: npm run typecheck && npm run lint && npm run test && npm run build
```

## Estado das migrations

Última: **0026**. Aplicar no SQL Editor do Supabase em ordem. Já aplicadas em produção: até 0025. **Confirme a 0026** (tipo de atividade "Logística") — rodar se ainda não foi.

Migrations recentes (destas sessões):
- `0023_claims_module.sql` — módulo de Reclamos (tabelas claims/claim_attachments/claim_timeline, RLS, enums, bucket).
- `0024_activity_participants_allow_duplicate_names.sql` — troca PK para permitir participante com nome repetido.
- `0025_profile_name_confirmed.sql` — coluna `name_confirmed` (onboarding de nome).
- `0026_add_activity_type_logistica.sql` — tipo "Logística".

## O que foi entregue recentemente

- **Modo offline robusto** (criar atividade sem rede, fila "Aguardando envio", editar pendente offline, sync idempotente por `client_key`). Ver `src/lib/offline/*`.
- **Módulo de Reclamos — Fase 1** (pleitos Zitrón→Acciona): criar/listar/detalhe, enviar (email Resend + caixa no app), acuse de recebimento (com IP), resposta da Acciona (aceito/rejeitado/parcial), timeline, impacto prazo/custo. Online apenas. Ver `src/app/[locale]/(app)/reclamos/*`, `src/app/actions/claims.ts`, `memory`/`claims-module`.
- **Fotos (correções importantes):** preview aparece na hora (independe de GPS/conversão), normalização HEIC→JPEG no celular, seleção da galeria liberada (sem `capture`). Ver `src/components/activity/photo-capture.tsx`. PDFs esperam as imagens decodificarem (`src/app/api/**/pdf/route.ts`).
- **Perfil/privacidade:** pop-up obrigatório de nome+sobrenome no 1º acesso (`name_confirmed`), e-mail privado (só nas Configurações do dono; escondido em Equipe/Lixeira/Auditoria), nome editável. Ver `src/components/profile/name-onboarding.tsx`, `src/app/actions/profile.ts`.

## Pendências / roadmap

- **Reclamos Fase 2:** PDF oficial do reclamo (Puppeteer), página pública `/verify` do reclamo (RPC `claims_verify` ainda não criada), tela de edição de rascunho (ação `updateClaim` já existe, falta UI), anexos/evidências na UI (tabela `claim_attachments` + bucket já existem), widget no dashboard.
- **Reclamos Fase 3:** webhooks Resend, lembretes de reclamos não-acusados, exportações.
- **Perfil (extras sugeridos):** avatar/foto real (hoje só iniciais), telefone/empresa editáveis pelo usuário, idioma preferido editável (`preferred_locale` já existe), primeiro/último nome separados no banco.

## Mapa rápido do código

```
src/app/[locale]/(app)/        — páginas autenticadas (atividades, reclamos, equipe, resumo-diario, configuracoes)
src/app/actions/               — Server Actions (activities, claims, profile, team, signatures, daily-reports)
src/app/api/**/pdf/route.ts    — geração de PDF via Puppeteer + Chromium
src/components/activity/        — captura de foto, participantes, seletores
src/components/profile/         — onboarding de nome
src/lib/offline/                — fila offline (Dexie/IndexedDB) + sync
src/lib/supabase/               — clients (server/browser/service) + database.types.ts
src/lib/notify/email.ts         — templates de email (Resend)
supabase/migrations/            — schema versionado (rodar manualmente)
src/messages/{pt,en,es}.json    — i18n
```

> Dica: o conhecimento de projeto que eu (Claude) acumulei está na MINHA memória local (`~/.claude/projects/<hash>/memory/`), que **não** vai no repo. Para levar para outra máquina, copie essa pasta `memory/`, ou confie neste HANDOFF + CLAUDE.md + histórico do Git.
