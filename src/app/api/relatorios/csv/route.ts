import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthAndRole } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';

const log = logger.for('csv-export');

export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const supabase = await createClient();

  try {
    await requireAuthAndRole(supabase, 'admin', 'supervisor');
  } catch {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 90)));
  const sinceISO = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      id, status, description, started_at, ended_at, submitted_at,
      locations(name),
      activity_types(label_pt),
      supervisor:profiles!activities_supervisor_id_fkey(full_name),
      client:profiles!activities_client_id_fkey(full_name)
      `,
    )
    .is('deleted_at', null)
    .gte('started_at', sinceISO)
    .order('started_at', { ascending: false })
    .limit(5000);

  if (error) {
    log.error('Erro ao buscar atividades para CSV', { error: error.message });
    return new NextResponse(`Erro: ${error.message}`, { status: 500 });
  }

  // Busca dados de assinatura via daily_reports para cada atividade
  const activityIds = (data ?? []).map((r: any) => r.id);
  const signatureMap: Record<string, { signed_at: string | null; signer_name: string; verification_code: string }> = {};

  if (activityIds.length > 0) {
    const { data: draData } = await supabase
      .from('daily_report_activities')
      .select(`
        activity_id,
        daily_reports(id, status, signed_at, daily_report_signatures(signer_name))
      `)
      .in('activity_id', activityIds);

    for (const dra of (draData ?? []) as any[]) {
      const report = dra.daily_reports;
      if (report?.status === 'assinado') {
        const sig = Array.isArray(report.daily_report_signatures)
          ? report.daily_report_signatures[0]
          : report.daily_report_signatures;
        signatureMap[dra.activity_id] = {
          signed_at: report.signed_at ?? null,
          signer_name: sig?.signer_name ?? '',
          verification_code: report.id,
        };
      }
    }
  }

  const header = [
    'id',
    'status',
    'descricao',
    'local',
    'tipo',
    'supervisor',
    'cliente',
    'iniciada_em',
    'encerrada_em',
    'enviada_em',
    'assinada_em',
    'assinante',
    'codigo_verificacao',
  ];
  const lines: string[] = [header.join(',')];

  for (const row of (data ?? []) as any[]) {
    const sig = signatureMap[row.id];
    lines.push(
      [
        row.id,
        row.status,
        row.description,
        row.locations?.name,
        row.activity_types?.label_pt,
        row.supervisor?.full_name,
        row.client?.full_name,
        row.started_at,
        row.ended_at,
        row.submitted_at,
        sig?.signed_at,
        sig?.signer_name,
        sig?.verification_code,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  // BOM for Excel UTF-8 compatibility
  const body = '﻿' + lines.join('\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="soprano-atividades-${days}d-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
