import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('emite JSON estruturado com ctx e msg', () => {
    const log = logger.for('test-ctx');
    log.info('mensagem de teste', { userId: 'abc' });

    expect(console.log).toHaveBeenCalledOnce();
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe('info');
    expect(parsed.ctx).toBe('test-ctx');
    expect(parsed.msg).toBe('mensagem de teste');
    expect(parsed.userId).toBe('abc');
  });

  it('usa console.warn para warn', () => {
    const log = logger.for('ctx');
    log.warn('aviso');
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('usa console.error para error', () => {
    const log = logger.for('ctx');
    log.error('erro grave', { code: 500 });
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('cria loggers independentes por contexto', () => {
    const log1 = logger.for('ctx-1');
    const log2 = logger.for('ctx-2');
    log1.info('a');
    log2.info('b');
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.parse(calls[0][0]).ctx).toBe('ctx-1');
    expect(JSON.parse(calls[1][0]).ctx).toBe('ctx-2');
  });
});
