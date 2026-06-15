// Tipos do banco — este arquivo é gerado automaticamente por `npm run db:types`
// após aplicar as migrations. Enquanto o banco não estiver rodando, este é o contrato inicial.
//
// Tabelas adicionadas manualmente (ainda não migradas para o banco local):
//   daily_reports, daily_report_activities, daily_report_signatures
//
// IMPORTANTE: os tipos de Update NÃO usam Partial<Omit<Database[...][Row], 'id'>>
// para evitar referência circular que quebra a inferência de generics no TS 5.6+.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'supervisor' | 'cliente';
export type LocationKind = 'estacao' | 'vse' | 'se' | 'escadaria' | 'patio' | 'outro';
export type ActivityStatus = 'rascunho' | 'enviada' | 'rejeitada';
export type DailyReportStatus = 'rascunho' | 'aguardando_assinatura' | 'assinado' | 'cancelado';
export type AuditAction = 'insert' | 'update' | 'delete' | 'soft_delete' | 'restore';
export type ClaimType =
  | 'suspensao_conveniencia'
  | 'suspensao_falta_pagamento'
  | 'falta_acesso_area'
  | 'interferencia_terceiros'
  | 'alteracao_escopo'
  | 'risco_geotecnico_ambiental'
  | 'forca_maior'
  | 'suspensao_poder_concedente';
export type ClaimStatus = 'rascunho' | 'enviado' | 'recebido' | 'em_analise' | 'respondido' | 'encerrado';
export type ClaimOutcome = 'aceito' | 'rejeitado' | 'parcial';

// ── Row types como aliases independentes (sem referência circular) ─────────────

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  phone: string | null;
  company: string | null;
  preferred_locale: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type LocationRow = {
  id: string;
  name: string;
  kind: LocationKind;
  line: string;
  sort_order: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
};

type ActivityTypeRow = {
  id: string;
  slug: string;
  label_pt: string;
  label_en: string;
  label_es: string;
  icon: string | null;
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
};

type ActivityRow = {
  id: string;
  location_id: string;
  activity_type_id: string;
  supervisor_id: string;
  client_id: string | null;
  description: string;
  notes: string | null;
  evolucao: string | null;
  pendencias: string | null;
  continuation_of: string | null;
  status: ActivityStatus;
  started_at: string;
  ended_at: string | null;
  submitted_at: string | null;
  client_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ActivityParticipantRow = {
  id: string;
  activity_id: string;
  name: string;
  role: string | null;
};

type ActivityPhotoRow = {
  id: string;
  activity_id: string;
  storage_path: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  taken_at: string | null;
  uploaded_at: string;
};

type SignatureRow = {
  id: string;
  activity_id: string;
  signer_id: string;
  signer_name: string;
  svg_data: string;
  verification_code: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  rejected: boolean;
  reject_reason: string | null;
};

type AuditLogRow = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  actor_id: string | null;
  actor_email: string | null;
  diff: Json | null;
  created_at: string;
};

