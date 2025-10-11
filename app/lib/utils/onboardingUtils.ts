import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility functions for managing onboarding state
 */

export const ONBOARDING_KEY = 'has_seen_onboarding';

/**
 * Check if user has seen onboarding
 */
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    console.log('Onboarding marked as completed');
  } catch (error) {
    console.error('Error marking onboarding as completed:', error);
  }
};

/**
 * Reset onboarding status (useful for testing)
 * This will make the app show onboarding again on next launch
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    console.log('Onboarding status reset - will show onboarding on next launch');
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
};

/**
 * Clear all onboarding-related data
 */
export const clearOnboardingData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_KEY,
      'onboarded', // Legacy key, remove if exists
    ]);
    console.log('All onboarding data cleared');
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
  }
};
