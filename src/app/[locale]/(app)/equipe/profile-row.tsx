'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check, Pencil, X, Loader2, Clock, CircleDot, CircleMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { updateProfile, deleteProfileUser } from '@/app/actions/team';
import { initials, timeAgo } from '@/lib/utils';
import type { AuthMeta } from './page';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'cliente';
  company: string | null;
};

/**
 * Quando o usuário clica no link do convite, o callback chama verifyOtp/
 * exchangeCodeForSession — o Supabase seta last_sign_in_at nesse momento,
 * mesmo sem o usuário ter feito um login real com senha.
 * Consideramos isso "acesso real" apenas se last_sign_in_at chegou > 5 min
 * depois de email_confirmed_at (ou seja, foi um login posterior ao invite).
 */
function isRealSignIn(meta: AuthMeta): boolean {
  if (!meta.lastSignInAt) return false;
  if (!meta.confirmedAt) return false;
  const diff = new Date(meta.lastSignInAt).getTime() - new Date(meta.confirmedAt).getTime();
  return diff > 5 * 60 * 1000; // mais de 5 min depois da confirmação
}

function AuthStatus({ meta, isSelf }: { meta: AuthMeta; isSelf: boolean }) {
  if (isSelf) return null;

  // Convite ainda não aceito (link nunca clicado)
  if (!meta.confirmedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-full px-2 py-0.5 leading-none">
        <Clock className="h-2.5 w-2.5 shrink-0" />
        Convite pendente
      </span>
    );
  }

  // Confirmou (clicou no link / definiu senha) mas nunca fez login real
  if (!isRealSignIn(meta)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 leading-none">
        <CircleMinus className="h-2.5 w-2.5 shrink-0" />
        Aguardando primeiro acesso
      </span>
    );
  }

  // Tem login real registrado
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 leading-none">
      <CircleDot className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
      {timeAgo(meta.lastSignInAt!)}
    </span>
  );
}

export function ProfileRow({
  profile,
  editable,
  currentUserId,
  authMeta,
}: {
  profile: Profile;
  editable: boolean;
  currentUserId?: string;
  authMeta?: AuthMeta;
}) {
  const t  = useTranslations('team');
  const tr = useTranslations('roles');

  const [editing,  setEditing]  = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [company,  setCompany]  = React.useState(profile.company ?? '');
  const [role,     setRole]     = React.useState<Profile['role']>(profile.role);
  const [saving,   setSaving]   = React.useState(false);
  const [removed,  setRemoved]  = React.useState(false);

  const isSelf = currentUserId === profile.id;
  // "Pendente" = link do convite nunca foi clicado (email não confirmado)
  const isPending = authMeta && !authMeta.confirmedAt;

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ id: profile.id, full_name: fullName, company: company || null, role });
      toast.success(t('profileUpdated'));
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message ?? t('profileUpdateError'));
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setFullName(profile.full_name);
    setCompany(profile.company ?? '');
    setRole(profile.role);
    setEditing(false);
  }

  async function handleDelete() {
    const result = await deleteProfileUser(profile.id);
    if (result?.error) throw new Error(result.error);
    setRemoved(true);
  }

  if (removed) return null;

  return (
    <Card className={isPending ? 'border-amber-200/60 dark:border-amber-700/30' : ''}>
      <CardContent className="p-4 flex items-center gap-4">

        {/* Avatar */}
        <div className={[
          'h-12 w-12 rounded-full text-sm font-semibold border flex items-center justify-center shrink-0 relative',
          isPending
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/40'
            : 'bg-primary/15 text-primary border-primary/25',
        ].join(' ')}>
          {initials(profile.full_name)}
          {/* Ponto de status no canto inferior direito */}
          {authMeta && !isSelf && (
            <span className={[
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
              !authMeta.confirmedAt
                ? 'bg-amber-400 dark:bg-amber-500'   // pendente
                : isRealSignIn(authMeta)
                  ? 'bg-emerald-500'                 // acesso real
                  : 'bg-muted-foreground/30',        // aguardando primeiro acesso
            ].join(' ')} />
          )}
        </div>

        {/* Info / campos */}
        <div className="min-w-0 flex-1 space-y-0.5">
          {editing ? (
            <>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profileNamePlaceholder')} className="h-8 text-sm" />
              <Input value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder={t('profileCompanyPlaceholder')} className="h-8 text-xs mt-1" />
            </>
          ) : (
            <>
              <p className="font-medium truncate leading-snug">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              {profile.company && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {profile.company}
                </p>
              )}
              {/* Status de autenticação */}
              {authMeta && (
                <div className="pt-0.5">
                  <AuthStatus meta={authMeta} isSelf={isSelf} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        {editing ? (
          <div className="flex flex-col gap-1.5 items-stretch">
            <Select value={role} onValueChange={(v) => setRole(v as Profile['role'])}>
              <SelectTrigger className="h-8 text-xs min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{tr('admin')}</SelectItem>
                <SelectItem value="supervisor">{tr('supervisor')}</SelectItem>
                <SelectItem value="cliente">{tr('cliente')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button size="icon" variant="default" onClick={save} disabled={saving} className="h-7 w-7">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={cancel} disabled={saving} className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={
              profile.role === 'admin' ? 'default' :
              profile.role === 'cliente' ? 'accent' : 'secondary'
            }>
              {tr(profile.role)}
            </Badge>

            {editable && (
              <>
                <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                {!isSelf && (
                  <ConfirmDeleteButton
                    onConfirm={handleDelete}
                    title="Remover usuário"
                    description={`Deseja remover ${profile.full_name} (${profile.email}) da equipe? O usuário ficará na lixeira e pode ser restaurado depois.`}
                    size="icon"
                    iconOnly
                  />
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
