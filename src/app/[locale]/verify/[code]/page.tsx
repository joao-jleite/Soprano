import { CheckCircle2, XCircle, Calendar, MapPin, User, ShieldCheck, ShieldX } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { SopranoMark } from '@/components/brand/logo';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  const valid = !!signature && !signature.rejected;
  const rejected = !!signature && signature.rejected;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <SopranoMark className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold leading-tight">Soprano · Verificação de Documento</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Zitrón Brasil · Linha 6 Laranja — Metrô de São Paulo
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-5">

          {/* Status card */}
          <div
            className={cn(
              'rounded-2xl border p-6 space-y-4',
              valid
                ? 'border-green-500/30 bg-green-500/5'
                : rejected
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-border bg-card',
            )}
          >
            {/* Icon + título */}
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center shrink-0',
                  valid
                    ? 'bg-green-500/15'
                    : rejected
                    ? 'bg-destructive/15'
                    : 'bg-muted',
                )}
              >
                {valid ? (
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                ) : rejected ? (
                  <ShieldX className="h-6 w-6 text-destructive" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {valid
                    ? 'Documento autêntico'
                    : rejected
                    ? 'Atividade recusada pelo cliente'
                    : 'Código não encontrado'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {valid
                    ? 'Esta assinatura é válida e foi registrada no sistema Soprano.'
                    : rejected
                    ? 'O cliente recusou a confirmação desta atividade.'
                    : `Não existe nenhum registro com o código "${code}".`}
                </p>
              </div>
            </div>

            {/* Dados da assinatura */}
            {signature && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                <DataCell label="Assinado por" value={signature.signer_name} />
                <DataCell
                  label="Data da assinatura"
                  value={formatDateTime(signature.signed_at, loc)}
                />
                <DataCell
                  label="Código de verificação"
                  value={<span className="font-mono text-primary">{signature.verification_code}</span>}
                />
              </div>
            )}

            {/* Motivo da recusa */}
            {rejected && signature?.reject_reason && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-destructive mb-1 font-medium">
                  Motivo da recusa
                </p>
                <p className="text-sm whitespace-pre-wrap">{signature.reject_reason}</p>
              </div>
            )}
          </div>

          {/* Detalhes da atividade */}
          {signature?.activity && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="px-6 py-4 border-b border-border/50">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Atividade registrada
                </h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-base font-medium">{signature.activity.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label="Local">
                    {signature.activity.location_name ?? '—'}
                  </MetaRow>
                  <MetaRow icon={<Calendar className="h-3.5 w-3.5" />} label="Data">
                    {formatDate(signature.activity.started_at, loc)}
                  </MetaRow>
                  <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Supervisor">
                    {signature.activity.supervisor_name ?? '—'}
                  </MetaRow>
                  <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Cliente">
                    {signature.activity.client_name ?? '—'}
                  </MetaRow>
                </div>

                {signature.activity.type_label && (
                  <p className="text-xs text-muted-foreground">
                    Tipo de atividade: <span className="font-medium text-foreground">{signature.activity.type_label}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 pt-2">
            Soprano — Registro digital rastreável · Zitrón Brasil
          </p>
        </div>
      </main>
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
