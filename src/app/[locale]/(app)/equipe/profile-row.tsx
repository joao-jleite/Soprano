'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Check, Pencil, X, Loader2 } from 'lucide-react';
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
import { updateProfile } from '@/app/actions/team';
import { initials } from '@/lib/utils';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'cliente';
  company: string | null;
};

export function ProfileRow({ profile, editable }: { profile: Profile; editable: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [company, setCompany] = React.useState(profile.company ?? '');
  const [role, setRole] = React.useState<Profile['role']>(profile.role);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({
        id: profile.id,
        full_name: fullName,
        company: company || null,
        role,
      });
      toast.success('Perfil atualizado');
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar');
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
                placeholder="Nome completo"
                className="h-8 text-sm"
              />
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Empresa"
                className="h-8 text-xs"
              />
            </>
          ) : (
            <>
              <p className="font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
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
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="supervisor">supervisor</SelectItem>
                <SelectItem value="cliente">cliente</SelectItem>
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
              {profile.role}
            </Badge>
            {editable && (
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
