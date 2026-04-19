import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('nav.reports')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exportações e relatórios consolidados das atividades executadas.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReportCard
          title="Relatório mensal"
          description="PDF consolidado com todas as atividades assinadas do mês"
          comingSoon
        />
        <ReportCard
          title="Relatório por local"
          description="Atividades agrupadas por estação, VSE ou SE"
          comingSoon
        />
        <ReportCard
          title="Exportação CSV"
          description="Dados brutos de atividades, participantes e assinaturas"
          comingSoon
        />
        <ReportCard
          title="Certificado de assinatura"
          description="PDF por atividade com assinatura, hash e timestamp"
          comingSoon
        />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" disabled={comingSoon}>
          <Download className="h-4 w-4" />
          {comingSoon ? 'Em breve' : 'Gerar'}
        </Button>
      </CardContent>
    </Card>
  );
}
