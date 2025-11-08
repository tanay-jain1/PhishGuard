export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          total_guesses: number;
          correct_guesses: number;
          current_email_index: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score?: number;
          total_guesses?: number;
          correct_guesses?: number;
          current_email_index?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          total_guesses?: number;
          correct_guesses?: number;
          current_email_index?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          high_score: number;
          total_games: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          high_score?: number;
          total_games?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          high_score?: number;
          total_games?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

