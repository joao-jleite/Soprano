import { describe, it, expect } from 'vitest';
import { buildActivityHtml } from '../activity-html';
import { buildDailyReportHtml } from '../daily-report-html';

describe('PDF de atividade — campos de evolução/pendências', () => {
  it('renderiza Evolução, Observações e Pendências quando preenchidos', () => {
    const html = buildActivityHtml({
      activity: {
        id: '9e56e2e9-0000-0000-0000-000000000000',
        description: 'VSE PHILLIPINI: Movimentação dos atenuadores',
        evolucao: 'Evolução:\n•Descida dos atenuadores',
        notes: 'Trabalho paralisado devido à presença da equipe civil.',
        pendencias: 'Instalação dos atenuadores em andamento.',
        started_at: '2026-06-22T12:00:00Z',
        status: 'rascunho',
      },
      generatedAt: '2026-06-23T12:00:00Z',
    });

    expect(html).toContain('Evolução');
    expect(html).toContain('Descida dos atenuadores');
    expect(html).toContain('Pendências');
    expect(html).toContain('Instalação dos atenuadores em andamento.');
    expect(html).toContain('Observações');
  });

  it('ordena as seções conforme o template folha técnica (fotos → evolução → … → assinatura)', () => {
    const html = buildActivityHtml({
      activity: {
        id: '9e56e2e9-0000-0000-0000-000000000000',
        description: 'VSE PHILLIPINI',
        evolucao: 'Descida dos atenuadores',
        notes: 'Trabalho paralisado',
        pendencias: 'Instalação em andamento',
        started_at: '2026-06-22T12:00:00Z',
        status: 'rascunho',
      },
      generatedAt: '2026-06-23T12:00:00Z',
      photos: [{ signedUrl: 'data:image/jpeg;base64,AAAA', caption: 'Foto 1' }],
    });

    // Ordem do template de folha técnica:
    //   Registro fotográfico → Evolução → Observações → Pendências → Assinatura.
    // Os três campos de progresso continuam sempre presentes, agora entre as
    // fotos e o quadro de assinatura.
    const fotos = html.indexOf('Registro fotográfico');
    const assinatura = html.indexOf('Assinatura do cliente');
    for (const campo of ['Evolução', 'Observações', 'Pendências']) {
      expect(html.indexOf(campo), campo).toBeGreaterThan(fotos);
      expect(html.indexOf(campo), campo).toBeLessThan(assinatura);
    }
  });
});

describe('PDF de resumo diário — campos de evolução/pendências', () => {
  it('renderiza Evolução e Pendências por atividade', () => {
    const html = buildDailyReportHtml({
      report: { id: 'r1', report_date: '2026-06-22', status: 'rascunho' },
      activities: [
        {
          id: 'a1',
          description: 'Montagem atenuador',
          started_at: '2026-06-22T12:00:00Z',
          evolucao: 'Descida dos atenuadores',
          notes: 'Trabalho paralisado',
          pendencias: 'Instalação em andamento',
        },
      ],
      generatedAt: '2026-06-23T12:00:00Z',
    });

    expect(html).toContain('Evolução');
    expect(html).toContain('Descida dos atenuadores');
    expect(html).toContain('Pendências');
    expect(html).toContain('Instalação em andamento');
  });
});
