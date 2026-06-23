'use client';

import * as React from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateMyName } from '@/app/actions/profile';

/** Edição self-service do próprio nome nas Configurações. */
export function EditNameForm({ initialName }: { initialName: string }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [saving, setSaving] = React.useState(false);

  const trimmed = name.trim();
  const dirty = trimmed !== initialName.trim() && trimmed.length >= 2;

  async function save() {
    setSaving(true);
    const res = await updateMyName({ fullName: trimmed });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(t('nameSaved'));
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && dirty && !saving) save();
        }}
      />
      <Button onClick={save} disabled={!dirty || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t('save')}
      </Button>
    </div>
  );
}