type ComplaintRow = {
  id: string;
  activity_id: string | null;
  location_id: string | null;
  author_id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

type DailyReportRow = {
  id: string;
  report_date: string;
  supervisor_id: string;
  client_id: string | null;
  notes: string | null;
  status: DailyReportStatus;
  sent_at: string | null;
  signed_at: string | null;
  cancellation_reason: string | null;
  verification_code: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DailyReportActivityRow = {
  id: string;
  daily_report_id: string;
  activity_id: string;
  created_at: string;
};

type DailyReportSignatureRow = {
  id: string;
  daily_report_id: string;
  signer_id: string;
  signer_name: string;
  svg_data: string | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  cancelled: boolean;
  cancel_reason: string | null;
};

type ClaimRow = {
  id: string;
  ref_code: string | null;
  verification_code: string;
  claim_type: ClaimType;
  title: string;
  description: string;
  event_date: string;
  time_impact_days: number | null;
  cost_impact_amount: number | null;
  currency: string;
  location_id: string | null;
  activity_id: string | null;
  author_id: string | null;
  client_id: string | null;
  status: ClaimStatus;
  notified_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  ack_ip: string | null;
  ack_user_agent: string | null;
  response_at: string | null;
  response_outcome: ClaimOutcome | null;
  response_note: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ClaimAttachmentRow = {
  id: string;
  claim_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

type ClaimTimelineRow = {
  id: string;
  claim_id: string;
  event: string;
  actor_id: string | null;
  actor_name: string | null;
  detail: Json | null;
  created_at: string;
};

// ── Database interface ─────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: Role;
          avatar_url?: string | null;
          phone?: string | null;
          company?: string | null;
          preferred_locale?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<ProfileRow, 'id'>>;
        Relationships: [];
      };
      locations: {
        Row: LocationRow;
        Insert: {
          id?: string;
          name: string;
          kind: LocationKind;
          line?: string;
          sort_order?: number;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<LocationRow, 'id'>>;
        Relationships: [];
      };
      activity_types: {
        Row: ActivityTypeRow;
        Insert: {
          id?: string;
          slug?: string;
          label_pt: string;
          label_en?: string;
          label_es?: string;
          icon?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<ActivityTypeRow, 'id'>>;
        Relationships: [];
      };
      activities: {
        Row: ActivityRow;
        Insert: {
          id?: string;
          location_id: string;
          activity_type_id: string;
          supervisor_id: string;
          client_id?: string | null;
          description: string;
          notes?: string | null;
          evolucao?: string | null;
          pendencias?: string | null;
          continuation_of?: string | null;
          status?: ActivityStatus;
          started_at: string;
          ended_at?: string | null;
          submitted_at?: string | null;
          client_key?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<ActivityRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'activities_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_activity_type_id_fkey';
            columns: ['activity_type_id'];
            isOneToOne: false;
            referencedRelation: 'activity_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_supervisor_id_fkey';
            columns: ['supervisor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_participants: {
        Row: ActivityParticipantRow;
        Insert: {
          id?: string;
          activity_id: string;
          name: string;
          role?: string | null;
        };
        Update: Partial<Omit<ActivityParticipantRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'activity_participants_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_photos: {
        Row: ActivityPhotoRow;
        Insert: {
          id?: string;
          activity_id: string;
          storage_path: string;
          caption?: string | null;
          lat?: number | null;
          lng?: number | null;
          taken_at?: string | null;
        };
        Update: Partial<Omit<ActivityPhotoRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'activity_photos_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      signatures: {
        Row: SignatureRow;
        Insert: {
          id?: string;
          activity_id: string;
          signer_id: string;
          signer_name: string;
          svg_data: string;
          verification_code?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          rejected?: boolean;
          reject_reason?: string | null;
        };
        Update: Partial<Omit<SignatureRow, 'id'>>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: {
          id?: string;
          table_name: string;
          record_id?: string | null;
          action: AuditAction;
          actor_id?: string | null;
          actor_email?: string | null;
          diff?: Json | null;
        };
        Update: Partial<Omit<AuditLogRow, 'id'>>;
        Relationships: [];
      };
      complaints: {
        Row: ComplaintRow;
        Insert: {
          id?: string;
          activity_id?: string | null;
          location_id?: string | null;
          author_id: string;
          subject: string;
          body: string;
          status?: string;
        };
        Update: Partial<Omit<ComplaintRow, 'id'>>;
        Relationships: [];
      };
      daily_reports: {
        Row: DailyReportRow;
        Insert: {
          id?: string;
          report_date: string;
          supervisor_id: string;
          client_id?: string | null;
          notes?: string | null;
          status?: DailyReportStatus;
          sent_at?: string | null;
          signed_at?: string | null;
          cancellation_reason?: string | null;
          verification_code?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<DailyReportRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'daily_reports_supervisor_id_fkey';
            columns: ['supervisor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_reports_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_report_activities: {
        Row: DailyReportActivityRow;
        Insert: {
          id?: string;
          daily_report_id: string;
          activity_id: string;
        };
        Update: Partial<Omit<DailyReportActivityRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'daily_report_activities_daily_report_id_fkey';
            columns: ['daily_report_id'];
            isOneToOne: false;
            referencedRelation: 'daily_reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_report_activities_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_report_signatures: {
        Row: DailyReportSignatureRow;
        Insert: {
          id?: string;
          daily_report_id: string;
          signer_id: string;
          signer_name: string;
          svg_data?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          cancelled?: boolean;
          cancel_reason?: string | null;
        };
        Update: Partial<Omit<DailyReportSignatureRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'daily_report_signatures_daily_report_id_fkey';
            columns: ['daily_report_id'];
            isOneToOne: false;
            referencedRelation: 'daily_reports';
            referencedColumns: ['id'];
          },
        ];
      };
      claims: {
        Row: ClaimRow;
        Insert: {
          id?: string;
          ref_code?: string | null;
          verification_code?: string;
          claim_type: ClaimType;
          title: string;
          description: string;
          event_date: string;
          time_impact_days?: number | null;
          cost_impact_amount?: number | null;
          currency?: string;
          location_id?: string | null;
          activity_id?: string | null;
          author_id?: string | null;
          client_id?: string | null;
          status?: ClaimStatus;
          notified_at?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          ack_ip?: string | null;
          ack_user_agent?: string | null;
          response_at?: string | null;
          response_outcome?: ClaimOutcome | null;
          response_note?: string | null;
          responded_by?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<ClaimRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'claims_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      claim_attachments: {
        Row: ClaimAttachmentRow;
        Insert: {
          id?: string;
          claim_id: string;
          storage_path: string;
          caption?: string | null;
          uploaded_by?: string | null;
        };
        Update: Partial<Omit<ClaimAttachmentRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'claim_attachments_claim_id_fkey';
            columns: ['claim_id'];
            isOneToOne: false;
            referencedRelation: 'claims';
            referencedColumns: ['id'];
          },
        ];
      };
      claim_timeline: {
        Row: ClaimTimelineRow;
        Insert: {
          id?: string;
          claim_id: string;
          event: string;
          actor_id?: string | null;
          actor_name?: string | null;
          detail?: Json | null;
        };
        Update: Partial<Omit<ClaimTimelineRow, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'claim_timeline_claim_id_fkey';
            columns: ['claim_id'];
            isOneToOne: false;
            referencedRelation: 'claims';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    // Views e CompositeTypes usam Record<string, never> para satisfazer
    // GenericSchema do @supabase/supabase-js v2.100+. A sintaxe { [K in never]: never }
    // não tem assinatura de índice e não estende Record<string, T> no TS 5.6+.
    Views: Record<string, never>;
    Functions: {
      verify_signature: {
        Args: {
          p_code: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      role: Role;
      location_kind: LocationKind;
      activity_status: ActivityStatus;
      daily_report_status: DailyReportStatus;
      claim_type: ClaimType;
      claim_status: ClaimStatus;
      claim_outcome: ClaimOutcome;
    };
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
