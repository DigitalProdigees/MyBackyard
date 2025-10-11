import { Platform } from 'react-native';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { firebaseApp } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Firebase Auth with proper persistence
let auth: any;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(firebaseApp);
  } else {
    // For React Native, use initializeAuth with AsyncStorage persistence
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error) {
  // If initializeAuth fails (e.g., already initialized), use getAuth
  console.warn('Auth already initialized, using getAuth:', error);
  auth = getAuth(firebaseApp);
}

export { auth };
export const db = getFirestore(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
