'use client';

import * as React from 'react';
import { Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMyName } from '@/app/actions/profile';

/**
 * Pop-up OBRIGATÓRIO de nome. Aparece quando o usuário ainda não confirmou o
 * próprio nome (name_confirmed = false). Não pode ser fechado: usa um overlay
 * próprio (sem botão X / sem fechar por fora) — a única saída é preencher.
 */
export function NameOnboarding({
  open,
  defaultFirst = '',
  defaultLast = '',
}: {
  open: boolean;
  defaultFirst?: string;
  defaultLast?: string;
}) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [first, setFirst] = React.useState(defaultFirst);
  const [last, setLast] = React.useState(defaultLast);
  const [saving, setSaving] = React.useState(false);

  if (!open) return null;

  async function save() {
    const f = first.trim();
    const l = last.trim();
    if (f.length < 2 || l.length < 2) {
      toast.error(t('validation'));
      return;
    }
    setSaving(true);
    const res = await updateMyName({ fullName: `${f} ${l}` });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ob-first">{t('firstName')}</Label>
            <Input
              id="ob-first"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-last">{t('lastName')}</Label>
            <Input
              id="ob-last"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
              }}
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}
