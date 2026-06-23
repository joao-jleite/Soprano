'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check, Pencil, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
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
import { updateProfile, deleteUser } from '@/app/actions/team';
import { initials } from '@/lib/utils';

type Profile = {
  id: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'cliente';
  company: string | null;
};

type Props = {
  profile: Profile;
  editable: boolean;
  isSelf: boolean;
};

export function ProfileRow({ profile, editable, isSelf }: Props) {
  const t = useTranslations('team');
  const tr = useTranslations('roles');
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [company, setCompany] = React.useState(profile.company ?? '');
  const [role, setRole] = React.useState<Profile['role']>(profile.role);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const result = await updateProfile({
      id: profile.id,
      full_name: fullName,
      company: company || null,
      role,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('profileUpdated'));
    setEditing(false);
  }

  function cancel() {
    setFullName(profile.full_name);
    setCompany(profile.company ?? '');
    setRole(profile.role);
    setEditing(false);
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/25 flex items-center justify-center shrink-0">
          {initials(profile.full_name)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profileNamePlaceholder')}
                className="h-8 text-sm"
              />
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t('profileCompanyPlaceholder')}
                className="h-8 text-xs"
              />
            </>
          ) : (
            <>
              <p className="font-medium truncate">
                {profile.full_name}
                {isSelf && (
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground uppercase tracking-wider">
                    você
                  </span>
                )}
              </p>
              {profile.company && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {profile.company}
                </p>
              )}
            </>
          )}
        </div>

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
          <div className="flex items-center gap-2">
            <Badge variant={profile.role === 'admin' ? 'default' : profile.role === 'cliente' ? 'accent' : 'secondary'}>
              {tr(profile.role)}
            </Badge>
            {editable && (
              <>
                <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {!isSelf && (
                  <ConfirmDeleteButton
                    onConfirm={async () => {
                      const result = await deleteUser(profile.id);
                      if (result.error) throw new Error(result.error);
                      router.refresh();
                    }}
                    title="Desativar usuário"
                    description={`Desativar "${profile.full_name}"? O acesso ao sistema será bloqueado imediatamente. O usuário pode ser reativado pela lixeira.`}
                    triggerLabel=""
                    iconOnly
                    size="icon"
                    variant="ghost"
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
