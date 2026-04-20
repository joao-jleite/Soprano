import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PageTransition } from '@/components/layout/page-transition';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect({ href: '/login', locale });

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar fullName={profile.full_name} role={profile.role} />
        <main className="flex-1 pb-20 lg:pb-8">
          <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
