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

  it('coloca Evolução/Observações/Pendências ANTES das fotos (visibilidade)', () => {
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

    // Os três campos devem aparecer ANTES da seção de fotos (igual à tela de detalhe)
    const fotos = html.indexOf('Registro fotográfico');
    expect(html.indexOf('Evolução')).toBeLessThan(fotos);
    expect(html.indexOf('Observações')).toBeLessThan(fotos);
    expect(html.indexOf('Pendências')).toBeLessThan(fotos);
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

    expect(html).toContain('Evolução:');
    expect(html).toContain('Descida dos atenuadores');
    expect(html).toContain('Pendências:');
    expect(html).toContain('Instalação em andamento');
  });
});
