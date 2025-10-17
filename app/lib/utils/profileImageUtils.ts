import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, rtdb } from '../firebase';
import { ref, get } from 'firebase/database';

// Utility functions for managing user profile images across the app

export interface ProfileImageData {
  uri: string;
  initials: string;
}

/**
 * Get user initials from full name
 */
export const getUserInitials = (fullName: string): string => {
  if (!fullName || fullName.trim() === '') {
    return 'U';
  }
  
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2); // Limit to 2 characters
};

/**
 * Get profile image for the current user
 */
export const getCurrentUserProfileImage = async (): Promise<ProfileImageData | null> => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    // Try to load from new Storage URL format first
    const profileImageUrlRef = ref(rtdb, `users/${uid}/profileImageUrl`);
    const urlSnapshot = await get(profileImageUrlRef);
    
    if (urlSnapshot.exists()) {
      const imageUrl = urlSnapshot.val();
      
      // Get user initials for fallback
      const fullNameSnapshot = await get(ref(rtdb, `users/${uid}/fullName`));
      const fullName = fullNameSnapshot.val() || auth.currentUser?.displayName || '';
      const initials = getUserInitials(fullName);
      
      return { uri: imageUrl, initials };
    } else {
      // Fallback to old base64 format
      const profileImageRef = ref(rtdb, `users/${uid}/profileImage`);
      const snapshot = await get(profileImageRef);
      
      if (snapshot.exists()) {
        const base64Data = snapshot.val();
        const mimeTypeSnapshot = await get(ref(rtdb, `users/${uid}/profileImageMimeType`));
        const mimeType = mimeTypeSnapshot.val() || 'image/jpeg';
        const imageUri = `data:${mimeType};base64,${base64Data}`;
        
        // Get user initials for fallback
        const fullNameSnapshot = await get(ref(rtdb, `users/${uid}/fullName`));
        const fullName = fullNameSnapshot.val() || auth.currentUser?.displayName || '';
        const initials = getUserInitials(fullName);
        
        return { uri: imageUri, initials };
      } else {
        // Fallback to AsyncStorage
        const localImage = await AsyncStorage.getItem('userProfileImage');
        if (localImage) {
          const fullNameSnapshot = await get(ref(rtdb, `users/${uid}/fullName`));
          const fullName = fullNameSnapshot.val() || auth.currentUser?.displayName || '';
          const initials = getUserInitials(fullName);
          
          return { uri: localImage, initials };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log('Error getting current user profile image:', error);
    return null;
  }
};

/**
 * Get profile image for a specific user by UID
 */
export const getUserProfileImage = async (userId: string): Promise<ProfileImageData | null> => {
  try {
    // Try to load from new Storage URL format first
    const profileImageUrlRef = ref(rtdb, `users/${userId}/profileImageUrl`);
    const urlSnapshot = await get(profileImageUrlRef);
    
    if (urlSnapshot.exists()) {
      const imageUrl = urlSnapshot.val();
      
      // Get user initials for fallback
      const fullNameSnapshot = await get(ref(rtdb, `users/${userId}/fullName`));
      const fullName = fullNameSnapshot.val() || '';
      const initials = getUserInitials(fullName);
      
      return { uri: imageUrl, initials };
    } else {
      // Fallback to old base64 format
      const profileImageRef = ref(rtdb, `users/${userId}/profileImage`);
      const snapshot = await get(profileImageRef);
      
      if (snapshot.exists()) {
        const base64Data = snapshot.val();
        const mimeTypeSnapshot = await get(ref(rtdb, `users/${userId}/profileImageMimeType`));
        const mimeType = mimeTypeSnapshot.val() || 'image/jpeg';
        const imageUri = `data:${mimeType};base64,${base64Data}`;
        
        // Get user initials for fallback
        const fullNameSnapshot = await get(ref(rtdb, `users/${userId}/fullName`));
        const fullName = fullNameSnapshot.val() || '';
        const initials = getUserInitials(fullName);
        
        return { uri: imageUri, initials };
      }
    }
    
    return null;
  } catch (error) {
    console.log('Error getting user profile image:', error);
    return null;
  }
};

/**
 * Get profile image source for Image component
 */
export const getProfileImageSource = (profileImageData: ProfileImageData | null) => {
  if (profileImageData?.uri) {
    return { uri: profileImageData.uri };
  }
  return require('../../../assets/icons/profile.png'); // Fallback to default profile icon
};

/**
 * Get profile image with fallback to initials
 */
export const getProfileImageWithFallback = (profileImageData: ProfileImageData | null) => {
  return {
    hasImage: !!profileImageData?.uri,
    imageUri: profileImageData?.uri || null,
    initials: profileImageData?.initials || 'U'
  };
};