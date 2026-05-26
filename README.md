# Soprano

> Registro vivo da obra — Zitrón Brasil · Linha 6 do Metrô de São Paulo

App interno da **Zitrón Brasil** para registro de atividades de obra (ventilação subterrânea da Linha 6-Laranja), com assinatura digital do cliente por atividade, campos expansíveis, fotos, participantes, e filtros.

- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase · next-intl
- **Idiomas:** Português, Inglês, Espanhol
- **Deploy alvo:** Vercel (edge no Brasil, preview por PR)
- **Papéis:** `admin` · `supervisor` · `cliente`

---

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- npm 10+ (ou pnpm/yarn)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, para desenvolvimento 100% local)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar Supabase

**Opção A — Supabase na nuvem (recomendado para o piloto):**

1. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard) (região `sa-east-1` / São Paulo para latência)
2. Vá em **SQL Editor** e cole, **em ordem**, o conteúdo de:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_seed_linha6.sql`
3. Copie URL + anon key de **Settings → API**
4. Preencha `.env.local` (ver abaixo)

**Opção B — Supabase local:**

```bash
supabase start
supabase db push
```

### 4. Variáveis de ambiente

Copie o template e preencha:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # só o servidor usa
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=pt
```

### 5. Criar o primeiro usuário admin

No **Supabase Dashboard → Authentication → Users → Add user**:
- Email + senha
- Depois, no **SQL Editor**:

```sql
update profiles set role = 'admin' where email = 'seu-email@zitron.com.br';
```

### 6. Rodar

```bash
npm run dev
# http://localhost:3000
```

---

## Estrutura do projeto

```
Soprano/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # Rotas com i18n (pt/en/es)
│   │   │   ├── (auth)/login/         # Login
│   │   │   └── (app)/                # App autenticado (sidebar + topbar)
│   │   │       ├── page.tsx          # Dashboard
│   │   │       ├── linha-6/          # Visão da Linha 6
│   │   │       ├── atividades/       # Lista + nova + detalhe + assinar
│   │   │       ├── locais/           # Estações, VSEs, SEs
│   │   │       ├── equipe/           # Usuários (admin)
│   │   │       ├── relatorios/       # Exportações (em construção)
│   │   │       ├── reclamos/         # Módulo futuro — schema pronto
│   │   │       └── configuracoes/    # Perfil
│   │   ├── actions/                  # Server actions
│   │   │   ├── activities.ts
│   │   │   └── signatures.ts
│   │   └── globals.css               # Design tokens
│   ├── components/
│   │   ├── ui/                       # Primitivos (button, input, card, ...)
│   │   ├── brand/                    # Logo, wordmark
│   │   ├── layout/                   # Sidebar, topbar, mobile nav
│   │   ├── activity/                 # ExpandableSelect, ParticipantsEditor, PhotoUpload
│   │   └── signature/                # Canvas de assinatura
│   ├── lib/
│   │   ├── supabase/                 # client/server/middleware + types
│   │   ├── constants.ts
│   │   └── utils.ts
│   ├── i18n/                         # next-intl setup
│   └── messages/                     # pt.json / en.json / es.json
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql   # Tabelas, RLS, triggers, storage
│   │   └── 0002_seed_linha6.sql      # Seed da Linha 6 + tipos de atividade
│   └── config.toml
├── public/                           # favicon, logo
├── middleware.ts                     # Auth guard + i18n
└── tailwind.config.ts                # Design tokens Zitrón
```

---

## Modelo de dados

```
profiles            — extensão de auth.users com role (admin | supervisor | cliente)
locations           — estações, VSEs, SEs, escadarias (seed com dados da Linha 6)
activity_types      — tipos de obra (expansível — supervisor pode adicionar)
activities          — núcleo: local, tipo, supervisor, cliente, status
activity_participants — equipe que executou
activity_photos     — fotos no Storage (bucket: activity-photos)
signatures          — assinatura do cliente (SVG + código de verificação)
complaints          — módulo de reclamos (esqueleto, aguardando definição)
```

**RLS está ativo em todas as tabelas.** Regras principais:

- `supervisor` vê/edita todas as atividades, mas só edita rascunhos próprios
- `cliente` vê apenas atividades onde é o `client_id`, e só após submissão
- `cliente` só pode assinar atividades em status `enviada` e onde é o cliente designado
- `admin` tem acesso total

---

