'use client';

import * as React from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export function ChangePasswordForm() {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message ?? 'Erro ao alterar a senha.');
    } else {
      setSuccess(true);
      setPassword('');
      setConfirm('');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Nova senha</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setSuccess(false); }}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirmar senha</Label>
          <Input
            id="confirm-password"
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setSuccess(false); }}
            placeholder="Repita a nova senha"
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Senha alterada com sucesso!</span>
        </div>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={loading || !password || password !== confirm}
      >
        {loading ? <><Loader2 className="animate-spin h-3.5 w-3.5" /> Salvando…</> : 'Alterar senha'}
      </Button>
    </form>
  );
}
