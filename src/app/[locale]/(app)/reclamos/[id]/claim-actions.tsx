'use client';

import * as React from 'react';
import { Loader2, Send, CheckCircle2, MessageSquareReply } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  sendClaim,
  acknowledgeClaim,
  respondClaim,
  deleteClaim,
} from '@/app/actions/claims';
import type { ClaimOutcome } from '@/lib/supabase/database.types';

// ── Enviar (autor Zitrón) ───────────────────────────────────────────────────

export function SendClaimButton({ claimId, disabled }: { claimId: string; disabled?: boolean }) {
  const t = useTranslations('claims');
  const tc = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await sendClaim(claimId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('sentSuccess'));
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Send className="h-4 w-4" />
          {t('send')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('send')}</DialogTitle>
          <DialogDescription>{t('confirmSend')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            {tc('cancel')}
          </Button>
          <Button onClick={handle} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? t('sending') : t('send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Acusar recebimento (Acciona) ────────────────────────────────────────────

export function AcknowledgeClaimButton({ claimId }: { claimId: string }) {
  const t = useTranslations('claims');
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await acknowledgeClaim(claimId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('ackSuccess'));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-sm text-muted-foreground">{t('ackHint')}</p>
      <Button onClick={handle} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {loading ? t('acknowledging') : t('acknowledge')}
      </Button>
    </div>
  );
}

// ── Responder (Acciona) ─────────────────────────────────────────────────────

const OUTCOMES: ClaimOutcome[] = ['aceito', 'rejeitado', 'parcial'];

export function RespondClaimForm({ claimId }: { claimId: string }) {
  const t = useTranslations('claims');
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<ClaimOutcome | ''>('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    if (!outcome) return toast.error(t('responseOutcome'));
    if (note.trim().length < 3) return toast.error(t('responseNote'));
    setLoading(true);
    try {
      const res = await respondClaim({ claimId, outcome, note: note.trim() });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('respondedSuccess'));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="space-y-1.5">
        <Label>{t('responseOutcome')}</Label>
        <Select value={outcome} onValueChange={(v) => setOutcome(v as ClaimOutcome)}>
          <SelectTrigger>
            <SelectValue placeholder={t('responseOutcome')} />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((o) => (
              <SelectItem key={o} value={o}>
                {t(`outcomes.${o}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="responseNote">{t('responseNote')}</Label>
        <Textarea
          id="responseNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('responseNotePlaceholder')}
          rows={4}
        />
      </div>
      <Button onClick={handle} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareReply className="h-4 w-4" />}
        {loading ? t('responding') : t('respond')}
      </Button>
    </div>
  );
}

// ── Excluir (autor Zitrón) ──────────────────────────────────────────────────

export function DeleteClaimButton({ claimId }: { claimId: string }) {
  const t = useTranslations('claims');
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      variant="outline"
      triggerLabel={t('delete')}
      onConfirm={async () => {
        const res = await deleteClaim(claimId);
        if (res.error) throw new Error(res.error);
        router.push('/reclamos');
      }}
    />
  );
}
