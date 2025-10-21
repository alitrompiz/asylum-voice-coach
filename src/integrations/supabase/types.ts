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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          target_user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          target_user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_entitlement_grants: {
        Row: {
          created_at: string
          end_at_utc: string
          granted_by_admin_id: string
          id: string
          reason: string | null
          start_at_utc: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_at_utc: string
          granted_by_admin_id: string
          id?: string
          reason?: string | null
          start_at_utc?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_at_utc?: string
          granted_by_admin_id?: string
          id?: string
          reason?: string | null
          start_at_utc?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      attorneys: {
        Row: {
          coupon_code: string | null
          created_at: string
          display_name: string
          firm_name: string
          id: string
          notes: string | null
          ref_is_active: boolean
          updated_at: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          display_name: string
          firm_name: string
          id?: string
          notes?: string | null
          ref_is_active?: boolean
          updated_at?: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          display_name?: string
          firm_name?: string
          id?: string
          notes?: string | null
          ref_is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          amount: number | null
          attorney_id: string | null
          coupon_code: string | null
          created_at: string
          event_type: string
          id: string
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          attorney_id?: string | null
          coupon_code?: string | null
          created_at?: string
          event_type: string
          id?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          attorney_id?: string | null
          coupon_code?: string | null
          created_at?: string
          event_type?: string
          id?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_rate_limits: {
        Row: {
          count: number
          route: string
          subject: string
          window_start: string
        }
        Insert: {
          count?: number
          route: string
          subject: string
          window_start: string
        }
        Update: {
          count?: number
          route?: string
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          improvements: string[]
          interview_session_id: string | null
          onboarding: Json | null
          persona_desc: string | null
          score: number
          skills_selected: string[] | null
          strengths: string[]
          transcript: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improvements: string[]
          interview_session_id?: string | null
          onboarding?: Json | null
          persona_desc?: string | null
          score: number
          skills_selected?: string[] | null
          strengths: string[]
          transcript: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improvements?: string[]
          interview_session_id?: string | null
          onboarding?: Json | null
          persona_desc?: string | null
          score?: number
          skills_selected?: string[] | null
          strengths?: string[]
          transcript?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string
          full_transcript: string | null
          id: string
          language: string | null
          persona_id: string | null
          prompt_version_used: string | null
          session_duration_seconds: number | null
          skills_selected: string[] | null
          updated_at: string
          user_context: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_transcript?: string | null
          id?: string
          language?: string | null
          persona_id?: string | null
          prompt_version_used?: string | null
          session_duration_seconds?: number | null
          skills_selected?: string[] | null
          updated_at?: string
          user_context?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_transcript?: string | null
          id?: string
          language?: string | null
          persona_id?: string | null
          prompt_version_used?: string | null
          session_duration_seconds?: number | null
          skills_selected?: string[] | null
          updated_at?: string
          user_context?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      minutes_balance: {
        Row: {
          created_at: string | null
          id: string
          session_seconds_limit: number | null
          session_seconds_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_seconds_limit?: number | null
          session_seconds_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_seconds_limit?: number | null
          session_seconds_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ocr_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          id: string
          progress: number | null
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          id?: string
          progress?: number | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          id?: string
          progress?: number | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          ai_instructions: string | null
          alt_text: string
          created_at: string
          id: string
          image_url: string
          is_visible: boolean
          mood: string
          name: string
          position: number
          tier_access: string[] | null
          tts_voice: string | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          alt_text: string
          created_at?: string
          id?: string
          image_url: string
          is_visible?: boolean
          mood: string
          name: string
          position?: number
          tier_access?: string[] | null
          tts_voice?: string | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          alt_text?: string
          created_at?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          mood?: string
          name?: string
          position?: number
          tier_access?: string[] | null
          tts_voice?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          asylum_office_filed: string | null
          avatar_url: string | null
          country_of_feared_persecution: string | null
          created_at: string | null
          date_filed: string | null
          display_name: string | null
          id: string
          interview_date: string | null
          is_banned: boolean
          language_preference: string | null
          legal_name: string | null
          notifications_opted_in: boolean | null
          onboarding_status: string | null
          preferred_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asylum_office_filed?: string | null
          avatar_url?: string | null
          country_of_feared_persecution?: string | null
          created_at?: string | null
          date_filed?: string | null
          display_name?: string | null
          id?: string
          interview_date?: string | null
          is_banned?: boolean
          language_preference?: string | null
          legal_name?: string | null
          notifications_opted_in?: boolean | null
          onboarding_status?: string | null
          preferred_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asylum_office_filed?: string | null
          avatar_url?: string | null
          country_of_feared_persecution?: string | null
          created_at?: string | null
          date_filed?: string | null
          display_name?: string | null
          id?: string
          interview_date?: string | null
          is_banned?: boolean
          language_preference?: string | null
          legal_name?: string | null
          notifications_opted_in?: boolean | null
          onboarding_status?: string | null
          preferred_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompt_usage_logs: {
        Row: {
          created_at: string
          id: string
          interview_session_id: string | null
          prompt_id: string
          prompt_type: string
          user_id: string
          variables_used: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_session_id?: string | null
          prompt_id: string
          prompt_type: string
          user_id: string
          variables_used?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_session_id?: string | null
          prompt_id?: string
          prompt_type?: string
          user_id?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_usage_logs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_base_template: boolean
          last_used_at: string | null
          name: string
          placeholder_documentation: string | null
          prompt_type: Database["public"]["Enums"]["prompt_type"] | null
          prompt_variables: Json | null
          template_variables: Json | null
          updated_at: string
          usage_count: number | null
          validation_status: string | null
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_base_template?: boolean
          last_used_at?: string | null
          name: string
          placeholder_documentation?: string | null
          prompt_type?: Database["public"]["Enums"]["prompt_type"] | null
          prompt_variables?: Json | null
          template_variables?: Json | null
          updated_at?: string
          usage_count?: number | null
          validation_status?: string | null
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_base_template?: boolean
          last_used_at?: string | null
          name?: string
          placeholder_documentation?: string | null
          prompt_type?: Database["public"]["Enums"]["prompt_type"] | null
          prompt_variables?: Json | null
          template_variables?: Json | null
          updated_at?: string
          usage_count?: number | null
          validation_status?: string | null
          version?: number
        }
        Relationships: []
      }
      scores: {
        Row: {
          case_strength: number
          created_at: string
          credibility: number
          id: string
          story_clarity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          case_strength: number
          created_at?: string
          credibility: number
          id?: string
          story_clarity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          case_strength?: number
          created_at?: string
          credibility?: number
          id?: string
          story_clarity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_phrases: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          phrase_text: string
          phrase_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          phrase_text: string
          phrase_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          phrase_text?: string
          phrase_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          ai_instructions: string | null
          created_at: string
          group_name: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tier_access: string[] | null
          updated_at: string
        }
        Insert: {
          ai_instructions?: string | null
          created_at?: string
          group_name: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tier_access?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_instructions?: string | null
          created_at?: string
          group_name?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tier_access?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          detected_sections: Json | null
          file_path: string | null
          id: string
          is_active: boolean
          source_type: string
          story_text: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detected_sections?: Json | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          source_type: string
          story_text: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detected_sections?: Json | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          source_type?: string
          story_text?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      story_files: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          attorney_id: string | null
          coupon_code: string | null
          created_at: string
          email: string
          grace_period_end: string | null
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attorney_id?: string | null
          coupon_code?: string | null
          created_at?: string
          email: string
          grace_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attorney_id?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string
          grace_period_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_attorney_id_fkey"
            columns: ["attorney_id"]
            isOneToOne: false
            referencedRelation: "attorneys"
            referencedColumns: ["id"]
          },
        ]
      }
      test_stories: {
        Row: {
          category: string
          country_origin: string
          created_at: string | null
          display_order: number
          full_story_text: string
          id: string
          is_active: boolean
          summary: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          country_origin: string
          created_at?: string | null
          display_order?: number
          full_story_text: string
          id?: string
          is_active?: boolean
          summary: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          country_origin?: string
          created_at?: string | null
          display_order?: number
          full_story_text?: string
          id?: string
          is_active?: boolean
          summary?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          content: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      assign_admin_role: {
        Args: { _user_id: string }
        Returns: undefined
      }
      backfill_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_and_increment_rate_limit: {
        Args: {
          p_limit: number
          p_route: string
          p_subject: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      exec_admin_user_query: {
        Args: { query_params?: Json; query_text: string }
        Returns: Json
      }
      get_active_prompt_by_type: {
        Args: { p_type: string }
        Returns: {
          content: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          prompt_type: Database["public"]["Enums"]["prompt_type"]
          updated_at: string
          version: number
        }[]
      }
      get_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users_7d: number
          avg_minutes_per_user: number
          minutes_used_today: number
          total_users: number
        }[]
      }
      get_all_users_admin: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_term?: string
          status_filter?: string
        }
        Returns: {
          created_at: string
          display_name: string
          email: string
          entitlement_status: string
          has_active_grant: boolean
          has_active_subscription: boolean
          is_banned: boolean
          subscription_status: string
          total_count: number
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_entitlement_status: {
        Args: { target_user_id: string }
        Returns: string
      }
      grant_full_prep_access: {
        Args: {
          grant_reason?: string
          target_user_id: string
          weeks_to_grant?: number
        }
        Returns: undefined
      }
      has_any_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_prompt_usage: {
        Args: { prompt_id: string }
        Returns: undefined
      }
      remove_admin_role: {
        Args: { _user_id: string }
        Returns: undefined
      }
      revoke_full_prep_access: {
        Args: { revoke_reason?: string; target_user_id: string }
        Returns: undefined
      }
      set_active_story: {
        Args: { story_id: string; user_id_param: string }
        Returns: undefined
      }
      user_has_active_entitlement: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      validate_prompt_template: {
        Args: { content: string; required_vars: string[] }
        Returns: boolean
      }
      validate_session_inputs: {
        Args: { p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      prompt_type: "interview_conduct" | "feedback_generation"
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
      app_role: ["admin", "user"],
      prompt_type: ["interview_conduct", "feedback_generation"],
    },
  },
} as const
