import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { buildDailyReportHtml } from '@/lib/pdf/daily-report-html';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ??
  'https://github.com/Sparticuz/chromium/releases/download/v147.0.2/chromium-v147.0.2-pack.tar';

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.USE_CHROMIUM === '1') {
    const chromium = (await import('@sparticuz/chromium-min')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });
  }

  const puppeteer = (await import('puppeteer-core')).default;
  const executablePath =
    process.env.CHROME_PATH ??
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome-stable');

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = (me as any)?.role as string | undefined;

    // Usuário sem profile no banco não deve acessar nada
    if (!role) return new NextResponse('Forbidden', { status: 403 });

    // Busca o resumo
    const { data: report, error: reportError } = await (supabase as any)
      .from('daily_reports')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (reportError) {
      console.error('[pdf] report query error:', reportError);
      return new NextResponse('Not found', { status: 404 });
    }
    if (!report) return new NextResponse('Not found', { status: 404 });

    // Controle de acesso por role
    if (role === 'supervisor' && report.supervisor_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    if (role === 'cliente' && (report.client_id !== user.id || report.status === 'rascunho')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Dados relacionados em paralelo
    const [
      { data: supervisor },
      { data: client },
      { data: reportActivities },
      { data: signature },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', report.supervisor_id).maybeSingle(),
      report.client_id
        ? supabase.from('profiles').select('full_name').eq('id', report.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      (supabase as any)
        .from('daily_report_activities')
        .select('activity_id')
        .eq('daily_report_id', id),
      (supabase as any)
        .from('daily_report_signatures')
        .select('*')
        .eq('daily_report_id', id)
        .maybeSingle(),
    ]);

    const includedIds: string[] = (reportActivities ?? []).map((r: any) => r.activity_id);

    const [{ data: activities }, { data: allPhotos }] = await Promise.all([
      includedIds.length
        ? supabase
            .from('activities')
            .select('id, description, started_at, notes, locations(name, sort_order), activity_types(label_pt), activity_participants(name, role)')
            .in('id', includedIds)
            .order('started_at')
        : Promise.resolve({ data: [] }),
      includedIds.length
        ? (supabase as any)
            .from('activity_photos')
            .select('id, activity_id, storage_path, caption')
            .in('activity_id', includedIds)
            .order('uploaded_at')
        : Promise.resolve({ data: [] }),
    ]);

    // Gera signed URLs e converte para base64 para embutir no PDF
    async function toBase64(url: string): Promise<string | null> {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString('base64');
        const ct = res.headers.get('content-type') ?? 'image/jpeg';
        return `data:${ct};base64,${b64}`;
      } catch { return null; }
    }

    // Limita a 4 fotos por atividade e 40 fotos no total
    const photoCap = 40;
    const countPerActivity: Record<string, number> = {};
    const limitedPhotos = (allPhotos ?? []).filter((ph: any) => {
      countPerActivity[ph.activity_id] = (countPerActivity[ph.activity_id] ?? 0) + 1;
      return countPerActivity[ph.activity_id] <= 4;
    }).slice(0, photoCap);

    const photosWithUrls = await Promise.all(
      limitedPhotos.map(async (ph: any) => {
        const { data: signed } = await supabase.storage
          .from('activity-photos')
          .createSignedUrl(ph.storage_path, 300);
        if (!signed?.signedUrl) return null;
        const dataUrl = await toBase64(signed.signedUrl);
        if (!dataUrl) return null;
        return { activity_id: ph.activity_id, url: dataUrl, caption: ph.caption };
      })
    );

    // Agrupa fotos por activity_id
    const photosByActivity: Record<string, { url: string; caption?: string | null }[]> = {};
    photosWithUrls.forEach(ph => {
      if (ph) (photosByActivity[ph.activity_id] ||= []).push(ph);
    });

    const origin = new URL(request.url).origin;
    const sig = (signature && !signature.cancelled) ? signature : null;

    const verifyUrl = sig?.verification_code
      ? `${origin}/verify/${sig.verification_code}`
      : undefined;

    const qrDataUrl = verifyUrl
      ? await QRCode.toDataURL(verifyUrl, {
          margin: 1, width: 200,
          color: { dark: '#0959C8', light: '#ffffff' },
        })
      : undefined;

    const html = buildDailyReportHtml({
      report: {
        id: report.id,
        report_date: report.report_date,
        notes: report.notes,
        status: report.status,
      },
      supervisorName: (supervisor as any)?.full_name,
      clientName: (client as any)?.full_name,
      activities: (activities ?? []).map((a: any) => ({
        id: a.id,
        description: a.description,
        started_at: a.started_at,
        notes: a.notes,
        location_name: a.locations?.name,
        location_sort_order: a.locations?.sort_order,
        type_label: a.activity_types?.label_pt,
        participants: a.activity_participants ?? [],
        photos: photosByActivity[a.id] ?? [],
      })),
      signature: sig
        ? {
            signer_name: sig.signer_name,
            signed_at: sig.signed_at,
            svg_data: sig.svg_data,
            verification_code: sig.verification_code,
            ip_address: sig.ip_address,
          }
        : null,
      qrDataUrl,
      verifyUrl,
      generatedAt: new Date().toISOString(),
    });

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      // domcontentloaded é suficiente — imagens já vêm como data URIs (sem rede)
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '8mm', left: '0' },
      });
      const dateStr = report.report_date.replace(/-/g, '');
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resumo-diario-${dateStr}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    console.error('[pdf] unhandled error:', err?.message ?? err);
    return new NextResponse(
      JSON.stringify({ error: err?.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
