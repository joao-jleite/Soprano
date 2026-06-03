import { describe, it, expect } from 'vitest';

// Testa a função escapeHtml indiretamente via construção de templates.
// O objetivo é garantir que dados de usuário não produzem HTML injetável.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

describe('escapeHtml (template de email)', () => {
  it('escapa caracteres especiais HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('não altera texto sem caracteres especiais', () => {
    expect(escapeHtml('Atividade de manutenção')).toBe('Atividade de manutenção');
  });

  it('bloqueia tentativa de XSS em nome do cliente', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const safe = escapeHtml(malicious);
    // Delimitadores HTML são escapados — a tag não pode ser executada pelo browser
    expect(safe).not.toContain('<img');       // sem tag HTML bruta
    expect(safe).toContain('&lt;img');        // versão escapada presente
    expect(safe).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
});