## Fluxo de uma atividade

```
┌─────────────────────────────────────────────────────────────────┐
│  Supervisor cria atividade (rascunho)                           │
│    ├─ Seleciona local (ou cadastra novo via ExpandableSelect)   │
│    ├─ Seleciona tipo (ou cadastra novo)                         │
│    ├─ Descreve o serviço                                        │
│    ├─ Adiciona equipe e fotos                                   │
│    └─ Atribui cliente que vai assinar                           │
│                                                                 │
│  ↓ submete                                                      │
│                                                                 │
│  Status: ENVIADA — cliente recebe no dashboard                  │
│                                                                 │
│  ↓ cliente abre e confirma                                      │
│                                                                 │
│  Cliente assina (canvas) OU rejeita (com motivo)                │
│                                                                 │
│  ↓ trigger no banco                                             │
│                                                                 │
│  Status: ASSINADA ou REJEITADA                                  │
│                                                                 │
│  - Se rejeitada: supervisor pode editar e reenviar              │
│  - Se assinada: imutável, vira comprovante para o contrato      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design system

Todas as cores estão em **design tokens** no topo de `src/app/globals.css`:

```css
--zitron-blue: 212 95% 42%;         /* ~#0959C8 — azul industrial Zitrón */
--zitron-blue-bright: 208 100% 58%; /* acento */
--zitron-ink: 220 20% 5%;           /* fundo */
--zitron-graphite: 220 16% 10%;     /* superfícies */
--zitron-steel: 220 9% 46%;         /* texto secundário */
--zitron-chrome: 220 14% 96%;       /* texto claro */
--zitron-cyan: 190 100% 55%;        /* dados/telemetria */
```

Quando o manual de marca oficial da Zitrón chegar, **só esses valores precisam mudar** — nenhum componente.

- **Tipografia:** Geist Sans (UI) + Geist Mono (dados, códigos)
- **Modo padrão:** escuro (industrial premium)
- **Radius:** 10px suave
- **Animações:** Framer Motion disponível, mas usado com parcimônia

---

## Deploy

### Vercel (recomendado)

```bash
vercel link
vercel env pull .env.local              # opcional
vercel --prod
```

Configurar as env vars em **Vercel Dashboard → Project → Settings → Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

No Supabase, em **Authentication → URL Configuration**, adicionar a URL de produção em `Redirect URLs`.

---

## Scripts

```bash
npm run dev          # Next.js em modo desenvolvimento
npm run build        # build de produção
npm run start        # servidor de produção
npm run lint         # ESLint
npm run typecheck    # TypeScript sem emit
npm run db:types     # regenera types do banco (após alterar schema)
npm run db:push      # aplica migrations (Supabase local)
```

---

## O que está pronto vs. o que falta

### Pronto

- Login com email/senha (Supabase Auth)
- Dashboard com KPIs e pendências
- Visão consolidada da Linha 6 (15 estações, 16 VSEs, 2 SEs, pátio)
- Lista de atividades com filtros (local, tipo, status, período)
- Criação de atividade com campos **expansíveis** (local e tipo)
- Equipe (participantes) como chips
- Upload de múltiplas fotos por atividade (Supabase Storage)
- Fluxo de submissão → assinatura do cliente (canvas SVG) → status final
- Rejeição com motivo
- 3 idiomas (PT/EN/ES) com switcher no topbar
- RLS em todas as tabelas
- Mobile-first (bottom nav no celular, sidebar no desktop)

### Próximas iteradas (sugestões)

- [ ] Gerador de PDF do relatório da atividade (com assinatura + hash + QR code de verificação)
- [ ] Mapa da Linha 6 com pinos nas obras (Mapbox)
- [ ] Localização automática na foto (GPS do celular)
- [ ] Modo offline-first com sincronização em segundo plano (PWA + IndexedDB)
- [ ] Módulo de reclamos completo (após alinhamento com a equipe)
- [ ] Push notifications para cliente (assinatura pendente)
- [ ] Relatório consolidado mensal em PDF
- [ ] Exportação CSV
- [ ] Dashboard específico do cliente (visão diferenciada)
- [ ] Testes E2E com Playwright
- [ ] Auditoria completa (log de tudo que muda)

---

## Contato

**Zitrón Brasil** — Ventilação subterrânea
Projeto: Linha 6-Laranja do Metrô de São Paulo (Linha Uni / Acciona)
