import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from './login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SopranoMark } from '@/components/brand/logo';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const tApp = await getTranslations('app');

  return (
    <Card className="w-full max-w-[420px] surface-elevated">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <SopranoMark className="h-11 w-11" trail />
          <div>
            <CardTitle className="text-2xl">{t('signInTitle')}</CardTitle>
            <CardDescription>{t('signInSubtitle')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-xs text-muted-foreground text-center">
          {t('noAccount')}
        </p>
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 text-center">
          {tApp('tagline')}
        </p>
      </CardContent>
    </Card>
  );
}
