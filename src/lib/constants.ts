export const APP_NAME = 'Soprano';
export const APP_TAGLINE_PT = 'Registro vivo da obra';
export const APP_TAGLINE_EN = 'The living record of the works';
export const APP_TAGLINE_ES = 'El registro vivo de la obra';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  CLIENT: 'cliente',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const LOCATION_KINDS = {
  STATION: 'estacao',      // Estação
  VSE: 'vse',              // Ventilation Shaft / poço de ventilação
  SE: 'se',                // Saída de emergência
  STAIR: 'escadaria',      // Escadaria
  YARD: 'patio',           // Pátio de manobra
  OTHER: 'outro',
} as const;

export type LocationKind = (typeof LOCATION_KINDS)[keyof typeof LOCATION_KINDS];

export const ACTIVITY_STATUS = {
  DRAFT: 'rascunho',           // Supervisor ainda editando
  SUBMITTED: 'enviada',        // Aguardando assinatura do cliente
  SIGNED: 'assinada',          // Cliente assinou
  REJECTED: 'rejeitada',       // Cliente recusou
} as const;

export type ActivityStatus = (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];

export const LOCALES = ['pt', 'en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';
