'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/app/actions/auth';

export function LoginForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set('email', email);
    fd.set('password', password);
    fd.set('next', searchParams.get('next') ?? '/');
    fd.set('locale', locale);

    // Server action lança NEXT_REDIRECT em caso de sucesso — não retorna normalmente.
    // Se retornar { ok: false } é porque as credenciais falharam.
    try {
      const result = await loginAction(fd);
      if (result && !result.ok) {
        setError(result.error ?? t('invalidCredentials'));
        setLoading(false);
      }
    } catch (err) {
      // NEXT_REDIRECT é re-thrown pelo React para efetivar o redirect.
      // Outros erros caem aqui.
      if (err && typeof err === 'object' && 'digest' in err) {
        // É o redirect — deixa propagar (não faz nada)
        throw err;
      }
      setError(t('invalidCredentials'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('password')}</Label>
          <a href="#" className="text-[11px] text-primary hover:underline">
            {t('forgotPassword')}
          </a>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {t('signingIn')}
          </>
        ) : (
          t('signIn')
        )}
      </Button>
    </form>
  );
}
