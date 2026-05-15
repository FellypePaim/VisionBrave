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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          permissions: Json
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_error_logs: {
        Row: {
          action: string | null
          created_at: string
          error_code: string | null
          error_message: string
          id: string
          metadata: Json
          model: string | null
          provider: string | null
          route: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          error_code?: string | null
          error_message: string
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string
          id?: string
          metadata?: Json
          model?: string | null
          provider?: string | null
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          ref_id: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          type: Database["public"]["Enums"]["credit_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          ref_id?: string | null
          type?: Database["public"]["Enums"]["credit_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          external_url: string | null
          id: string
          metadata: Json | null
          model: string
          prompt: string
          public_url: string | null
          storage_path: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_url?: string | null
          id?: string
          metadata?: Json | null
          model: string
          prompt: string
          public_url?: string | null
          storage_path?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_url?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          prompt?: string
          public_url?: string | null
          storage_path?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      kie_monthly_usage: {
        Row: {
          cap_brl: number | null
          month_key: string
          notified_at_75pct: string | null
          total_brl: number
          total_requests: number
          updated_at: string
        }
        Insert: {
          cap_brl?: number | null
          month_key: string
          notified_at_75pct?: string | null
          total_brl?: number
          total_requests?: number
          updated_at?: string
        }
        Update: {
          cap_brl?: number | null
          month_key?: string
          notified_at_75pct?: string | null
          total_brl?: number
          total_requests?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_generations: {
        Row: {
          actual_cost_usd: number | null
          completed_at: string | null
          cost_credits: number
          created_at: string
          endpoint: string
          error: string | null
          estimated_cost_brl: number | null
          kind: string
          metadata: Json
          model: string
          prompt: string | null
          provider: string
          result_urls: string[] | null
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          actual_cost_usd?: number | null
          completed_at?: string | null
          cost_credits?: number
          created_at?: string
          endpoint: string
          error?: string | null
          estimated_cost_brl?: number | null
          kind: string
          metadata?: Json
          model: string
          prompt?: string | null
          provider?: string
          result_urls?: string[] | null
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          actual_cost_usd?: number | null
          completed_at?: string | null
          cost_credits?: number
          created_at?: string
          endpoint?: string
          error?: string | null
          estimated_cost_brl?: number | null
          kind?: string
          metadata?: Json
          model?: string
          prompt?: string | null
          provider?: string
          result_urls?: string[] | null
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          monthly_credits: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          monthly_credits?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          monthly_credits?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_kie_usage: { Args: { p_brl: number }; Returns: number }
      credit_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_metadata?: Json
          p_ref_id?: string
          p_type: Database["public"]["Enums"]["credit_tx_type"]
          p_user_id: string
        }
        Returns: number
      }
      debit_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_metadata?: Json
          p_ref_id?: string
        }
        Returns: number
      }
      get_daily_generations: {
        Args: { p_kind?: string; p_user_id: string }
        Returns: number
      }
      get_kie_monthly_status: {
        Args: { p_default_cap?: number }
        Returns: Json
      }
      mark_kie_alert_75pct: { Args: never; Returns: boolean }
    }
    Enums: {
      credit_tx_type: "purchase" | "bonus" | "spend" | "refund" | "subscription"
      subscription_plan:
        | "free"
        | "starter"
        | "pro"
        | "enterprise"
        | "premium"
        | "premiumplus"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
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
      credit_tx_type: ["purchase", "bonus", "spend", "refund", "subscription"],
      subscription_plan: [
        "free",
        "starter",
        "pro",
        "enterprise",
        "premium",
        "premiumplus",
      ],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
      ],
    },
  },
} as const
