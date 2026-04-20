/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: '#0b1220',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '2pt solid #0959C8',
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0959C8',
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  docId: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  field: {
    width: '48%',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  fieldLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: '#0b1220',
  },
  description: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#0b1220',
    marginBottom: 8,
  },
  participants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#eff6ff',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 9,
    color: '#0959C8',
  },
  signatureBox: {
    marginTop: 12,
    padding: 14,
    border: '1pt solid #0959C8',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  signatureImg: {
    width: '100%',
    maxHeight: 120,
    marginVertical: 8,
    objectFit: 'contain',
  },
  sigMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 8,
    color: '#6b7280',
    gap: 12,
    marginTop: 4,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1pt dashed #cbd5e1',
  },
  qr: {
    width: 72,
    height: 72,
  },
  verifyText: {
    flex: 1,
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.4,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#0959C8',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
    borderTop: '1pt solid #e2e8f0',
    paddingTop: 6,
  },
});

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
};

function fmt(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ActivityPdf({
  activity,
  signature,
  qrDataUrl,
  signatureImageDataUrl,
  verifyUrl,
  generatedAt,
}: ActivityPdfProps) {
  return (
    <Document
      title={`Soprano · Atividade ${activity.id.slice(0, 8)}`}
      author="Zitrón Brasil"
      subject="Registro de Atividade — Linha 6 Metrô SP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>SOPRANO</Text>
            <Text style={styles.brandSub}>Zitrón Brasil · Linha 6 Laranja</Text>
          </View>
          <View>
            <Text style={styles.docId}>ID: {activity.id}</Text>
            <Text style={styles.docId}>Gerado em {fmt(generatedAt)}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {activity.type_label ?? 'Atividade'} · Status: {activity.status}
        </Text>
        <Text style={styles.title}>{activity.description}</Text>

        <Text style={styles.sectionTitle}>Identificação</Text>
        <View style={styles.grid}>
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

        {activity.participants && activity.participants.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Equipe</Text>
            <View style={styles.participants}>
              {activity.participants.map((p, i) => (
                <Text key={i} style={styles.chip}>
                  {p.name}
                  {p.role ? ` · ${p.role}` : ''}
                </Text>
              ))}
            </View>
          </>
        )}

        {activity.notes && (
          <>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.description}>{activity.notes}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>Assinatura do cliente</Text>
        {signature ? (
          <View style={styles.signatureBox}>
            {signatureImageDataUrl ? (
              <Image src={signatureImageDataUrl} style={styles.signatureImg} />
            ) : (
              <Text style={{ fontSize: 9, color: '#6b7280' }}>
                (Assinatura registrada — visualização em vetor SVG)
              </Text>
            )}
            <Text style={{ fontSize: 10, fontWeight: 700 }}>{signature.signer_name}</Text>
            <View style={styles.sigMeta}>
              <Text>Assinada em {fmt(signature.signed_at)}</Text>
              {signature.ip_address && <Text>IP: {signature.ip_address}</Text>}
            </View>

            <View style={styles.verifyRow}>
              {qrDataUrl && <Image src={qrDataUrl} style={styles.qr} />}
              <View style={styles.verifyText}>
                <Text>Para validar a autenticidade deste documento, escaneie o QR ou visite:</Text>
                <Text style={{ marginTop: 3 }}>{verifyUrl ?? ''}</Text>
                <Text style={{ marginTop: 5 }}>
                  Código de verificação: <Text style={styles.code}>{signature.verification_code}</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 9, color: '#6b7280', fontStyle: 'italic' }}>
            Este documento ainda não possui assinatura registrada.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>Soprano · Registro de atividades — Zitrón Brasil</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
