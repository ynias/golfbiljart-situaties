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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      situation_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          situation_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          situation_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          situation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "situation_comments_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "situation_comments_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      situation_likes: {
        Row: {
          created_at: string
          liker_id: string
          situation_id: string
        }
        Insert: {
          created_at?: string
          liker_id: string
          situation_id: string
        }
        Update: {
          created_at?: string
          liker_id?: string
          situation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "situation_likes_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "situation_likes_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations_public"
            referencedColumns: ["id"]
          },
        ]
      }
      situations: {
        Row: {
          author_name: string | null
          comment_count: number
          created_at: string
          data: Json
          description: string | null
          edit_token: string
          id: string
          is_public: boolean
          like_count: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          comment_count?: number
          created_at?: string
          data: Json
          description?: string | null
          edit_token: string
          id?: string
          is_public?: boolean
          like_count?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          comment_count?: number
          created_at?: string
          data?: Json
          description?: string | null
          edit_token?: string
          id?: string
          is_public?: boolean
          like_count?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      situations_public: {
        Row: {
          author_name: string | null
          comment_count: number | null
          created_at: string | null
          data: Json | null
          description: string | null
          id: string | null
          is_public: boolean | null
          like_count: number | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          comment_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          like_count?: number | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          comment_count?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          like_count?: number | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_comment: {
        Args: { p_author_name: string; p_body: string; p_slug: string }
        Returns: {
          author_name: string
          body: string
          created_at: string
          id: string
          situation_id: string
        }
        SetofOptions: {
          from: "*"
          to: "situation_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_delete_comment: { Args: { p_id: string }; Returns: boolean }
      admin_delete_situation: { Args: { p_slug: string }; Returns: boolean }
      admin_update_situation: {
        Args: {
          p_author_name: string
          p_data: Json
          p_description: string
          p_slug: string
          p_title: string
        }
        Returns: boolean
      }
      delete_situation: {
        Args: { p_slug: string; p_token: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_valid_point: { Args: { p: Json }; Returns: boolean }
      is_valid_situation_data: { Args: { d: Json }; Returns: boolean }
      liked_slugs: {
        Args: { p_liker: string; p_slugs: string[] }
        Returns: string[]
      }
      toggle_like: {
        Args: { p_liker: string; p_slug: string }
        Returns: {
          like_count: number
          liked: boolean
        }[]
      }
      update_situation: {
        Args: {
          p_author_name: string
          p_data: Json
          p_description: string
          p_slug: string
          p_title: string
          p_token: string
        }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
