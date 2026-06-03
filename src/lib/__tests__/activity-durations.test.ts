import { describe, it, expect } from 'vitest';
import { getDefaultDuration, ACTIVITY_DEFAULT_DURATIONS } from '../constants/activity-durations';

describe('getDefaultDuration', () => {
  it('retorna duração para tipo mapeado (case-insensitive)', () => {
    expect(getDefaultDuration('DUTOS VIA 1')).toBe(14);
    expect(getDefaultDuration('dutos via 1')).toBe(14);
    expect(getDefaultDuration('  DUTOS VIA 1  ')).toBe(14);
  });

  it('retorna duração correta para cada tipo conhecido', () => {
    expect(getDefaultDuration('GRELHA DE ENTRADA DE AR PRESSURIZAÇÃO')).toBe(1);
    expect(getDefaultDuration('REGISTRO CORTAFOGO + SOBREPRESSÃO')).toBe(2);
    expect(getDefaultDuration('VENTILADORES AXIAIS + CALDELERIA')).toBe(14);
  });

  it('retorna undefined para tipo desconhecido', () => {
    expect(getDefaultDuration('TIPO INEXISTENTE')).toBeUndefined();
    expect(getDefaultDuration('')).toBeUndefined();
  });

  it('todos os valores do mapa são inteiros positivos', () => {
    for (const [label, days] of Object.entries(ACTIVITY_DEFAULT_DURATIONS)) {
      expect(typeof days).toBe('number');
      expect(days).toBeGreaterThan(0);
      expect(Number.isInteger(days)).toBe(true);
      expect(label.trim()).toBe(label); // sem espaços nas bordas
    }
  });
});
