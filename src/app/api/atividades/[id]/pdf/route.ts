import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { buildActivityHtml } from '@/lib/pdf/activity-html';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Aumenta timeout para dar tempo ao Puppeteer iniciar
export const maxDuration = 60;

async function getBrowser() {
  // Em produção (Vercel / Lambda) usa @sparticuz/chromium
  // Em dev usa Chrome local do sistema
  if (process.env.NODE_ENV === 'production' || process.env.USE_CHROMIUM === '1') {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless as boolean,
    });
  }

  // Dev: usa Chrome do sistema
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
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: activity } = await supabase
    .from('activities')
    .select(`
      *,
      locations(name),
      activity_types(label_pt),
      activity_participants(name, role),
      activity_photos(id, storage_path, caption),
      signatures(*)
    `)
    .eq('id', id)
    .single();

  if (!activity) return new NextResponse('Not found', { status: 404 });
  const act = activity as any;

  // Supervisor e cliente separados (evita ambiguidade FK)
  const [{ data: supervisorProfile }, { data: clientProfile }] = await Promise.all([
    act.supervisor_id
      ? supabase.from('profiles').select('full_name').eq('id', act.supervisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    act.client_id
      ? supabase.from('profiles').select('full_name').eq('id', act.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const signature = act.signatures?.find((s: any) => !s.rejected) ?? null;

  const origin = new URL(request.url).origin;
  const verifyUrl = signature
    ? `${origin}/verify/${signature.verification_code}`
    : undefined;

  const qrDataUrl = verifyUrl
    ? await QRCode.toDataURL(verifyUrl, {
        margin: 1, width: 200,
        color: { dark: '#0959C8', light: '#ffffff' },
      })
    : undefined;

  // Fotos: signed URLs (bucket privado)
  const rawPhotos: { id: string; storage_path: string; caption: string | null }[] =
    (act.activity_photos ?? []).slice(0, 20);

  const photos = (await Promise.all(
    rawPhotos.map(async (p) => {
      const { data } = await supabase.storage
        .from('activity-photos')
        .createSignedUrl(p.storage_path, 600);
      if (!data?.signedUrl) return null;
      return { signedUrl: data.signedUrl, caption: p.caption };
    }),
  )).filter((x): x is { signedUrl: string; caption: string | null } => x !== null);

  // Monta HTML
  const html = buildActivityHtml({
    activity: {
      id: act.id,
      description: act.description,
      notes: act.notes,
      started_at: act.started_at,
      ended_at: act.ended_at,
      status: act.status,
      location_name: act.locations?.name,
      type_label: act.activity_types?.label_pt,
      supervisor_name: (supervisorProfile as any)?.full_name,
      client_name: (clientProfile as any)?.full_name,
      participants: act.activity_participants ?? [],
    },
    signature: signature
      ? {
          signer_name: signature.signer_name,
          signed_at: signature.signed_at,
          verification_code: signature.verification_code,
          ip_address: signature.ip_address,
          svg_data: signature.svg_data,
        }
      : null,
    qrDataUrl,
    verifyUrl,
    generatedAt: new Date().toISOString(),
    photos,
  });

  // Puppeteer → PDF
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '24pt', left: '0' },
    });
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="soprano-${act.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    await browser.close();
  }
}
