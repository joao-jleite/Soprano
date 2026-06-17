import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageTransition } from '@/components/layout/page-transition';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { SyncEngine } from '@/components/offline/sync-engine';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import { NameOnboarding } from '@/components/profile/name-onboarding';

// Seed: emails que viram admin automaticamente se não tiverem profile.
// Configurado via SEED_ADMIN_EMAILS no ambiente (vírgula-separado).
const SEED_ADMINS = (process.env.SEED_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect({ href: '/login', locale });

  // Busca profile (RLS pode filtrar soft-deleted, por isso .maybeSingle)
  let { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  // Sem profile visível? Auto-provisiona via service role (bypassa RLS e
  // consegue ver/editar rows soft-deletados).
  let diagnostic = '';
  if (!profile) {
    // Nunca usar o e-mail como nome — o nome real é capturado no onboarding
    // (name_confirmed permanece false até o usuário preencher o pop-up).
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ?? 'Novo usuário';
    const defaultRole = SEED_ADMINS.includes(user.email?.toLowerCase() ?? '')
      ? 'admin'
      : 'supervisor';

    const admin = createServiceClient();
    if (!admin) {
      diagnostic = 'SUPABASE_SERVICE_ROLE_KEY não configurado no Vercel';
    } else {
      // 1) Verifica se existe linha (mesmo soft-deleted)
      const { data: existing, error: selErr } = await admin
        .from('profiles')
        .select('full_name, role, deleted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (selErr) {
        diagnostic = `SELECT falhou: ${selErr.message}`;
      } else if (existing) {
        // Existe — se tá soft-deleted, revive. Preserva nome/role originais.
        if ((existing as any).deleted_at) {
          const { data: revived, error: updErr } = await admin
            .from('profiles')
            .update({ deleted_at: null } as any)
            .eq('id', user.id)
            .select('full_name, role')
            .single();
          if (updErr) diagnostic = `UPDATE (revive) falhou: ${updErr.message}`;
          else profile = revived;
        } else {
          // Existe e não tá deleted — RLS estava escondendo? Usa o que veio.
          profile = {
            full_name: (existing as any).full_name,
            role: (existing as any).role,
          };
        }
      } else {
        // Não existe — cria do zero
        const { data: created, error: insErr } = await admin
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fallbackName,
            role: defaultRole,
          } as any)
          .select('full_name, role')
          .single();
        if (insErr) diagnostic = `INSERT falhou: ${insErr.message}`;
        else profile = created;
      }
    }

    // Último recurso: tela de erro com diagnóstico (NÃO redirect — evita loop)
    if (!profile) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Perfil não encontrado</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta existe mas o sistema não conseguiu provisionar o perfil.
            </p>
            {diagnostic && (
              <p className="text-xs font-mono bg-destructive/10 border border-destructive/30 rounded px-3 py-2 text-destructive">
                {diagnostic}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70 font-mono">
              id: {user.id.slice(0, 8)} · {user.email}
            </p>
            <form action="/api/auth/signout" method="post">
              <button className="text-sm underline text-primary">Sair</button>
            </form>
          </div>
        </div>
      );
    }
  }

  // Onboarding de nome: lido SEPARADO e de forma defensiva. Se a coluna
  // name_confirmed ainda não existir no banco (migration 0025 não aplicada),
  // o erro é ignorado e tratamos como confirmado — o app carrega normal, sem
  // pop-up, em vez de travar todo mundo na tela "Perfil não encontrado".
  let nameConfirmed = true;
  try {
    const { data: nc, error: ncErr } = await supabase
      .from('profiles')
      .select('name_confirmed')
      .eq('id', user.id)
      .maybeSingle();
    if (!ncErr && nc && typeof (nc as { name_confirmed?: boolean }).name_confirmed === 'boolean') {
      nameConfirmed = (nc as { name_confirmed: boolean }).name_confirmed;
    }
  } catch {
    /* coluna ausente ou erro de rede → não bloqueia o app */
  }

  // Pré-preenche a partir do nome atual, exceto quando ele parece um e-mail.
  const rawName = profile.full_name ?? '';
  const looksLikeEmail = rawName.includes('@') || rawName === 'Novo usuário' || rawName === 'Usuário';
  const nameParts = looksLikeEmail ? [] : rawName.trim().split(/\s+/).filter(Boolean);
  const defaultFirst = nameParts[0] ?? '';
  const defaultLast = nameParts.slice(1).join(' ');

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <NameOnboarding open={!nameConfirmed} defaultFirst={defaultFirst} defaultLast={defaultLast} />
      <SyncEngine />
      <OfflineIndicator />
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Topbar fullName={profile.full_name} role={profile.role} />
        <main className="flex-1 pb-20 lg:pb-8">
          <div className="px-4 lg:px-8 py-6 lg:py-8 w-full max-w-7xl">
            <Breadcrumbs />
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <MobileNav role={profile.role} />
      </div>
    </div>
  );
}
