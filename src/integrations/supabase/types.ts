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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          instructor: string | null
          max_capacity: number
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          instructor?: string | null
          max_capacity?: number
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          instructor?: string | null
          max_capacity?: number
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          activity_id: string
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          activity_id: string
          client_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          schedule_id: string
          status?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_message_logs: {
        Row: {
          created_at: string
          failed_count: number
          failed_ids: string[]
          id: string
          message_text: string
          recipient_ids: string[]
          sent_count: number
          sent_ids: string[]
          total_recipients: number
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          failed_ids?: string[]
          id?: string
          message_text: string
          recipient_ids?: string[]
          sent_count?: number
          sent_ids?: string[]
          total_recipients?: number
          user_id: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          failed_ids?: string[]
          id?: string
          message_text?: string
          recipient_ids?: string[]
          sent_count?: number
          sent_ids?: string[]
          total_recipients?: number
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          enroll_date: string
          id: string
          last_name: string
          name: string
          notes: string | null
          payment_status: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          enroll_date?: string
          id?: string
          last_name?: string
          name: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          enroll_date?: string
          id?: string
          last_name?: string
          name?: string
          notes?: string | null
          payment_status?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          activity_id: string
          client_id: string
          created_at: string
          id: string
          schedule_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          client_id: string
          created_at?: string
          id?: string
          schedule_id: string
          user_id: string
        }
        Update: {
          activity_id?: string
          client_id?: string
          created_at?: string
          id?: string
          schedule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_config: {
        Row: {
          created_at: string
          id: string
          my_percentage: number
          rent_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          my_percentage?: number
          rent_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          my_percentage?: number
          rent_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          activity_id: string | null
          amount: number
          client_id: string | null
          created_at: string
          date: string
          id: string
          income_type: string | null
          notes: string | null
          period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount: number
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          income_type?: string | null
          notes?: string | null
          period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          income_type?: string | null
          notes?: string | null
          period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string
          id: string
          kind: string
          reference_date: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          reference_date: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          reference_date?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      predefined_messages: {
        Row: {
          created_at: string
          id: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          activity_id: string
          created_at: string
          day_of_week: string
          duration_minutes: number
          id: string
          max_capacity: number | null
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          day_of_week: string
          duration_minutes?: number
          id?: string
          max_capacity?: number | null
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          day_of_week?: string
          duration_minutes?: number
          id?: string
          max_capacity?: number | null
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wod_results: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          result_text: string
          result_value: number | null
          updated_at: string
          user_id: string
          wod_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          result_text?: string
          result_value?: number | null
          updated_at?: string
          user_id: string
          wod_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          result_text?: string
          result_value?: number | null
          updated_at?: string
          user_id?: string
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wod_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_results_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      wods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin_email: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "usuario"
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
      app_role: ["super_admin", "admin", "usuario"],
    },
  },
} as const
