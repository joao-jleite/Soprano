// Tipos do banco — este arquivo é gerado automaticamente por `npm run db:types`
// após aplicar as migrations. Enquanto o banco não estiver rodando, este é o contrato inicial.
//
// Tabelas adicionadas manualmente (ainda não migradas para o banco local):
//   daily_reports, daily_report_activities, daily_report_signatures

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'supervisor' | 'cliente';
export type LocationKind = 'estacao' | 'vse' | 'se' | 'escadaria' | 'patio' | 'outro';
export type ActivityStatus = 'rascunho' | 'enviada' | 'rejeitada';
export type DailyReportStatus = 'rascunho' | 'aguardando_assinatura' | 'assinado' | 'cancelado';
export type AuditAction = 'insert' | 'update' | 'delete' | 'soft_delete' | 'restore';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Update: Partial<Omit<Database['public']['Tables']['profiles']['Row'], 'id'>>;
        Relationships: [];
      };
      locations: {
        Row: {
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
        Update: Partial<Omit<Database['public']['Tables']['locations']['Row'], 'id'>>;
        Relationships: [];
      };
      activity_types: {
        Row: {
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
        Update: Partial<Omit<Database['public']['Tables']['activity_types']['Row'], 'id'>>;
        Relationships: [];
      };
      activities: {
        Row: {
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
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
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
          deleted_at?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['activities']['Row'], 'id'>>;
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
        Row: {
          id: string;
          activity_id: string;
          name: string;
          role: string | null;
        };
        Insert: {
          id?: string;
          activity_id: string;
          name: string;
          role?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['activity_participants']['Row'], 'id'>>;
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
        Row: {
          id: string;
          activity_id: string;
          storage_path: string;
          caption: string | null;
          lat: number | null;
          lng: number | null;
          taken_at: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          storage_path: string;
          caption?: string | null;
          lat?: number | null;
          lng?: number | null;
          taken_at?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['activity_photos']['Row'], 'id'>>;
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
        Row: {
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
        Update: Partial<Omit<Database['public']['Tables']['signatures']['Row'], 'id'>>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string | null;
          action: AuditAction;
          actor_id: string | null;
          actor_email: string | null;
          diff: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id?: string | null;
          action: AuditAction;
          actor_id?: string | null;
          actor_email?: string | null;
          diff?: Json | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['audit_log']['Row'], 'id'>>;
        Relationships: [];
      };
      complaints: {
        Row: {
          id: string;
          activity_id: string | null;
          location_id: string | null;
          author_id: string;
          subject: string;
          body: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id?: string | null;
          location_id?: string | null;
          author_id: string;
          subject: string;
          body: string;
          status?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['complaints']['Row'], 'id'>>;
        Relationships: [];
      };
      daily_reports: {
        Row: {
          id: string;
          report_date: string;
          supervisor_id: string;
          client_id: string | null;
          notes: string | null;
          status: DailyReportStatus;
          sent_at: string | null;
          signed_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
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
          deleted_at?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['daily_reports']['Row'], 'id'>>;
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
        Row: {
          id: string;
          daily_report_id: string;
          activity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_report_id: string;
          activity_id: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['daily_report_activities']['Row'], 'id'>>;
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
        Row: {
          id: string;
          daily_report_id: string;
          signer_id: string;
          signer_name: string;
          svg_data: string | null;
          ip_address: string | null;
          user_agent: string | null;
          cancelled: boolean;
          cancel_reason: string | null;
          created_at: string;
        };
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
        Update: Partial<Omit<Database['public']['Tables']['daily_report_signatures']['Row'], 'id'>>;
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
    };
    Views: {
      [_ in never]: never;
    };
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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
