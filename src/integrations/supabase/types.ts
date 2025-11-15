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
      asset_inventory: {
        Row: {
          asset_name: string
          available_quantity: number
          created_at: string
          description: string | null
          id: string
          issued_quantity: number
          total_quantity: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          asset_name: string
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          issued_quantity?: number
          total_quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          asset_name?: string
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          issued_quantity?: number
          total_quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_payments: {
        Row: {
          amount_received: number
          asset_id: string
          created_at: string
          id: string
          payment_date: string
          payment_mode: string
          payment_proof_url: string | null
          request_id: string
          requester_id: string
          updated_at: string
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_received: number
          asset_id: string
          created_at?: string
          id?: string
          payment_date: string
          payment_mode: string
          payment_proof_url?: string | null
          request_id: string
          requester_id: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_received?: number
          asset_id?: string
          created_at?: string
          id?: string
          payment_date?: string
          payment_mode?: string
          payment_proof_url?: string | null
          request_id?: string
          requester_id?: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "asset_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_requests: {
        Row: {
          actual_return_date: string | null
          approval_date: string | null
          approved_by: string | null
          asset_id: string
          created_at: string
          expected_return_date: string | null
          id: string
          market_id: string | null
          purpose: string
          quantity: number
          rejection_reason: string | null
          remarks: string | null
          request_date: string
          requester_id: string
          requester_role: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          market_id?: string | null
          purpose: string
          quantity: number
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          requester_id: string
          requester_role: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          market_id?: string | null
          purpose?: string
          quantity?: number
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          requester_id?: string
          requester_role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "asset_requests_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets_money_recovery: {
        Row: {
          created_at: string
          farmer_name: string
          id: string
          item_name: string
          pending_amount: number
          received_amount: number
          session_id: string
          stall_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          id?: string
          item_name: string
          pending_amount?: number
          received_amount?: number
          session_id: string
          stall_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          id?: string
          item_name?: string
          pending_amount?: number
          received_amount?: number
          session_id?: string
          stall_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_money_recovery_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assets_usage: {
        Row: {
          asset_name: string
          created_at: string
          employee_name: string
          id: string
          market_id: string
          quantity: number
          return_date: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          asset_name: string
          created_at?: string
          employee_name: string
          id?: string
          market_id: string
          quantity?: number
          return_date?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          asset_name?: string
          created_at?: string
          employee_name?: string
          id?: string
          market_id?: string
          quantity?: number
          return_date?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_usage_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "assets_usage_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          city: string | null
          completed_tasks: number
          created_at: string
          id: string
          market_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["attendance_status"]
          total_tasks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date: string
          city?: string | null
          completed_tasks?: number
          created_at?: string
          id?: string
          market_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["attendance_status"]
          total_tasks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          city?: string | null
          completed_tasks?: number
          created_at?: string
          id?: string
          market_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["attendance_status"]
          total_tasks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "attendance_records_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rules: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          role: Database["public"]["Enums"]["user_role"]
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          role: Database["public"]["Enums"]["user_role"]
          task_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bdo_market_submissions: {
        Row: {
          address: string
          city: string | null
          contact_email: string | null
          contact_person_name: string
          contact_phone: string
          created_at: string
          id: string
          location: string
          name: string
          opening_date: string
          photo_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          contact_email?: string | null
          contact_person_name: string
          contact_phone: string
          created_at?: string
          id?: string
          location: string
          name: string
          opening_date: string
          photo_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          contact_email?: string | null
          contact_person_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          opening_date?: string
          photo_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      bdo_stall_submissions: {
        Row: {
          address: string
          contact_number: string
          created_at: string
          date_of_starting_markets: string
          farmer_name: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stall_name: string
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_number: string
          created_at?: string
          date_of_starting_markets: string
          farmer_name: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name: string
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_number?: string
          created_at?: string
          date_of_starting_markets?: string
          farmer_name?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      bms_stall_feedbacks: {
        Row: {
          created_at: string
          customer_name: string | null
          feedback_text: string | null
          id: string
          market_id: string | null
          rating: number | null
          session_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          market_id?: string | null
          rating?: number | null
          session_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          market_id?: string | null
          rating?: number | null
          session_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bms_stall_feedbacks_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "bms_stall_feedbacks_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bms_stall_feedbacks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      employee_allocations: {
        Row: {
          created_at: string
          employee_name: string
          id: string
          market_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_name: string
          id?: string
          market_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_name?: string
          id?: string
          market_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_allocations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "employee_allocations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_allocations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          leave_date: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_date: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_date?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          username?: string | null
        }
        Relationships: []
      }
      farmers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_inspection_updates: {
        Row: {
          created_at: string
          id: string
          market_id: string
          session_id: string
          update_notes: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          session_id: string
          update_notes: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          session_id?: string
          update_notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_inspection_updates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "market_inspection_updates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_inspection_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_land_search: {
        Row: {
          address: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          is_finalized: boolean
          opening_date: string | null
          place_name: string
          session_id: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_finalized?: boolean
          opening_date?: string | null
          place_name: string
          session_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_finalized?: boolean
          opening_date?: string | null
          place_name?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_land_search_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_punchin: {
        Row: {
          created_at: string
          gps_lat: number
          gps_lng: number
          id: string
          punched_at: string
          selfie_url: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gps_lat: number
          gps_lng: number
          id?: string
          punched_at?: string
          selfie_url: string
          session_id: string
        }
        Update: {
          created_at?: string
          gps_lat?: number
          gps_lng?: number
          id?: string
          punched_at?: string
          selfie_url?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_manager_punchin_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_punchout: {
        Row: {
          created_at: string
          gps_lat: number
          gps_lng: number
          id: string
          punched_at: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gps_lat: number
          gps_lng: number
          id?: string
          punched_at?: string
          session_id: string
        }
        Update: {
          created_at?: string
          gps_lat?: number
          gps_lng?: number
          id?: string
          punched_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_manager_punchout_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_sessions: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          session_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          session_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          session_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          market_id: string
          schedule_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          market_id: string
          schedule_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          market_id?: string
          schedule_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_schedule_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "market_schedule_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          read_at: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          target_user_id?: string | null
          title?: string
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
        Relationships: [
          {
            foreignKeyName: "organiser_feedback_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "organiser_feedback_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
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
          rent_amount: number | null
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
          rent_amount?: number | null
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
          rent_amount?: number | null
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
        Relationships: [
          {
            foreignKeyName: "stall_inspections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "live_markets_today"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "stall_inspections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_searching_updates: {
        Row: {
          contact_phone: string
          created_at: string
          farmer_name: string
          id: string
          is_interested: boolean
          joining_date: string | null
          session_id: string
          stall_name: string
          updated_at: string
        }
        Insert: {
          contact_phone: string
          created_at?: string
          farmer_name: string
          id?: string
          is_interested?: boolean
          joining_date?: string | null
          session_id: string
          stall_name: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string
          created_at?: string
          farmer_name?: string
          id?: string
          is_interested?: boolean
          joining_date?: string | null
          session_id?: string
          stall_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_searching_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_attendance: {
        Args: {
          p_date: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      expire_old_market_manager_sessions: { Args: never; Returns: undefined }
      get_employee_by_username: {
        Args: { _username: string }
        Returns: {
          email: string
          id: string
          status: string
          username: string
        }[]
      }
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
      attendance_status: "full_day" | "half_day" | "absent" | "weekly_off"
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
      user_role:
        | "employee"
        | "admin"
        | "market_manager"
        | "bms_executive"
        | "bdo"
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
      attendance_status: ["full_day", "half_day", "absent", "weekly_off"],
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
      user_role: [
        "employee",
        "admin",
        "market_manager",
        "bms_executive",
        "bdo",
      ],
    },
  },
} as const
