import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, timeAgo, initials } from '../utils';

describe('formatDate', () => {
  it('formata data em pt-BR', () => {
    const result = formatDate('2025-06-15', 'pt-BR');
    expect(result).toContain('jun');
    expect(result).toContain('2025');
  });

  it('aceita objeto Date', () => {
    // Usa construtor local (ano, mês 0-indexed, dia) para evitar
    // conversão UTC que pode cruzar a virada do dia em UTC-3 (BR)
    const result = formatDate(new Date(2025, 6, 15), 'pt-BR');
    expect(result).toContain('2025');
  });
});

describe('formatDateTime', () => {
  it('inclui hora e minuto', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z', 'pt-BR');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('timeAgo', () => {
  it('retorna "agora mesmo" para menos de 60s', () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(recent)).toBe('agora mesmo');
  });

  it('retorna minutos atrás', () => {
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMin)).toContain('min');
  });

  it('retorna horas atrás', () => {
    const twoHours = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(timeAgo(twoHours)).toBe('2h atrás');
  });

  it('retorna dias atrás', () => {
    const threeDays = new Date(Date.now() - 3 * 86_400 * 1000).toISOString();
    expect(timeAgo(threeDays)).toBe('3 dias atrás');
  });
});

describe('initials', () => {
  it('extrai iniciais de nome composto', () => {
    expect(initials('João Silva')).toBe('JS');
  });

  it('usa só 2 iniciais em nomes longos', () => {
    expect(initials('Ana Maria Souza Lima')).toBe('AM');
  });

  it('maiúsculas', () => {
    expect(initials('pedro oliveira')).toBe('PO');
  });
});
