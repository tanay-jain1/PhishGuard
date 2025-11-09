'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

export interface Profile {
  points: number;
  streak: number;
  accuracy: number;
  badges: string[];
  username: string | null;
  email?: string | null;
}

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * React hook to manage user profile
 * Calls /api/profile/get on mount and provides refreshProfile and updateUsername functions
 */
export function useProfile(): UseProfileReturn {
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

      // Call profile GET API
      const response = await fetch('/api/profile/get', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch profile:', errorData);
        // Don't reset profile on error - keep existing state if available
        // Use functional update to access current state without dependency
        setProfile((currentProfile) => {
          if (!currentProfile) {
            return {
              points: 0,
              streak: 0,
              accuracy: 0,
              badges: [],
              username: null,
              email: null,
            };
          }
          return currentProfile; // Keep existing profile
        });
        setLoading(false);
        return;
      }

      const profileData = await response.json();
      setProfile({
        points: profileData.points || 0,
        streak: profileData.streak || 0,
        accuracy: profileData.accuracy || 0,
        badges: profileData.badges || [],
        username: profileData.username || null,
        email: profileData.email || null,
      });
    } catch (error) {
      console.error('Error in refreshProfile:', error);
      // Don't reset profile on error - keep existing state if available
      // Use functional update to access current state without dependency
      setProfile((currentProfile) => {
        if (!currentProfile) {
          return {
            points: 0,
            streak: 0,
            accuracy: 0,
            badges: [],
            username: null,
            email: null,
          };
        }
        return currentProfile; // Keep existing profile
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

  return {
    profile,
    loading,
    refreshProfile,
    updateUsername,
  };
}

