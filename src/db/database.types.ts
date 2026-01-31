export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          flashcard_id: string | null
          generation_card_id: string | null
          generation_session_id: string | null
          id: string
          srs_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          flashcard_id?: string | null
          generation_card_id?: string | null
          generation_session_id?: string | null
          id?: string
          srs_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          flashcard_id?: string | null
          generation_card_id?: string | null
          generation_session_id?: string | null
          id?: string
          srs_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_generation_card_id_fkey"
            columns: ["generation_card_id"]
            isOneToOne: false
            referencedRelation: "generation_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_generation_session_id_fkey"
            columns: ["generation_session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_srs_session_id_fkey"
            columns: ["srs_session_id"]
            isOneToOne: false
            referencedRelation: "srs_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decisions: {
        Row: {
          accepted_flashcard_id: string | null
          decided_at: string
          decision: string
          edited_back: string | null
          edited_front: string | null
          generation_card_id: string
          id: string
          user_id: string
        }
        Insert: {
          accepted_flashcard_id?: string | null
          decided_at?: string
          decision: string
          edited_back?: string | null
          edited_front?: string | null
          generation_card_id: string
          id?: string
          user_id: string
        }
        Update: {
          accepted_flashcard_id?: string | null
          decided_at?: string
          decision?: string
          edited_back?: string | null
          edited_front?: string | null
          generation_card_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decisions_accepted_flashcard_id_fkey"
            columns: ["accepted_flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decisions_generation_card_id_fkey"
            columns: ["generation_card_id"]
            isOneToOne: true
            referencedRelation: "generation_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deleted_at: string | null
          front: string
          id: string
          source_generation_card_id: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deleted_at?: string | null
          front: string
          id?: string
          source_generation_card_id?: string | null
          source_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deleted_at?: string | null
          front?: string
          id?: string
          source_generation_card_id?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_source_generation_card_id_fkey"
            columns: ["source_generation_card_id"]
            isOneToOne: false
            referencedRelation: "generation_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_cards: {
        Row: {
          back: string
          created_at: string
          front: string
          id: string
          position: number
          session_id: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          front: string
          id?: string
          position: number
          session_id: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          front?: string
          id?: string
          position?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "generation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_sessions: {
        Row: {
          created_at: string
          id: string
          input_char_count: number
          input_text: string
          model_name: string
          model_provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_char_count: number
          input_text: string
          model_name: string
          model_provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_char_count?: number
          input_text?: string
          model_name?: string
          model_provider?: string
          user_id?: string
        }
        Relationships: []
      }
      srs_card_state: {
        Row: {
          created_at: string
          due_at: string
          ease_factor: number
          flashcard_id: string
          interval_days: number
          last_reviewed_at: string | null
          repetition: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string
          ease_factor?: number
          flashcard_id: string
          interval_days?: number
          last_reviewed_at?: string | null
          repetition?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          ease_factor?: number
          flashcard_id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          repetition?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_card_state_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: true
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_reviews: {
        Row: {
          due_at_after: string
          ease_factor_after: number
          flashcard_id: string
          id: string
          interval_days_after: number
          rating: number
          repetition_after: number
          reviewed_at: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          due_at_after: string
          ease_factor_after: number
          flashcard_id: string
          id?: string
          interval_days_after: number
          rating: number
          repetition_after: number
          reviewed_at?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          due_at_after?: string
          ease_factor_after?: number
          flashcard_id?: string
          id?: string
          interval_days_after?: number
          rating?: number
          repetition_after?: number
          reviewed_at?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "srs_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_sessions: {
        Row: {
          completed_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

