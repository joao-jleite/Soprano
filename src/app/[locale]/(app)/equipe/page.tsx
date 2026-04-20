import { setRequestLocale } from 'next-intl/server';
import { FileSearch, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ProfileRow } from './profile-row';

export const dynamic = 'force-dynamic';

export default async function EquipePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const isAdmin = (me as any)?.role === 'admin';

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, company')
    .is('deleted_at', null)
    .order('role')
    .order('full_name');

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Supervisores, administradores e clientes cadastrados no Soprano.
            {isAdmin && ' Você pode editar nome, empresa e papel clicando no lápis.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/equipe/auditoria">
                <FileSearch className="h-4 w-4" />
                Auditoria
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/equipe/lixeira">
                <Trash2 className="h-4 w-4" />
                Lixeira
              </Link>
            </Button>
          </div>
        )}
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {(profiles ?? []).map((p: any) => (
          <li key={p.id}>
            <ProfileRow profile={p} editable={isAdmin} />
          </li>
        ))}
      </ul>
    </div>
  );
}
