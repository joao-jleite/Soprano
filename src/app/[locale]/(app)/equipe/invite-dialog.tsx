'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Check, Copy, Loader2, UserPlus } from 'lucide-react';
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
  const t  = useTranslations('team');
  const tc = useTranslations('common');

  const [open,        setOpen]        = React.useState(false);
  const [email,       setEmail]       = React.useState('');
  const [fullName,    setFullName]    = React.useState('');
  const [company,     setCompany]     = React.useState('');
  const [role,        setRole]        = React.useState<'admin' | 'supervisor' | 'cliente'>('supervisor');
  const [loading,     setLoading]     = React.useState(false);
  const [inviteUrl,   setInviteUrl]   = React.useState<string | null>(null);
  const [isRecovery,  setIsRecovery]  = React.useState(false);
  const [copied,      setCopied]      = React.useState(false);

  function reset() {
    setEmail('');
    setFullName('');
    setCompany('');
    setRole('supervisor');
    setInviteUrl(null);
    setIsRecovery(false);
    setCopied(false);
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) reset();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await inviteUser({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role,
        company: company.trim() || null,
      });
      if (result?.error) {
        toast.error(result.error);
      } else if (result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        setIsRecovery(result.isRecovery ?? false);
        // Mantém o dialog aberto para mostrar o link
      } else {
        // Conta ativa atualizada sem necessidade de novo link
        toast.success(t('inviteSent', { email }));
        setOpen(false);
        reset();
      }
    } catch (err: any) {
      toast.error(err?.message ?? t('inviteError'));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: seleciona o texto
      const input = document.getElementById('invite-link-input') as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          {t('invite')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {/* ── Estado 1: Formulário de convite ─────────────────────────── */}
        {!inviteUrl && (
          <>
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
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('inviteSend')}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {/* ── Estado 2: Link gerado — copiar e compartilhar ────────────── */}
        {inviteUrl && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {isRecovery ? 'Link de acesso gerado!' : 'Convite criado!'}
              </DialogTitle>
              <DialogDescription>
                {isRecovery
                  ? <>Este usuário já possui conta. Envie o link abaixo para <strong>{email}</strong> — ao clicar, ele poderá definir uma nova senha.</>
                  : <>Envie o link abaixo para <strong>{email}</strong> por WhatsApp, e-mail ou outro canal. O link é válido para um único uso.</>
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="invite-link-input" className="text-xs text-muted-foreground">
                Link de acesso
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invite-link-input"
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs bg-muted select-all"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  size="icon"
                  variant={copied ? 'default' : 'outline'}
                  onClick={copyLink}
                  className="shrink-0 transition-colors"
                  title="Copiar link"
                >
                  {copied
                    ? <Check className="h-4 w-4" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Link copiado para a área de transferência!
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => { reset(); /* volta ao form para novo convite */ }} variant="ghost">
                Novo convite
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
