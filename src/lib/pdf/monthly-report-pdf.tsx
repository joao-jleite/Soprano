/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    color: '#0b1220',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '2pt solid #1095D6',
  },
  brand: { fontSize: 18, fontWeight: 700, color: '#1095D6', letterSpacing: 1 },
  brandSub: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  docId: { fontSize: 8, color: '#6b7280', textAlign: 'right' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  kpi: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  kpiValue: { fontSize: 16, fontWeight: 700, color: '#0b1220' },
  kpiAccent: { color: '#1095D6' },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: '1pt solid #cbd5e1',
  },
  tableHeaderCell: {
    fontSize: 7,
    color: '#1095D6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '0.5pt solid #e2e8f0',
  },
  cell: { fontSize: 8, color: '#0b1220' },
  cellMuted: { fontSize: 8, color: '#6b7280' },
  // Column widths
  colDate: { width: '14%' },
  colLocation: { width: '22%' },
  colType: { width: '16%' },
  colSupervisor: { width: '20%' },
  colClient: { width: '20%' },
  colStatus: { width: '8%' },

  statusPill: {
    fontSize: 7,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
    textAlign: 'center',
  },
  statusSigned: { backgroundColor: '#dcfce7', color: '#166534' },
  statusSent: { backgroundColor: '#fef3c7', color: '#92400e' },
  statusRejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
  statusDraft: { backgroundColor: '#f1f5f9', color: '#475569' },

  locTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
    color: '#1095D6',
  },
  locCount: { fontSize: 8, color: '#6b7280' },

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

export type MonthlyActivity = {
  id: string;
  description: string;
  started_at: string;
  status: string;
  location_name?: string | null;
  type_label?: string | null;
  supervisor_name?: string | null;
  client_name?: string | null;
  signed_at?: string | null;
};

export type MonthlyReportPdfProps = {
  period: { year: number; month: number }; // month 1-12
  activities: MonthlyActivity[];
  generatedAt: string;
  periodLabel: string;
};

const TZ = 'America/Sao_Paulo'; // servidor Vercel roda em UTC

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: TZ,
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ });
  } catch {
    return iso;
  }
}

function statusStyle(status: string) {
  if (status === 'assinada') return styles.statusSigned;
  if (status === 'enviada') return styles.statusSent;
  if (status === 'rejeitada') return styles.statusRejected;
  return styles.statusDraft;
}

function truncate(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function MonthlyReportPdf({
  activities,
  generatedAt,
  periodLabel,
}: MonthlyReportPdfProps) {
  const total = activities.length;
  const signed = activities.filter((a) => a.status === 'assinada').length;
  const pending = activities.filter((a) => a.status === 'enviada').length;
  const rejected = activities.filter((a) => a.status === 'rejeitada').length;

  // agrupa por local
  const byLocation = new Map<string, MonthlyActivity[]>();
  for (const a of activities) {
    const key = a.location_name ?? '—';
    const arr = byLocation.get(key) ?? [];
    arr.push(a);
    byLocation.set(key, arr);
  }
  const locationGroups = Array.from(byLocation.entries()).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <Document
      title={`Soprano · Relatório mensal ${periodLabel}`}
      author="Zitrón Brasil"
      subject="Relatório consolidado mensal — Linha 6 Metrô SP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>SOPRANO</Text>
            <Text style={styles.brandSub}>Zitrón Brasil · Linha 6 Laranja</Text>
          </View>
          <View>
            <Text style={styles.docId}>Relatório mensal</Text>
            <Text style={styles.docId}>Gerado em {fmtDateTime(generatedAt)}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>Consolidado de atividades</Text>
        <Text style={styles.title}>{periodLabel}</Text>

        <Text style={styles.sectionTitle}>Indicadores</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total de atividades</Text>
            <Text style={[styles.kpiValue, styles.kpiAccent]}>{total}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Assinadas</Text>
            <Text style={styles.kpiValue}>{signed}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Pendentes</Text>
            <Text style={styles.kpiValue}>{pending}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Rejeitadas</Text>
            <Text style={styles.kpiValue}>{rejected}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Todas as atividades do mês</Text>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderCell, styles.colDate]}>Início</Text>
          <Text style={[styles.tableHeaderCell, styles.colLocation]}>Local</Text>
          <Text style={[styles.tableHeaderCell, styles.colType]}>Tipo</Text>
          <Text style={[styles.tableHeaderCell, styles.colSupervisor]}>Supervisor</Text>
          <Text style={[styles.tableHeaderCell, styles.colClient]}>Cliente</Text>
          <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
        </View>

        {activities.map((a) => (
          <View key={a.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, styles.colDate]}>{fmtDate(a.started_at)}</Text>
            <Text style={[styles.cell, styles.colLocation]}>
              {truncate(a.location_name ?? '—', 28)}
            </Text>
            <Text style={[styles.cellMuted, styles.colType]}>
              {truncate(a.type_label ?? '—', 20)}
            </Text>
            <Text style={[styles.cell, styles.colSupervisor]}>
              {truncate(a.supervisor_name ?? '—', 24)}
            </Text>
            <Text style={[styles.cell, styles.colClient]}>
              {truncate(a.client_name ?? '—', 24)}
            </Text>
            <Text style={[styles.statusPill, statusStyle(a.status), styles.colStatus]}>
              {a.status === 'assinada'
                ? 'ASS'
                : a.status === 'enviada'
                  ? 'ENV'
                  : a.status === 'rejeitada'
                    ? 'REJ'
                    : 'RAS'}
            </Text>
          </View>
        ))}

        {activities.length === 0 && (
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 10, fontStyle: 'italic' }}>
            Nenhuma atividade registrada neste período.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>Soprano · Relatório consolidado — Zitrón Brasil</Text>
          <Text
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {locationGroups.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>SOPRANO</Text>
              <Text style={styles.brandSub}>Agrupamento por local · {periodLabel}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Atividades por local</Text>

          {locationGroups.map(([loc, items]) => (
            <View key={loc} wrap={false} style={{ marginBottom: 8 }}>
              <Text style={styles.locTitle}>{loc}</Text>
              <Text style={styles.locCount}>
                {items.length} atividade(s) · {items.filter((i) => i.status === 'assinada').length}{' '}
                assinada(s)
              </Text>
              {items.map((a) => (
                <View key={a.id} style={styles.row}>
                  <Text style={[styles.cell, styles.colDate]}>{fmtDate(a.started_at)}</Text>
                  <Text style={[styles.cell, { width: '60%' }]}>
                    {truncate(a.description, 70)}
                  </Text>
                  <Text
                    style={[styles.statusPill, statusStyle(a.status), { width: '12%' }]}
                  >
                    {a.status.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.footer} fixed>
            <Text>Soprano · Relatório consolidado — Zitrón Brasil</Text>
            <Text
              render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
