import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{t('signIn')}</h1>
        <p className="text-[13.5px] text-muted-foreground">{t('signInHelp')}</p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <div className="h-px bg-border" />
      <p className="text-center text-xs text-muted-foreground">{t('noAccount')}</p>
    </div>
  );
}
