import { setRequestLocale, getTranslations } from 'next-intl/server';
import { MessageSquareWarning, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default async function ReclamosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('nav.complaints')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('complaints.subtitle')}</p>
      </header>

      <Card className="surface-elevated">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center">
            <MessageSquareWarning className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('complaints.inProgressTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {t('complaints.inProgressBody')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>{t('complaints.nextUpdate')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
