/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BLUE   = '#0959C8';
const BLUE_L = '#EFF6FF';
const DARK   = '#0b1220';
const MID    = '#475569';
const LIGHT  = '#94a3b8';
const BORDER = '#e2e8f0';
const BG     = '#f8fafc';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 52,
    fontSize: 10,
    color: DARK,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },

  // ─── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
    borderBottomStyle: 'solid',
  },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1.5 },
  brandSub: { fontSize: 7.5, color: LIGHT, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1.8 },
  docMeta: { fontSize: 7.5, color: LIGHT, textAlign: 'right', lineHeight: 1.6 },

  // ─── Title block ────────────────────────────────────────────────────────────
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BLUE_L,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  statusText: { fontSize: 7, color: BLUE, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4, lineHeight: 1.25 },
  typeLabel: { fontSize: 9, color: MID, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 20 },

  // ─── Section title ───────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 7.5,
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 8,
  },

  // ─── Field grid ──────────────────────────────────────────────────────────────
  grid2: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { flex: 1, padding: 10, backgroundColor: BG, borderRadius: 4, borderWidth: 0.5, borderColor: BORDER, borderStyle: 'solid' },
  fieldLabel: { fontSize: 7, color: LIGHT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
  fieldValue: { fontSize: 10.5, color: DARK, fontFamily: 'Helvetica-Bold' },

  // ─── Description ─────────────────────────────────────────────────────────────
  descBox: { padding: 12, backgroundColor: BG, borderRadius: 4, borderWidth: 0.5, borderColor: BORDER, borderStyle: 'solid' },
  descText: { fontSize: 10.5, color: DARK, lineHeight: 1.6 },

  // ─── Participants ─────────────────────────────────────────────────────────────
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    backgroundColor: BLUE_L,
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  chipName: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold' },
  chipRole: { fontSize: 7.5, color: MID, marginTop: 1 },

  // ─── Signature ───────────────────────────────────────────────────────────────
  sigBox: {
    marginTop: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: BLUE,
    borderStyle: 'solid',
    borderRadius: 4,
    backgroundColor: BG,
  },
  sigName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 },
  sigImg: { width: '100%', height: 90, marginVertical: 8 },
  sigMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, fontSize: 8, color: MID, marginTop: 4 },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'dashed',
  },
  qr: { width: 68, height: 68 },
  verifyText: { flex: 1, fontSize: 8, color: MID, lineHeight: 1.5 },
  code: { fontFamily: 'Courier', fontSize: 9.5, color: BLUE, letterSpacing: 1 },

  // ─── No signature ────────────────────────────────────────────────────────────
  noSig: { fontSize: 9, color: LIGHT, fontStyle: 'italic', marginTop: 4 },

  // ─── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: LIGHT,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 6,
  },

  // ─── Photos ──────────────────────────────────────────────────────────────────
  photoPage: {
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 52,
    fontSize: 10,
    color: DARK,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  photoCell: {
    width: '48.5%',
    borderWidth: 0.5,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  photoImg: { width: '100%', height: 200 },
  photoCaption: { fontSize: 8, color: MID, padding: '5 8', backgroundColor: BG },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
}

function statusColor(status: string): string {
  if (status === 'assinada') return '#16a34a';
  if (status === 'rejeitada') return '#dc2626';
  if (status === 'enviada') return '#d97706';
  return BLUE;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type ActivityPdfProps = {
  activity: {
    id: string;
    description: string;
    notes?: string | null;
    started_at: string;
    ended_at?: string | null;
    status: string;
    location_name?: string;
    type_label?: string;
    supervisor_name?: string;
    client_name?: string;
    participants?: { name: string; role?: string | null }[];
  };
  signature?: {
    signer_name: string;
    signed_at: string;
    svg_data: string;
    verification_code: string;
    ip_address?: string | null;
  } | null;
  qrDataUrl?: string;
  signatureImageDataUrl?: string;
  verifyUrl?: string;
  generatedAt: string;
  photos?: { dataUrl: string; caption?: string | null }[];
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ActivityPdf({
  activity,
  signature,
  qrDataUrl,
  signatureImageDataUrl,
  verifyUrl,
  generatedAt,
  photos = [],
}: ActivityPdfProps) {
  const photoPages: { dataUrl: string; caption?: string | null }[][] = [];
  for (let i = 0; i < photos.length; i += 6) {
    photoPages.push(photos.slice(i, i + 6));
  }

  const badgeColor = statusColor(activity.status);

  return (
    <Document
      title={`Soprano · ${activity.description.slice(0, 60)}`}
      author="Zitrón Brasil"
      subject="Registro de Atividade — Linha 6 Metrô SP"
    >
      {/* ─── Página principal ──────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>SOPRANO</Text>
            <Text style={styles.brandSub}>Zitrón Brasil · Linha 6 Laranja</Text>
          </View>
          <View>
            <Text style={styles.docMeta}>ID: {activity.id}</Text>
            <Text style={styles.docMeta}>Gerado em {fmt(generatedAt)}</Text>
          </View>
        </View>

        {/* Status + título */}
        <View style={[styles.statusBadge, { backgroundColor: badgeColor + '18' }]}>
          <Text style={[styles.statusText, { color: badgeColor }]}>
            {activity.type_label ?? 'Atividade'} · {activity.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>{activity.description}</Text>

        {/* Identificação */}
        <Text style={styles.sectionTitle}>Identificação</Text>
        <View style={styles.grid4}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Local</Text>
            <Text style={styles.fieldValue}>{activity.location_name ?? '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Supervisor</Text>
            <Text style={styles.fieldValue}>{activity.supervisor_name ?? '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Cliente</Text>
            <Text style={styles.fieldValue}>{activity.client_name ?? '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Início</Text>
            <Text style={styles.fieldValue}>{fmt(activity.started_at)}</Text>
          </View>
          {activity.ended_at && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fim</Text>
              <Text style={styles.fieldValue}>{fmt(activity.ended_at)}</Text>
            </View>
          )}
        </View>

        {/* Equipe */}
        {!!activity.participants?.length && (
          <>
            <Text style={styles.sectionTitle}>Equipe em campo</Text>
            <View style={styles.chips}>
              {activity.participants.map((p, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipName}>{p.name}</Text>
                  {p.role ? <Text style={styles.chipRole}>{p.role}</Text> : null}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Observações */}
        {activity.notes && (
          <>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.descBox}>
              <Text style={styles.descText}>{activity.notes}</Text>
            </View>
          </>
        )}

        {/* Assinatura */}
        <Text style={styles.sectionTitle}>Assinatura do cliente</Text>
        {signature ? (
          <View style={styles.sigBox}>
            <Text style={styles.sigName}>{signature.signer_name}</Text>
            {signatureImageDataUrl ? (
              <Image src={signatureImageDataUrl} style={styles.sigImg} />
            ) : null}
            <View style={styles.sigMeta}>
              <Text>Assinado em {fmt(signature.signed_at)}</Text>
              {signature.ip_address ? <Text>IP: {signature.ip_address}</Text> : null}
            </View>
            {(qrDataUrl || verifyUrl) && (
              <View style={styles.verifyRow}>
                {qrDataUrl ? <Image src={qrDataUrl} style={styles.qr} /> : null}
                <View style={styles.verifyText}>
                  <Text>Para verificar a autenticidade deste documento, escaneie o QR ou acesse:</Text>
                  {verifyUrl ? <Text style={{ marginTop: 3, color: BLUE }}>{verifyUrl}</Text> : null}
                  <Text style={{ marginTop: 5 }}>
                    Código:{' '}
                    <Text style={styles.code}>{signature.verification_code}</Text>
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noSig}>
            Este documento ainda não possui assinatura registrada.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>Soprano · Registro de atividades — Zitrón Brasil</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ─── Página(s) de fotos ────────────────────────────────────────── */}
      {photoPages.map((pagePhotos, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.photoPage}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>SOPRANO</Text>
              <Text style={styles.brandSub}>Fotos · {activity.description.slice(0, 50)}</Text>
            </View>
            <View>
              <Text style={styles.docMeta}>ID: {activity.id.slice(0, 8)}</Text>
              <Text style={styles.docMeta}>
                Fotos {pageIdx * 6 + 1}–{Math.min((pageIdx + 1) * 6, photos.length)} de {photos.length}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Registro fotográfico</Text>

          <View style={styles.photoGrid}>
            {pagePhotos.map((ph, i) => (
              <View key={i} style={styles.photoCell} wrap={false}>
                {ph.dataUrl ? (
                  <Image src={ph.dataUrl} style={styles.photoImg} />
                ) : null}
                {ph.caption ? (
                  <Text style={styles.photoCaption}>{ph.caption}</Text>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text>Soprano · Registro de atividades — Zitrón Brasil</Text>
            <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}
