'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type Props = { locale: string };

export function EsqueciSenhaForm({ locale }: Props) {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const redirectTo = `${origin}/api/auth/callback?next=/${locale}/nova-senha`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError('Erro ao enviar o email. Verifique o endereço e tente novamente.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <p className="text-sm font-medium">Email enviado!</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Verifique a sua caixa de entrada em <span className="font-medium text-foreground">{email}</span>.
          O link expira em 1 hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          disabled={loading}
          required
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
          <><Loader2 className="animate-spin" /> Enviando…</>
        ) : (
          <><Mail className="h-4 w-4" /> Enviar link de redefinição</>
        )}
      </Button>

      <p className="text-center">
        <a
          href={`/${locale}/login`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Voltar ao login
        </a>
      </p>
    </form>
  );
}
