import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as RNLinking from 'react-native';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './store';
import { useAuth } from './lib/hooks/useAuth';
import { StorageCleanup } from './lib/utils/storageCleanup';
import { StorageManager } from './components/StorageManager';

// Keep the native splash screen visible until we finish loading everything
SplashScreen.preventAutoHideAsync();


function RootLayoutContent() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSignupFlowActive, setIsSignupFlowActive] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Check for signup flow flag on app start
  useEffect(() => {
    const checkSignupFlow = async () => {
      try {
        const signupFlowActive = await AsyncStorage.getItem('signup_flow_active');
        setIsSignupFlowActive(signupFlowActive === 'true');
        console.log('🔍 Initial signup flow check:', signupFlowActive === 'true');
      } catch (error) {
        console.warn('Failed to check signup flow flag:', error);
      }
    };
    checkSignupFlow();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    const handleNavigation = async () => {
      // Hide splash screen
      try { 
        await SplashScreen.hideAsync(); 
      } catch (error) {
        console.warn('Failed to hide splash screen:', error);
      }

      if (isLoading) {
        return; // Still loading, don't navigate yet
      }

      // Reset navigation flag if user is not authenticated (logout scenario)
      if (!isAuthenticated && hasNavigated) {
        console.log('🔄 User logged out, resetting navigation flag');
        setHasNavigated(false);
      }

      if (isAuthenticated && user) {
        console.log('🚀 User authenticated:', { 
          email: user.email, 
          type: user.type,
          name: user.name
        });
        
        // Double-check signup flow flag
        const signupFlowActive = await AsyncStorage.getItem('signup_flow_active');
        const isSignupFlow = signupFlowActive === 'true' || isSignupFlowActive;
        
        console.log('🔍 Signup flow flag from storage:', signupFlowActive);
        console.log('🔍 Signup flow state:', isSignupFlowActive);
        console.log('🔍 Final signup flow decision:', isSignupFlow);
        console.log('🔍 User type:', user.type);
        
        if (isSignupFlow) {
          console.log('📝 Signup flow: navigating to profile');
          // Always allow signup flow navigation, even if hasNavigated is true
          setHasNavigated(true);
          // Don't clear the signup flow flag yet - let profile screen handle it after completion
          
          if (user.type === 'owner') {
            console.log('🏠 Navigating to OWNER profile');
            router.replace('/(owner-app)/(main-app)/profile');
          } else {
            console.log('🏠 Navigating to RENTAL profile');
            router.replace('/(main-app)/profile');
          }
        } else {
          // Prevent duplicate navigation for normal login flow
          if (hasNavigated) {
            console.log('⏭️ Navigation already handled, skipping');
            return;
          }
          
          console.log('🏠 Login flow: navigating to home');
          setHasNavigated(true);
          if (user.type === 'owner') {
            console.log('🏠 Navigating to OWNER home');
            router.replace('/(owner-app)/(main-app)/home');
          } else {
            console.log('🏠 Navigating to RENTAL home');
            router.replace('/(main-app)/home');
          }
        }
      } else {
        console.log('❌ No user authenticated, navigating to auth');
        // Don't set hasNavigated for auth navigation - we need to navigate again after login
        router.replace('/(auth)/sign-in');
      }
    };

    handleNavigation();
  }, [isAuthenticated, user, isLoading, router, isSignupFlowActive]);

  // Perform storage cleanup on app start
  useEffect(() => {
    StorageCleanup.checkAndCleanup().catch(error => {
      console.log('Storage cleanup failed:', error);
    });
  }, []);

  // Handle incoming dynamic links to route reset password in-app
  useEffect(() => {
    const handleURL = async (eventUrl?: string | null) => {
      try {
        const url = eventUrl ?? (await RNLinking.Linking.getInitialURL());
        if (!url) return;
        // Firebase dynamic link format: https://<domain>/?link=https%3A%2F%2F<auth-domain>%2F__%2Fauth%2Faction%3Fmode%3DresetPassword%26oobCode%3DXXXX&...
        const outer = new URL(url);
        const innerLink = outer.searchParams.get('link') ?? url; // support direct links too
        const decoded = decodeURIComponent(innerLink);
        const inner = new URL(decoded);
        const mode = inner.searchParams.get('mode');
        const oobCode = inner.searchParams.get('oobCode');
        const pathname = inner.pathname || '';
        const isResetPath = pathname.includes('/(auth)/reset-password');
        if (((mode === 'resetPassword') || isResetPath) && oobCode) {
          router.replace({ pathname: '/(auth)/reset-password', params: { oobCode } });
        }
      } catch { }
    };

    const sub = RNLinking.Linking.addEventListener('url', ({ url }) => handleURL(url));
    handleURL(null);
    return () => {
      try { sub.remove(); } catch { }
    };
  }, [router]);

  // Note: Auth state loading is handled by the useAuth hook
  // The splash screen will be hidden once auth state is determined

  return (
    <ThemeProvider value={DefaultTheme}>
      <StorageManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main-app)" options={{ headerShown: false }} />
        <Stack.Screen name="(owner-app)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutContent />
    </Provider>
  );
}
