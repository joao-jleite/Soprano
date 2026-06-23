import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordForm } from './change-password-form';
import { EditNameForm } from './edit-name-form';

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('nav.settings')}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settings.profile')}</CardTitle>
          <CardDescription>{t('settings.profileDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('settings.name')}</Label>
            <EditNameForm initialName={profile?.full_name ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.email')}</Label>
            <Input defaultValue={profile?.email ?? ''} disabled />
            <p className="text-[11px] text-muted-foreground">{t('settings.emailPrivate')}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.role')}</Label>
            <div>
              <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                {profile?.role ? t(`roles.${profile.role}`) : '—'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segurança</CardTitle>
          <CardDescription>Altere sua senha de acesso ao Soprano.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
