import { CheckCircle2, XCircle, Calendar, MapPin, User } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SopranoMark } from '@/components/brand/logo';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type VerifyResult = {
  signer_name: string;
  signed_at: string;
  verification_code: string;
  rejected: boolean;
  reject_reason: string | null;
  activity: {
    id: string;
    description: string;
    started_at: string;
    status: string;
    location_name: string | null;
    type_label: string | null;
    supervisor_name: string | null;
    client_name: string | null;
  } | null;
} | null;

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const { data } = await supabase.rpc('verify_signature', { p_code: code });
  const signature = (data as VerifyResult) ?? null;

  const loc = locale === 'pt' ? 'pt-BR' : locale;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-xl space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <SopranoMark className="h-10 w-10" />
          <div>
            <p className="text-lg font-semibold">Soprano · Verificação</p>
            <p className="text-xs text-muted-foreground">
              Zitrón Brasil · Linha 6 Laranja — Metrô de São Paulo
            </p>
          </div>
        </div>

        {!signature ? (
          <Card className="border-destructive/40">
            <CardHeader className="flex flex-row items-center gap-3">
              <XCircle className="h-7 w-7 text-destructive" />
              <div>
                <CardTitle>Código inválido</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Não encontramos nenhum registro com o código{' '}
                  <code className="font-mono">{code}</code>.
                </p>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card
              className={
                signature.rejected
                  ? 'border-destructive/40'
                  : 'surface-elevated border-primary/40'
              }
            >
              <CardHeader className="flex flex-row items-start gap-3">
                {signature.rejected ? (
                  <XCircle className="h-7 w-7 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-7 w-7 text-green-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <CardTitle>
                    {signature.rejected
                      ? 'Registro rejeitado pelo cliente'
                      : 'Documento autêntico'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {signature.rejected
                      ? 'O cliente recusou esta atividade. Veja motivo abaixo.'
                      : 'Este código corresponde a uma assinatura registrada no sistema Soprano.'}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <Info label="Assinado por">{signature.signer_name}</Info>
                  <Info label="Data da assinatura">
                    {formatDateTime(signature.signed_at, loc)}
                  </Info>
                  <Info label="Código">
                    <span className="font-mono text-primary">
                      {signature.verification_code}
                    </span>
                  </Info>
                  <Info label="Status">
                    <Badge variant={signature.rejected ? 'destructive' : 'success'}>
                      {signature.rejected ? 'rejeitada' : 'assinada'}
                    </Badge>
                  </Info>
                </div>

                {signature.rejected && signature.reject_reason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="text-xs uppercase tracking-wider text-destructive mb-1">
                      Motivo
                    </p>
                    <p className="whitespace-pre-wrap">{signature.reject_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {signature.activity && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Atividade registrada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="font-medium">{signature.activity.description}</p>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                    <Line icon={<MapPin className="h-3.5 w-3.5" />}>
                      {signature.activity.location_name ?? '—'}
                    </Line>
                    <Line icon={<Calendar className="h-3.5 w-3.5" />}>
                      {formatDateTime(signature.activity.started_at, loc)}
                    </Line>
                    <Line icon={<User className="h-3.5 w-3.5" />}>
                      Supervisor: {signature.activity.supervisor_name ?? '—'}
                    </Line>
                    <Line icon={<User className="h-3.5 w-3.5" />}>
                      Cliente: {signature.activity.client_name ?? '—'}
                    </Line>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 text-center">
          Soprano — Registro digital rastreável
        </p>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </div>
  );
}
