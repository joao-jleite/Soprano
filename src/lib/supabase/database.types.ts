// Tipos do banco — este arquivo é gerado automaticamente por `npm run db:types`
// após aplicar as migrations. Enquanto o banco não estiver rodando, este é o contrato inicial.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'supervisor' | 'cliente';
export type LocationKind = 'estacao' | 'vse' | 'se' | 'escadaria' | 'patio' | 'outro';
export type ActivityStatus = 'rascunho' | 'enviada' | 'assinada' | 'rejeitada';

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
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role: Role;
          avatar_url?: string | null;
          phone?: string | null;
          company?: string | null;
          preferred_locale?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
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
        };
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
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
        };
        Insert: {
          id?: string;
          slug: string;
          label_pt: string;
          label_en: string;
          label_es: string;
          icon?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activity_types']['Insert']>;
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
          status: ActivityStatus;
          started_at: string;
          ended_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          activity_type_id: string;
          supervisor_id: string;
          client_id?: string | null;
          description: string;
          notes?: string | null;
          status?: ActivityStatus;
          started_at: string;
          ended_at?: string | null;
          submitted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      activity_participants: {
        Row: {
          activity_id: string;
          name: string;
          role: string | null;
        };
        Insert: {
          activity_id: string;
          name: string;
          role?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activity_participants']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['activity_photos']['Insert']>;
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
        Update: Partial<Database['public']['Tables']['signatures']['Insert']>;
      };
      complaints: {
        // Estrutura inicial — será refinada quando o usuário alinhar com a equipe.
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
        Update: Partial<Database['public']['Tables']['complaints']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
      location_kind: LocationKind;
      activity_status: ActivityStatus;
    };
  };
}
