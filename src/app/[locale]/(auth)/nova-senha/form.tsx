'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type Props = { locale: string };

export function NovaSenhaForm({ locale }: Props) {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const strength = React.useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength];
  const strengthColor = ['', 'bg-destructive', 'bg-amber-400', 'bg-primary', 'bg-green-500'][strength];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message ?? 'Erro ao salvar senha.');
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => {
      window.location.href = `/${locale}`;
    }, 2000);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <p className="text-sm font-medium">Senha definida com sucesso!</p>
        <p className="text-xs text-muted-foreground">Redirecionando para o sistema…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            disabled={loading}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Barra de força */}
        {password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                    i <= strength ? strengthColor : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{strengthLabel}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input
          id="confirm"
          type={showPwd ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a senha"
          disabled={loading}
          required
        />
        {confirm && password !== confirm && (
          <p className="text-[11px] text-destructive">As senhas não coincidem</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || password !== confirm || password.length < 8}
      >
        {loading ? (
          <><Loader2 className="animate-spin" /> Salvando…</>
        ) : (
          <><KeyRound className="h-4 w-4" /> Definir senha</>
        )}
      </Button>
    </form>
  );
}
