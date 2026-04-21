import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { ActivityPdf } from '@/lib/pdf/activity-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Busca supervisor e cliente separadamente para evitar ambiguidade de FK
  const [{ data: supervisorProfile }, { data: clientProfile }] = await Promise.all([
    act.supervisor_id
      ? supabase.from('profiles').select('full_name').eq('id', act.supervisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    act.client_id
      ? supabase.from('profiles').select('full_name').eq('id', act.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  act.supervisor = supervisorProfile;
  act.client = clientProfile;

  const signature = act.signatures?.find((s: any) => !s.rejected) ?? null;

  const origin = new URL(request.url).origin;
  const verifyUrl = signature
    ? `${origin}/verify/${signature.verification_code}`
    : undefined;

  const qrDataUrl = verifyUrl
    ? await QRCode.toDataURL(verifyUrl, {
        margin: 1,
        width: 220,
        color: { dark: '#0959C8', light: '#ffffff' },
      })
    : undefined;

  let signatureImageDataUrl: string | undefined;
  if (signature?.svg_data) {
    const b64 = Buffer.from(signature.svg_data, 'utf8').toString('base64');
    signatureImageDataUrl = `data:image/svg+xml;base64,${b64}`;
  }

  // Fotos: gera signed URLs (bucket privado) — react-pdf busca a imagem via HTTP durante render
  const rawPhotos: { id: string; storage_path: string; caption: string | null }[] =
    (act.activity_photos ?? []).slice(0, 24);

  const photos: { dataUrl: string; caption?: string | null }[] = (
    await Promise.all(
      rawPhotos.map(async (p) => {
        const { data } = await supabase.storage
          .from('activity-photos')
          .createSignedUrl(p.storage_path, 600); // 10 min — suficiente para render
        if (!data?.signedUrl) return null;
        return { dataUrl: data.signedUrl, caption: p.caption };
      }),
    )
  ).filter((x): x is { dataUrl: string; caption: string | null } => x !== null);

  const doc = ActivityPdf({
    activity: {
      id: act.id,
      description: act.description,
      notes: act.notes,
      started_at: act.started_at,
      ended_at: act.ended_at,
      status: act.status,
      location_name: act.locations?.name,
      type_label: act.activity_types?.label_pt,
      supervisor_name: act.supervisor?.full_name,
      client_name: act.client?.full_name,
      participants: act.activity_participants ?? [],
    },
    signature: signature
      ? {
          signer_name: signature.signer_name,
          signed_at: signature.signed_at,
          svg_data: signature.svg_data,
          verification_code: signature.verification_code,
          ip_address: signature.ip_address,
        }
      : null,
    qrDataUrl,
    signatureImageDataUrl,
    verifyUrl,
    generatedAt: new Date().toISOString(),
    photos,
  });

  const stream = await renderToStream(doc as any);

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="soprano-${act.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
