import { useState, useCallback } from 'react';
import { userService, UserProfile, CreateProfileRequest } from '../services/userService';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  createProfile: (data: CreateProfileRequest) => Promise<boolean>;
  getProfile: (uid: string) => Promise<boolean>;
  checkProfileExists: (uid: string) => Promise<boolean>;
  clearError: () => void;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createProfile = useCallback(async (data: CreateProfileRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.createProfile(data);
      
      if (response.success) {
        // Optionally fetch the created profile to update state
        await getProfile(data.uid);
        return true;
      } else {
        setError(response.error || 'Failed to create profile');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getProfile = useCallback(async (uid: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getProfile(uid);
      
      if (response.success && response.profile) {
        setProfile(response.profile);
        return true;
      } else {
        setError(response.error || 'Failed to fetch profile');
        setProfile(null);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProfile(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkProfileExists = useCallback(async (uid: string): Promise<boolean> => {
    try {
      return await userService.profileExists(uid);
    } catch (err) {
      console.log('Error checking if profile exists:', err);
      return false;
    }
  }, []);

  return {
    profile,
    isLoading,
    error,
    createProfile,
    getProfile,
    checkProfileExists,
    clearError,
  };
} 