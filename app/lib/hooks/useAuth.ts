import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, rtdb } from '../firebase';
import { ref, get, onValue, off } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  type: 'customer' | 'owner';
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        setIsLoading(true);
        
        if (firebaseUser) {
          console.log('🔥 Firebase user detected:', firebaseUser.email);
          
          // Check if this is a signup flow by checking the signup flag
          const signupFlowActive = await AsyncStorage.getItem('signup_flow_active');
          const isSignupFlow = signupFlowActive === 'true';
          
          console.log('🔍 Signup flow detected:', isSignupFlow);
          console.log('🔍 Signup flow flag value:', signupFlowActive);
          
          if (isSignupFlow) {
            // For signup flow, use real-time listener to wait for correct data
            const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            
            // Set timeout for signup flow - reduced to 3 seconds for faster fallback
            timeoutId = setTimeout(() => {
              console.warn('⚠️ Signup flow timeout, using fallback');
              const fallbackUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || '',
                type: 'customer' as 'customer' | 'owner'
              };
              setUser(fallbackUser);
              setIsAuthenticated(true);
              off(userRef);
            }, 3000); // 3 second timeout for signup
            
            const unsubscribeUserData = onValue(userRef, (snapshot) => {
              if (snapshot.exists()) {
                const userData = snapshot.val();
                console.log('🔍 Real-time user data received:', userData);
                
                // Clear timeout
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
                
                const authUser: AuthUser = {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  name: userData.fullName || firebaseUser.displayName || '',
                  type: userData.type || 'customer'
                };
                
                setUser(authUser);
                setIsAuthenticated(true);
                console.log('✅ Signup user authenticated:', { 
                  email: authUser.email, 
                  type: authUser.type,
                  name: authUser.name
                });
                
                // Unsubscribe after getting data
                off(userRef);
              } else {
                console.log('⏳ Signup flow: User data not yet available, waiting...');
              }
            }, (error) => {
              console.log('Error in signup flow listener:', error);
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              // Fallback on error
              const fallbackUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || '',
                type: 'customer' as 'customer' | 'owner'
              };
              setUser(fallbackUser);
              setIsAuthenticated(true);
              off(userRef);
            });
          } else {
            // For normal login, get data directly
            try {
              const [fullNameSnap, userTypeSnap] = await Promise.all([
                get(ref(rtdb, `users/${firebaseUser.uid}/fullName`)),
                get(ref(rtdb, `users/${firebaseUser.uid}/type`))
              ]);

              const fullName = fullNameSnap?.exists() ? fullNameSnap.val() : '';
              const userType = userTypeSnap?.exists() ? userTypeSnap.val() : 'customer';

              const authUser: AuthUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: fullName || firebaseUser.displayName || '',
                type: userType as 'customer' | 'owner'
              };

              setUser(authUser);
              setIsAuthenticated(true);
              console.log('✅ Login user authenticated:', { 
                email: authUser.email, 
                type: authUser.type,
                name: authUser.name
              });
            } catch (error) {
              console.log('Error getting user data for login:', error);
              // Fallback
              const fallbackUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || '',
                type: 'customer' as 'customer' | 'owner'
              };
              setUser(fallbackUser);
              setIsAuthenticated(true);
            }
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          console.log('❌ No user authenticated');
        }
      } catch (error) {
        console.log('Auth state change error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { user, isLoading, isAuthenticated };
};
