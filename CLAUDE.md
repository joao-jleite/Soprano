# Soprano — CLAUDE.md

Guia técnico para desenvolvimento. Leia antes de modificar o projeto.

## Visão Geral

Aplicação web interna da **Zitrón Brasil** para registro digital de atividades de construção subterrânea (Metrô Linha 6 Laranja, São Paulo). Supervisores registram atividades e clientes assinam digitalmente via link único.

**Stack:** Next.js 14 App Router · TypeScript · Supabase (PostgreSQL + RLS) · Tailwind/shadcn · Vercel

## Setup Rápido

```bash
cp .env.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Para banco local: `supabase start && supabase db reset`

## Variáveis de Ambiente Obrigatórias

| Variável | Onde usar |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Todos os clientes Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente browser/server (RLS ativo) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service client (bypass RLS) — apenas server |
| `SEED_ADMIN_EMAILS` | Emails que viram admin na auto-provisão (vírgula-separado) |

Opcionais: `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`.

## Arquitetura

```
middleware.ts          — session refresh, auth guard, locale detection
(app)/layout.tsx       — profile provisioning, sidebar/topbar layout
(app)/*/page.tsx       — Server Components: fetch data → render
components/            — UI puro; sem acesso direto ao Supabase
app/actions/           — Server Actions: validar (Zod) → guard → mutate → revalidate
guards/auth.guard.ts   — requireAuth(), requireRole(), requireAuthAndRole()
lib/supabase/          — createClient() (server), createClient() (browser), createServiceClient()
supabase/migrations/   — Schema SQL com RLS, triggers, audit_log
```

## Regras de Desenvolvimento

### Server Actions

Todo Server Action deve:
1. Parsear o input com Zod primeiro
2. Chamar `requireAuthAndRole()` do guard — nunca checar role manualmente
3. Retornar `{ error?: string }` para mutações invocadas por botões de usuário
4. Fazer `throw` apenas em operações de fluxo crítico (middleware, provisioning)

```typescript
// Padrão correto
export async function deleteActivity(id: string): Promise<{ error?: string }> {
  try {
    const actId = z.string().uuid().parse(id);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');
    // ...
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
```

### Tipos

- **Nunca usar `as any` em queries Supabase** — se um tipo não existe em `database.types.ts`, adicione-o
- O comando `npm run db:types` regenera os tipos a partir do banco local
- Para novas tabelas criadas antes de regenerar, adicionar manualmente em `database.types.ts`

### Logging

Use `logger.for('contexto')` em vez de `console.log`:

```typescript
import { logger } from '@/lib/logger';
const log = logger.for('inviteUser');
log.info('Gerando convite', { email: parsed.email });
log.error('Falha ao gerar link', { status: res.status });
```

### Banco de Dados

- **Toda mutação usa RLS** — o cliente Supabase padrão (`createClient()`) tem RLS ativo
- **Service client** (`createServiceClient()`) bypassa RLS — usar SOMENTE quando necessário (auth admin, lookup de email)
- **Soft delete** via `deleted_at` — nunca fazer DELETE direto em activities, profiles, locations, activity_types
- Para novas tabelas, seguir o padrão das migrations existentes: enum de status, soft-delete, RLS, audit trigger

### Migrações

```bash
# Criar nova migration
supabase migration new nome_da_migration

# Aplicar localmente
supabase db reset

# Aplicar em produção
supabase db push
```

### Componentes

- Componentes de domínio em `components/features/[dominio]/`
- Componentes genéricos de UI em `components/ui/` (shadcn)
- Nunca acessar Supabase em Client Components — passar dados via props do Server Component
- `StatusBadge` está em `components/ui/status-badge.tsx` — não redefinir em páginas

## Papéis (RBAC)

| Ação | admin | supervisor | cliente |
|------|-------|-----------|---------|
| Ver todas atividades | ✅ | ✅ | ✅ (só as suas, não-rascunho) |
| Criar atividade | ✅ | ✅ | ❌ |
| Editar atividade (rascunho) | ✅ | ✅ (só próprias) | ❌ |
| Excluir atividade | ✅ | ✅ (só próprias) | ❌ |
| Assinar atividade | ❌ | ❌ | ✅ (só as suas) |
| Gerenciar equipe | ✅ | ❌ | ❌ |
| Ver relatórios | ✅ | ✅ | ❌ |

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção (falha em erros de tipo)
npm run typecheck    # Checa tipos sem build
npm run lint         # ESLint
npm run db:types     # Regenera database.types.ts do banco local
npm run db:reset     # Recria banco local com todas as migrations
npm run test         # Vitest (unit tests)
npm run test:ui      # Vitest com interface visual
```

## Fluxo de Assinatura

```
Supervisor cria atividade [rascunho]
→ Adiciona ao Resumo Diário
→ Envia Resumo [aguardando_assinatura]  ← status muda via Server Action
→ Cliente recebe email (se RESEND configurado)
→ Cliente assina → trigger SQL:
    • daily_reports.status → 'assinado'
    • activities.status → 'assinada' (para todas do resumo)
→ Supervisor vê atividade [assinada] com SVG + código de verificação
→ Qualquer um pode verificar autenticidade em /verify/[código]
```

Rejeição: mesmo fluxo, mas trigger marca como 'cancelado'/'rejeitada'. O supervisor pode reenviar após revisão.

## Adicionando Novos Tipos de Atividade com Duração Padrão

Editar `src/lib/constants/activity-durations.ts` — não colocar dados no componente de formulário.
