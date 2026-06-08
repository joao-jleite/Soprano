import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FileSearch, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ProfileRow } from './profile-row';
import { InviteDialog } from './invite-dialog';

export const dynamic = 'force-dynamic';

export default async function EquipePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('team');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const isAdmin = (me as any)?.role === 'admin';

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, company')
    .is('deleted_at', null)
    .order('role')
    .order('full_name');

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('description')}
            {isAdmin && ' ' + t('adminHint')}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <InviteDialog />
            <Button asChild variant="outline" size="sm">
              <Link href="/equipe/auditoria">
                <FileSearch className="h-4 w-4" />
                {t('audit')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/equipe/lixeira">
                <Trash2 className="h-4 w-4" />
                {t('trash')}
              </Link>
            </Button>
          </div>
        )}
      </header>

      {profilesError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs font-mono text-destructive">
          DB error: {profilesError.message} · code: {profilesError.code}
        </div>
      )}

      {!profilesError && (!profiles || profiles.length === 0) && (
        <div className="rounded-md border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground/60 mt-1">{t('emptyHint')}</p>
          )}
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {(profiles ?? []).map((p: any) => (
          <li key={p.id}>
            <ProfileRow profile={p} editable={isAdmin} isSelf={p.id === user?.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
