export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          attendance_end: string
          attendance_start: string
          collection_sheet_url: string | null
          created_at: string
          eod_due_time: string
          face_recognition_required: boolean
          geofence_radius_meters: number
          gps_accuracy_meters: number
          grace_minutes: number
          id: string
          market_video_end: string
          market_video_start: string
          org_email: string | null
          org_name: string
          outside_rates_end: string
          outside_rates_start: string
          primary_color: string
          retention_days: number
          secondary_color: string
          updated_at: string
        }
        Insert: {
          attendance_end?: string
          attendance_start?: string
          collection_sheet_url?: string | null
          created_at?: string
          eod_due_time?: string
          face_recognition_required?: boolean
          geofence_radius_meters?: number
          gps_accuracy_meters?: number
          grace_minutes?: number
          id?: string
          market_video_end?: string
          market_video_start?: string
          org_email?: string | null
          org_name?: string
          outside_rates_end?: string
          outside_rates_start?: string
          primary_color?: string
          retention_days?: number
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          attendance_end?: string
          attendance_start?: string
          collection_sheet_url?: string | null
          created_at?: string
          eod_due_time?: string
          face_recognition_required?: boolean
          geofence_radius_meters?: number
          gps_accuracy_meters?: number
          grace_minutes?: number
          id?: string
          market_video_end?: string
          market_video_start?: string
          org_email?: string | null
          org_name?: string
          outside_rates_end?: string
          outside_rates_start?: string
          primary_color?: string
          retention_days?: number
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          amount: number
          collected_by: string
          created_at: string
          id: string
          market_date: string
          market_id: string
          mode: string
        }
        Insert: {
          amount: number
          collected_by: string
          created_at?: string
          id?: string
          market_date: string
          market_id: string
          mode: string
        }
        Update: {
          amount?: number
          collected_by?: string
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "collections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          day_of_week: number | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          location: string
          name: string
          schedule_json: Json | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location: string
          name: string
          schedule_json?: Json | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          location?: string
          name?: string
          schedule_json?: Json | null
        }
        Relationships: []
      }
      ,
      market_schedule: {
        Row: {
          id: string
          market_id: string
          schedule_date: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          market_id: string
          schedule_date: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          market_id?: string
          schedule_date?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_schedule_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          }
        ]
      }
      media: {
        Row: {
          allowed_end: string
          allowed_start: string
          captured_at: string
          content_type: string
          created_at: string
          file_name: string
          file_url: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          is_late: boolean
          market_date: string | null
          market_id: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          session_id: string
          user_id: string | null
        }
        Insert: {
          allowed_end?: string
          allowed_start?: string
          captured_at?: string
          content_type: string
          created_at?: string
          file_name: string
          file_url: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          market_date?: string | null
          market_id?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          session_id: string
          user_id?: string | null
        }
        Update: {
          allowed_end?: string
          allowed_start?: string
          captured_at?: string
          content_type?: string
          created_at?: string
          file_name?: string
          file_url?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          market_date?: string | null
          market_id?: string | null
          media_type?: Database["public"]["Enums"]["media_type"]
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "media_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      next_day_planning: {
        Row: {
          created_at: string
          current_market_date: string
          id: string
          next_day_market_name: string
          session_id: string | null
          stall_list: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_market_date: string
          id?: string
          next_day_market_name: string
          session_id?: string | null
          stall_list: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_market_date?: string
          id?: string
          next_day_market_name?: string
          session_id?: string | null
          stall_list?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      non_available_commodities: {
        Row: {
          commodity_name: string
          created_at: string
          id: string
          market_date: string
          market_id: string
          notes: string | null
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commodity_name: string
          created_at?: string
          id?: string
          market_date?: string
          market_id: string
          notes?: string | null
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commodity_name?: string
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          notes?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_available_commodities_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "non_available_commodities_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_available_commodities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          category: string
          commodity_name: string
          created_at: string
          id: string
          market_date: string
          market_id: string
          notes: string | null
          price: number | null
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          commodity_name: string
          created_at?: string
          id?: string
          market_date?: string
          market_id: string
          notes?: string | null
          price?: number | null
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          commodity_name?: string
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          notes?: string | null
          price?: number | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "offers_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_feedback: {
        Row: {
          created_at: string
          difficulties: string | null
          feedback: string | null
          id: string
          market_date: string
          market_id: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulties?: string | null
          feedback?: string | null
          id?: string
          market_date?: string
          market_id: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulties?: string | null
          feedback?: string | null
          id?: string
          market_date?: string
          market_id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_summaries: {
        Row: {
          created_at: string
          finalized_at: string
          first_activity_at: string | null
          last_activity_at: string | null
          late_uploads_count: number
          media_count: number
          session_id: string
          stalls_count: number
        }
        Insert: {
          created_at?: string
          finalized_at?: string
          first_activity_at?: string | null
          last_activity_at?: string | null
          late_uploads_count?: number
          media_count?: number
          session_id: string
          stalls_count?: number
        }
        Update: {
          created_at?: string
          finalized_at?: string
          first_activity_at?: string | null
          last_activity_at?: string | null
          late_uploads_count?: number
          media_count?: number
          session_id?: string
          stalls_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          finalized_at: string | null
          id: string
          market_date: string | null
          market_id: string
          punch_in_time: string | null
          punch_out_time: string | null
          session_date: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finalized_at?: string | null
          id?: string
          market_date?: string | null
          market_id: string
          punch_in_time?: string | null
          punch_out_time?: string | null
          session_date: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finalized_at?: string | null
          id?: string
          market_date?: string | null
          market_id?: string
          punch_in_time?: string | null
          punch_out_time?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "sessions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit: {
        Row: {
          changed_at: string
          changed_by: string
          changes: Json
          id: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changes: Json
          id?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changes?: Json
          id?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      stall_confirmations: {
        Row: {
          created_at: string
          created_by: string
          farmer_name: string
          id: string
          market_date: string
          market_id: string
          stall_name: string
          stall_no: string
        }
        Insert: {
          created_at?: string
          created_by: string
          farmer_name: string
          id?: string
          market_date: string
          market_id: string
          stall_name: string
          stall_no: string
        }
        Update: {
          created_at?: string
          created_by?: string
          farmer_name?: string
          id?: string
          market_date?: string
          market_id?: string
          stall_name?: string
          stall_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_confirmations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "stall_confirmations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_inspections: {
        Row: {
          created_at: string
          farmer_name: string
          has_apron: boolean
          has_cap: boolean
          has_digital_weighing_machine: boolean
          has_display: boolean
          has_flex: boolean
          has_green_net: boolean
          has_light: boolean
          has_mat: boolean
          has_rateboard: boolean
          has_table: boolean
          has_tent: boolean
          id: string
          market_date: string
          market_id: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          has_apron?: boolean
          has_cap?: boolean
          has_digital_weighing_machine?: boolean
          has_display?: boolean
          has_flex?: boolean
          has_green_net?: boolean
          has_light?: boolean
          has_mat?: boolean
          has_rateboard?: boolean
          has_table?: boolean
          has_tent?: boolean
          id?: string
          market_date?: string
          market_id: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          has_apron?: boolean
          has_cap?: boolean
          has_digital_weighing_machine?: boolean
          has_display?: boolean
          has_flex?: boolean
          has_green_net?: boolean
          has_light?: boolean
          has_mat?: boolean
          has_rateboard?: boolean
          has_table?: boolean
          has_tent?: boolean
          id?: string
          market_date?: string
          market_id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stalls: {
        Row: {
          created_at: string
          farmer_name: string
          id: string
          session_id: string
          stall_name: string
          stall_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          id?: string
          session_id: string
          stall_name: string
          stall_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          id?: string
          session_id?: string
          stall_name?: string
          stall_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stalls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          created_at: string
          file_url: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          is_late: boolean
          payload: Json | null
          session_id: string
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          payload?: Json | null
          session_id: string
          task_type: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          created_at?: string
          file_url?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          payload?: Json | null
          session_id?: string
          task_type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "task_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status: {
        Row: {
          id: string
          latest_event_id: string | null
          session_id: string
          status: Database["public"]["Enums"]["task_status_enum"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          id?: string
          latest_event_id?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["task_status_enum"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          id?: string
          latest_event_id?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["task_status_enum"]
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_status_latest_event_id_fkey"
            columns: ["latest_event_id"]
            isOneToOne: false
            referencedRelation: "task_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_markets_today: {
        Row: {
          active_employees: number | null
          active_sessions: number | null
          city: string | null
          last_punch_in: string | null
          last_upload_time: string | null
          market_id: string | null
          market_name: string | null
          media_uploads_count: number | null
          stall_confirmations_count: number | null
          today_ist: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_media_metadata: { Args: never; Returns: undefined }
      get_or_create_session: {
        Args: { p_date: string; p_market: string; p_user: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      media_type:
        | "outside_rates"
        | "selfie_gps"
        | "rate_board"
        | "market_video"
        | "cleaning_video"
        | "customer_feedback"
      session_status: "active" | "finalized" | "locked" | "completed"
      task_status_enum: "pending" | "in_progress" | "submitted" | "locked"
      task_type:
        | "punch"
        | "stall_confirm"
        | "outside_rates"
        | "selfie_gps"
        | "rate_board"
        | "market_video"
        | "cleaning_video"
        | "collection"
      user_role: "employee" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      media_type: [
        "outside_rates",
        "selfie_gps",
        "rate_board",
        "market_video",
        "cleaning_video",
        "customer_feedback",
      ],
      session_status: ["active", "finalized", "locked", "completed"],
      task_status_enum: ["pending", "in_progress", "submitted", "locked"],
      task_type: [
        "punch",
        "stall_confirm",
        "outside_rates",
        "selfie_gps",
        "rate_board",
        "market_video",
        "cleaning_video",
        "collection",
      ],
      user_role: ["employee", "admin"],
    },
  },
} as const
