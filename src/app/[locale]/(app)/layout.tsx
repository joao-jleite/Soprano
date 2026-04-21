import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageTransition } from '@/components/layout/page-transition';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

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

  if (!user) redirect({ href: '/login', locale });

  let { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Se o user tá autenticado mas não tem profile (edge case: signup sem trigger,
  // RLS bloqueando, profile deletado), cria um default em vez de redirecionar
  // pra /login — senão vira loop infinito com o middleware.
  if (!profile) {
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Usuário';
    const { data: created, error: upsertErr } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, full_name: fallbackName, role: 'supervisor' } as any,
        { onConflict: 'id' },
      )
      .select('full_name, role')
      .single();

    if (upsertErr || !created) {
      // Sem profile e sem conseguir criar — renderiza tela de erro IN-PLACE
      // em vez de redirect, senão vira loop com o middleware.
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Perfil não encontrado</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta existe mas não tem perfil configurado. Contate um administrador
              da Zitrón Brasil para liberar seu acesso.
            </p>
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
    profile = created;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar fullName={profile.full_name} role={profile.role} />
        <main className="flex-1 pb-20 lg:pb-8">
          <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl">
            <Breadcrumbs />
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
