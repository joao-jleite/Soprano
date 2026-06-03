import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, getUserEmail } from '@/lib/supabase/service';
import { dailyReportSignedEmail } from '@/lib/notify/email';
import { headers } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  svgData: z.string().min(10),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reportId } = await params;
    const body = await req.json();
    const { svgData } = schema.parse(body);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 });
    if ((profile as any).role !== 'cliente') {
      return NextResponse.json({ error: 'Apenas clientes podem assinar' }, { status: 403 });
    }

    const { data: report } = await (supabase as any)
      .from('daily_reports')
      .select('client_id, status, supervisor_id, report_date')
      .eq('id', reportId)
      .single();

    if (!report) return NextResponse.json({ error: 'Resumo não encontrado' }, { status: 404 });
    if (report.client_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para assinar este resumo' }, { status: 403 });
    }
    if (report.status !== 'aguardando_assinatura') {
      return NextResponse.json({ error: 'Resumo não está aguardando assinatura' }, { status: 400 });
    }

    const h = await headers();
    const ua = h.get('user-agent') ?? null;
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? null;

    // Usa service role para garantir que o DELETE bypassa RLS
    const admin = createServiceClient();

    // Remove assinatura anterior via service role (RLS pode bloquear DELETE do cliente)
    if (admin) {
      await (admin as any)
        .from('daily_report_signatures')
        .delete()
        .eq('daily_report_id', reportId);
    }

    if (!admin) {
      return NextResponse.json({ error: 'Configuração de servidor ausente' }, { status: 500 });
    }

    // Insere nova assinatura via service role
    const { error: sigError } = await (admin as any)
      .from('daily_report_signatures')
      .insert({
        daily_report_id: reportId,
        signer_id: user.id,
        signer_name: (profile as any).full_name,
        svg_data: svgData,
        ip_address: ip,
        user_agent: ua,
      });

    if (sigError) {
      return NextResponse.json({ error: sigError.message }, { status: 500 });
    }

    // Atualiza status via service role (bypass RLS)
    if (admin) {
      const now = new Date().toISOString();
      const { error: updError } = await (admin as any)
        .from('daily_reports')
        .update({ status: 'assinado', signed_at: now })
        .eq('id', reportId);

      if (updError) {
        // Tenta só o status sem signed_at (coluna pode não existir)
        const { error: updError2 } = await (admin as any)
          .from('daily_reports')
          .update({ status: 'assinado' })
          .eq('id', reportId);

        if (updError2) {
          return NextResponse.json({ error: updError2.message }, { status: 500 });
        }
      }
    }

    // Email ao supervisor (silencioso)
    try {
      if (report.supervisor_id) {
        const [supEmail, supProfile] = await Promise.all([
          getUserEmail(report.supervisor_id),
          supabase.from('profiles').select('full_name').eq('id', report.supervisor_id).single(),
        ]);
        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
        if (supEmail) {
          await dailyReportSignedEmail({
            supervisorEmail: supEmail,
            supervisorName: (supProfile.data as any)?.full_name ?? 'Supervisor',
            reportDate: report.report_date,
            clientName: (profile as any).full_name,
            reportUrl: `${origin}/pt/resumo-diario/${reportId}`,
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro inesperado';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
