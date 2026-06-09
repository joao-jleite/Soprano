/**
 * Logger estruturado para Soprano.
 *
 * Toda linha é JSON de uma linha → indexável no Vercel Log Drain.
 * `debug` só é emitido fora de produção; os demais níveis sempre.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  ctx: string;
  msg: string;
  [key: string]: unknown;
};

function emit(entry: LogEntry) {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case 'error': console.error(output); break;
    case 'warn':  console.warn(output);  break;
    default:      console.log(output);   break;
  }
}

function makeLogger(ctx: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) =>
      process.env.NODE_ENV !== 'production' && emit({ level: 'debug', ctx, msg, ...data }),
    info:  (msg: string, data?: Record<string, unknown>) =>
      emit({ level: 'info',  ctx, msg, ...data }),
    warn:  (msg: string, data?: Record<string, unknown>) =>
      emit({ level: 'warn',  ctx, msg, ...data }),
    error: (msg: string, data?: Record<string, unknown>) =>
      emit({ level: 'error', ctx, msg, ...data }),
  };
}

export const logger = {
  /** Cria um logger com contexto fixo (ex: logger.for('inviteUser')) */
  for: makeLogger,
};
