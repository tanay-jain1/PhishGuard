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
          points: number | null;
          streak: number | null;
          badges: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          points?: number | null;
          streak?: number | null;
          badges?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          points?: number | null;
          streak?: number | null;
          badges?: string[] | null;
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
      guesses: {
        Row: {
          id: string;
          user_id: string;
          email_id: string;
          user_guess: boolean;
          is_correct: boolean;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_id: string;
          user_guess: boolean;
          is_correct?: boolean;
          points?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_id?: string;
          user_guess?: boolean;
          is_correct?: boolean;
          points?: number;
          created_at?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          subject: string;
          from_name: string;
          from_email: string;
          body_html: string;
          is_phish: boolean;
          features: Json;
          explanation: string;
          difficulty: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          from_name: string;
          from_email: string;
          body_html: string;
          is_phish: boolean;
          features?: Json;
          explanation: string;
          difficulty: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject?: string;
          from_name?: string;
          from_email?: string;
          body_html?: string;
          is_phish?: boolean;
          features?: Json;
          explanation?: string;
          difficulty?: string;
          created_at?: string;
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

