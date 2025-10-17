import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Deprecated mock AuthContext – remove usage. Keeping file minimal to avoid import errors.

interface User {
  uid: string;
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signin: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, displayName: string) => Promise<AuthResponse>;
  signout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;
  forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const LOGOUT_FLAG_KEY = 'force_logout';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  console.log('AuthProvider: Component initialized');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app start
  useEffect(() => {
    console.log('AuthProvider: useEffect triggered, calling checkAuthState');
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<void> => {
    try {
      console.log('Checking auth state...');
      setIsLoading(true);

      // Check if user was force logged out
      const forceLogoutFlag = await AsyncStorage.getItem(LOGOUT_FLAG_KEY);
      if (forceLogoutFlag === 'true') {
        console.log('Force logout flag detected, clearing all data');
        await clearAllAuthData();
        setIsLoading(false);
        return;
      }

      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      if (token && userData) {
        console.log('Found stored auth data, verifying with mock service...');
        // Verify token with mock service
        const response = await authService.verifySession(token);

        if (response.success) {
          const parsedUser = JSON.parse(userData);
          console.log('Auth verification successful, user logged in:', parsedUser.email);
          setUser(parsedUser);
        } else {
          console.log('Auth verification failed, clearing stored data');
          // Token is invalid, clear stored data
          await clearAllAuthData();
        }
      } else {
        console.log('No stored auth data found');
      }
    } catch (error) {
      console.log('Auth state check error:', error);
      await clearAllAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllAuthData = async (): Promise<void> => {
    console.log('Clearing all auth data...');
    try {
      // Set user offline before clearing data
      try {
        const ChatService = (await import('../services/chatService')).default;
        const chatService = ChatService.getInstance();
        await chatService.setUserOffline();
        console.log('User set to offline before clearing auth data');
      } catch (chatError) {
        console.log('Error setting user offline:', chatError);
      }

      // Get all AsyncStorage keys and remove any auth-related ones
      const allKeys = await AsyncStorage.getAllKeys();
      const authKeys = allKeys.filter(key =>
        key.includes('auth') ||
        key.includes('token') ||
        key.includes('user') ||
        key.includes('payment') ||
        key.includes('checkout') ||
        key.includes('stripe') ||
        key.includes('session') ||
        key.includes('booking') ||
        key.includes('NAVIGATION') ||
        key === AUTH_TOKEN_KEY ||
        key === USER_DATA_KEY ||
        key === LOGOUT_FLAG_KEY
      );

      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('Removed auth keys:', authKeys);
      }

      // Also remove specific keys to be sure (including payment-related and navigation state)
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
        AsyncStorage.removeItem(LOGOUT_FLAG_KEY),
        AsyncStorage.removeItem('payment_session'),
        AsyncStorage.removeItem('checkout_url'),
        AsyncStorage.removeItem('stripe_session_id'),
        AsyncStorage.removeItem('pending_booking'),
        AsyncStorage.removeItem('active_payment_flow'),
        AsyncStorage.removeItem('payment_flow_timestamp'),
        AsyncStorage.removeItem('signup_flow_active'),
        AsyncStorage.removeItem('signup_user_type'),
        AsyncStorage.removeItem('NAVIGATION_STATE'),
        AsyncStorage.removeItem('NAVIGATION_STATE_KEY'),
        AsyncStorage.removeItem('expo-router-state'),
      ]);

      setUser(null);
      console.log('All auth and session data cleared successfully');
    } catch (error) {
      console.log('Error clearing auth data:', error);
      // Fallback: just clear the known keys
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
        AsyncStorage.removeItem(LOGOUT_FLAG_KEY),
        AsyncStorage.removeItem('payment_session'),
        AsyncStorage.removeItem('checkout_url'),
        AsyncStorage.removeItem('stripe_session_id'),
        AsyncStorage.removeItem('pending_booking'),
        AsyncStorage.removeItem('active_payment_flow'),
        AsyncStorage.removeItem('payment_flow_timestamp'),
        AsyncStorage.removeItem('signup_flow_active'),
        AsyncStorage.removeItem('signup_user_type'),
        AsyncStorage.removeItem('NAVIGATION_STATE'),
        AsyncStorage.removeItem('NAVIGATION_STATE_KEY'),
        AsyncStorage.removeItem('expo-router-state'),
      ]);
      setUser(null);
    }
  };

  const clearAuthData = async (): Promise<void> => {
    console.log('Clearing auth data...');
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_DATA_KEY),
    ]);
    setUser(null);
  };

  const signin = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      console.log('Starting signin process for:', email);
      // Don't set isLoading here to avoid navigation interference

      // Clear any existing logout flags
      await AsyncStorage.removeItem(LOGOUT_FLAG_KEY);

      const response = await authService.signin({ email, password });

      if (response.success && response.uid && response.email && response.token) {
        console.log('Signin successful, storing user data');
        const userData: User = {
          uid: response.uid,
          email: response.email,
          displayName: response.displayName || undefined, // Use displayName from mock service response
        };

        // Store the actual token from mock service
        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token),
          AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        ]);

        setUser(userData);
        console.log('User data stored and state updated');
        console.log('AuthContext: isAuthenticated should now be true');
      } else {
        console.log('Signin failed:', response.error);
      }

      return response;
    } catch (error) {
      console.log('Signin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
    // Don't set isLoading false here either
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResponse> => {
    try {
      console.log('AuthContext: signup function called with:', { email, displayName });
      // Don't set isLoading here to avoid navigation interference

      // Clear any existing logout flags
      await AsyncStorage.removeItem(LOGOUT_FLAG_KEY);

      const response = await authService.signup({ email, password, displayName });
      console.log('AuthContext: authService.signup response:', response);

      if (response.success && response.uid && response.email && response.token) {
        const userData: User = {
          uid: response.uid,
          email: response.email,
          displayName: displayName, // Use the provided displayName since API doesn't return it
        };

        // Store the actual token from mock service
        await Promise.all([
          AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token),
          AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        ]);

        setUser(userData);
        console.log('AuthContext: signup successful, user set:', userData);
      }

      return response;
    } catch (error) {
      console.log('AuthContext: signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
    // Don't set isLoading false here either
  };

  const signout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Starting signout process...');

      // Set force logout flag immediately
      await AsyncStorage.setItem(LOGOUT_FLAG_KEY, 'true');

      // Get the token before clearing it
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      // Call mock service signout to invalidate session
      if (token) {
        try {
          await authService.signout(token);
          console.log('Mock service signout successful');
        } catch (error) {
          console.log('Mock service signout error (continuing with local cleanup):', error);
        }
      }

      // Clear all local data
      await clearAllAuthData();
      console.log('Local auth data cleared');

      // Force navigation to login screen
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 100);

    } catch (error) {
      console.log('Signout error:', error);
      // Ensure local data is cleared even if there's an error
      await clearAllAuthData();
      // Still navigate to login
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  const forceLogout = async (): Promise<void> => {
    console.log('Force logout initiated');
    await AsyncStorage.setItem(LOGOUT_FLAG_KEY, 'true');
    await clearAllAuthData();
    router.replace('/(auth)/sign-in');
  };

  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    return await authService.requestPasswordReset(email);
  };

  const refreshUser = async (): Promise<void> => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token && user) {
      try {
        const response = await authService.verifySession(token);
        if (response.success) {
          // Keep existing user data since verifySession doesn't return user details
          console.log('Session is still valid');
        } else {
          // Session is invalid, force logout
          console.log('Session expired, forcing logout');
          await forceLogout();
        }
      } catch (error) {
        console.log('Error refreshing user data:', error);
        await forceLogout();
      }
    }
  };

  const checkSessionValidity = async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;

    try {
      const response = await authService.verifySession(token);
      if (!response.success) {
        // Session invalid, force logout
        await forceLogout();
        return false;
      }
      return response.success;
    } catch (error) {
      console.log('Session validity check error:', error);
      await forceLogout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signin,
    signup,
    signout,
    requestPasswordReset,
    refreshUser,
    checkSessionValidity,
    forceLogout,
  };

  console.log('AuthContext: Creating context value with functions:', {
    signin: typeof signin,
    signup: typeof signup,
    signout: typeof signout,
    requestPasswordReset: typeof requestPasswordReset,
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Add debugging to ensure all functions are properly defined
  if (!context.signup) {
    console.log('signup function is undefined in AuthContext');
    console.log('Available context properties:', Object.keys(context));
  }

  return context;
} 