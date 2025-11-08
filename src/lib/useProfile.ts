'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

export interface Profile {
  points: number;
  streak: number;
  badges: string[];
}

/**
 * Custom hook to fetch and manage user profile
 * Provides profile data and refresh function
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('points, streak, badges')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // Profile doesn't exist yet - initialize it
        if (profileError.code === 'PGRST116') {
          try {
            await fetch('/api/auth/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            });
            // Retry fetching after init
            const { data: retryData } = await supabase
              .from('profiles')
              .select('points, streak, badges')
              .eq('id', user.id)
              .single();

            if (retryData) {
              setProfile({
                points: retryData.points || 0,
                streak: retryData.streak || 0,
                badges: (retryData.badges as string[]) || [],
              });
            } else {
              setProfile({ points: 0, streak: 0, badges: [] });
            }
          } catch (initError) {
            console.error('Failed to init profile:', initError);
            setProfile({ points: 0, streak: 0, badges: [] });
          }
        } else {
          console.error('Failed to fetch profile:', profileError);
          setProfile({ points: 0, streak: 0, badges: [] });
        }
      } else if (profileData) {
        setProfile({
          points: profileData.points || 0,
          streak: profileData.streak || 0,
          badges: (profileData.badges as string[]) || [],
        });
      } else {
        setProfile({ points: 0, streak: 0, badges: [] });
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setProfile({ points: 0, streak: 0, badges: [] });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile: fetchProfile,
  };
}

