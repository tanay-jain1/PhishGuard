'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';

export interface Profile {
  points: number;
  streak: number;
  accuracy: number;
  badges: string[];
  username: string | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);

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
        .select('points, streak, accuracy, badges, username')
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
              .select('points, streak, accuracy, badges, username')
              .eq('id', user.id)
              .single();

            if (retryData) {
              setProfile({
                points: retryData.points || 0,
                streak: retryData.streak || 0,
                accuracy: retryData.accuracy || 0,
                badges: (retryData.badges as string[]) || [],
                username: retryData.username || null,
              });
            } else {
              setProfile({
                points: 0,
                streak: 0,
                accuracy: 0,
                badges: [],
                username: null,
              });
            }
          } catch (initError) {
            console.error('Failed to init profile:', initError);
            setProfile({
              points: 0,
              streak: 0,
              accuracy: 0,
              badges: [],
              username: null,
            });
          }
        } else {
          console.error('Failed to fetch profile:', profileError);
          setProfile({
            points: 0,
            streak: 0,
            accuracy: 0,
            badges: [],
            username: null,
          });
        }
      } else if (profileData) {
        setProfile({
          points: profileData.points || 0,
          streak: profileData.streak || 0,
          accuracy: profileData.accuracy || 0,
          badges: (profileData.badges as string[]) || [],
          username: profileData.username || null,
        });
      } else {
        setProfile({
          points: 0,
          streak: 0,
          accuracy: 0,
          badges: [],
          username: null,
        });
      }
    } catch (err) {
      console.error('Error in refreshProfile:', err);
      setProfile({
        points: 0,
        streak: 0,
        accuracy: 0,
        badges: [],
        username: null,
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const updateUsername = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Call profile UPDATE API
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to update username';
        return { success: false, error: errorMessage };
      }

      // Refresh profile after successful update
      await refreshProfile();

      return { success: true };
    } catch (error) {
      console.error('Error in updateUsername:', error);
      return { success: false, error: 'Failed to update username' };
    }
  }, [supabase, refreshProfile]);

  // Fetch profile on mount
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile, updateUsername }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}

