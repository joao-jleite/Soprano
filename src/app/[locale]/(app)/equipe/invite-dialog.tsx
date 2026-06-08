'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inviteUser } from '@/app/actions/team';

export function InviteDialog() {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [role, setRole] = React.useState<'admin' | 'supervisor' | 'cliente'>('supervisor');
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await inviteUser({
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role,
      company: company.trim() || null,
    });
    setLoading(false);

    if (result.error && !result.ok) {
      // Erro total — convite não foi enviado
      toast.error(result.error);
      return;
    }

    // Convite enviado (ok=true), mesmo que perfil tenha tido aviso parcial
    toast.success(t('inviteSent', { email }));
    if (result.error) {
      // Aviso: convite foi mas houve problema no perfil
      toast.warning(result.error);
    }
    setEmail('');
    setFullName('');
    setCompany('');
    setRole('supervisor');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          {t('invite')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">{t('inviteEmail')}</Label>
            <Input
              id="inv-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="fulano@acciona.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">{t('inviteFullName')}</Label>
            <Input
              id="inv-name"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-company">{t('inviteCompany')}</Label>
            <Input
              id="inv-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acciona · LinhaUni · Zitrón"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('inviteRole')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supervisor">{t('roleSupervisor')}</SelectItem>
                <SelectItem value="cliente">{t('roleClient')}</SelectItem>
                <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('inviteSend')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
