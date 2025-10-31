import React, { useEffect, useState } from 'react';
import { View, Text, Image, useWindowDimensions, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { authStyles } from './styles/auth.styles';
import { Icons } from '../../constants/icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, rtdb } from '../lib/firebase';
import { ref, set, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const { width, height } = Dimensions.get('window');
const ratio = Math.min(width, height) / 375; // Base ratio for responsive scaling

export default function VerificationSuccess() {
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSettingUpStripe, setIsSettingUpStripe] = useState(false);
  const [stripeSetupComplete, setStripeSetupComplete] = useState(false);
  
  // Stripe Connect status
  const [stripeStatus, setStripeStatus] = useState({
    status: 'not_created',
    accountId: null,
    needsOnboarding: false,
    isChecking: false,
    isSettingUp: false
  });

  const email = params.email as string;
  const fullName = params.fullName as string;
  const password = params.password as string;
  const isAdmin = (params.isAdmin as string) === 'true';

  // Create user account after verification is complete
  useEffect(() => {
    const createUserAccount = async () => {
      if (!email || !fullName || !password) {
        console.log('Missing user data for account creation');
        router.replace('/(auth)/signup');
        return;
      }

      setIsCreatingUser(true);

      try {
        console.log('Creating user account after verification:', { email, fullName });
        
        // Ensure signup flow flag is set before creating user
        try { 
          await AsyncStorage.setItem('signup_flow_active', 'true'); 
          await AsyncStorage.setItem('signup_user_type', isAdmin ? 'owner' : 'customer');
          console.log('✅ Signup flow flags set before user creation');
        } catch (e) { 
          console.warn('Failed to set signup flow flags:', e); 
        }
        
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user && fullName) {
          try { await updateProfile(cred.user, { displayName: fullName }); } catch (e) { console.warn('updateProfile failed', e); }
          try {
            const userRef = ref(rtdb, `users/${cred.user.uid}`);
            const userData = {
              fullName: fullName,
              email: cred.user.email,
              type: isAdmin ? 'owner' : 'customer',
              createdAt: new Date().toISOString(),
              // Initialize Stripe Connect fields for owners
              ...(isAdmin && {
                stripeConnectAccountId: null,
                stripeAccountStatus: 'not_created',
                kycCompleted: false,
                bankAccountAdded: false,
                verificationStatus: 'pending',
                onboardingCompleted: false,
              })
            };
            console.log('💾 Saving user data to RTDB:', userData);
            await set(userRef, userData);
            console.log('✅ User data saved successfully to RTDB');
          } catch (e) { 
            console.log('❌ Failed to save user in RTDB:', e); 
          }
        }
        
        // If owner, proceed to Stripe Connect setup
        if (isAdmin) {
          await setupStripeConnect(cred.user.uid);
        }
        // No navigation here; listener in _layout will handle stack change
      } catch (error) {
        console.log('Error creating user account:', error);
      } finally {
        setIsCreatingUser(false);
      }
    };

    createUserAccount();
  }, [email, fullName, password]);

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    setStripeStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
      
      const result = await checkStatus({});
      const data = result.data as any;
      
      if (data.success) {
        setStripeStatus({
          status: data.status,
          accountId: data.accountId,
          needsOnboarding: data.needsOnboarding,
          isChecking: false,
          isSettingUp: false
        });
      }
    } catch (error) {
      console.log('Error checking Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Refresh Stripe Connect status (manual refresh)
  const refreshStripeStatus = async () => {
    setStripeStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const functions = getFunctions();
      const refreshStatus = httpsCallable(functions, 'refreshConnectAccountStatus');
      
      const result = await refreshStatus({});
      const data = result.data as any;
      
      if (data.success) {
        setStripeStatus({
          status: data.status,
          accountId: data.accountId,
          needsOnboarding: data.needsOnboarding,
          isChecking: false,
          isSettingUp: false
        });
      }
    } catch (error) {
      console.log('Error refreshing Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Setup Stripe Connect for owners
  const setupStripeConnect = async (userId: string) => {
    if (!isAdmin) return;
    
    setIsSettingUpStripe(true);
    
    try {
      console.log('Setting up Stripe Connect for owner:', userId);
      
      const functions = getFunctions();
      const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
      
      const result = await createConnectAccount({
        email: email,
        name: fullName
      });
      
      const data = result.data as any;
      
      if (data.success && data.accountLink) {
        console.log('Stripe Connect account created, redirecting to onboarding');
        
        // Open Stripe onboarding in browser
        const result = await WebBrowser.openBrowserAsync(data.accountLink, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        
        if (result.type === 'dismiss') {
          // User completed or cancelled onboarding
          setStripeSetupComplete(true);
          console.log('Stripe onboarding completed');
          // Refresh status after onboarding
          await checkStripeStatus();
          // Navigate to owner home after verification
          console.log('Navigating to owner home after Stripe verification');
          router.replace('/(owner-app)/(main-app)/home');
        }
      } else if (data.success && data.isExisting) {
        // Account already exists
        setStripeSetupComplete(true);
        console.log('Stripe Connect account already exists');
        // Check status for existing account
        await checkStripeStatus();
      }
    } catch (error) {
      console.log('Error setting up Stripe Connect:', error);
      // Continue anyway - user can set up later
      setStripeSetupComplete(true);
    } finally {
      setIsSettingUpStripe(false);
    }
  };

  // Reopen Stripe onboarding
  const reopenStripeOnboarding = async () => {
    setStripeStatus(prev => ({ ...prev, isSettingUp: true }));
    
    try {
      const functions = getFunctions();
      const createAccountLink = httpsCallable(functions, 'createAccountLink');
      
      const result = await createAccountLink({});
      const data = result.data as any;
      
      if (data.success && data.accountLink) {
        console.log('Reopening Stripe onboarding');
        
        // Open Stripe onboarding in browser
        const result = await WebBrowser.openBrowserAsync(data.accountLink, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        
        if (result.type === 'dismiss') {
          // User completed or cancelled onboarding - refresh status
          await refreshStripeStatus();
        }
      }
    } catch (error) {
      console.log('Error reopening Stripe onboarding:', error);
    } finally {
      setStripeStatus(prev => ({ ...prev, isSettingUp: false }));
    }
  };

  // Check Stripe status on component mount for owners
  useEffect(() => {
    if (isAdmin && stripeSetupComplete) {
      checkStripeStatus();
    }
  }, [isAdmin, stripeSetupComplete]);

  // Listen for deep links (when user returns from Stripe verification) - similar to payment processing
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Verification deep link received:', url);
      
      if (url.includes('owner-verification-complete')) {
        console.log('Stripe verification completed, navigating to owner home...');
        setStripeSetupComplete(true);
        await checkStripeStatus();
        router.replace('/(owner-app)/(main-app)/home');
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // TODO: Uncomment for future countdown implementation
  // useEffect(() => {
  //   const countdownTimer = setInterval(() => {
  //     setCountdown((prev: number) => {
  //       if (prev <= 1) {
  //         router.replace('/(main-app)/profile');
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);

  //   return () => clearInterval(countdownTimer);
  // }, []);

  // TODO: For production, uncomment the authentication check and remove the bypass
  // The current implementation bypasses authentication for testing purposes

  return (
    <View style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={[authStyles.content, { flex: 1, justifyContent: 'center' }]}>
        <View style={{
          alignItems: 'center',
          paddingVertical: Math.min(windowHeight * 0.1, height * 0.1),
          marginBottom: Math.min(height * 0.06, 50), // This will create equal spacing of 10% of screen height from top and bottom
        }}>
          <View style={{
            borderRadius: Math.min(width * 0.24, 90),
            padding: Math.min(width * 0.027, 10),
            backgroundColor: '#46B64933',
            marginBottom: Math.min(height * 0.05, 40)
          }}>
            <View style={{
              borderRadius: Math.min(width * 0.267, 100),
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Image
                source={Icons.done}
                style={{
                  width: Math.min(width * 0.293, 110),
                  height: Math.min(width * 0.293, 110),
                  resizeMode: 'contain',
                }}
              />
            </View>
          </View>
          <Text style={[authStyles.title, {
            textAlign: 'center',
            marginBottom: Math.min(height * 0.015, 12)
          }]}>
            Successfully Verified!
          </Text>
          <Text style={[authStyles.subtitle, { textAlign: 'center' }]}>
            {isCreatingUser
              ? 'Creating your account...'
              : isAdmin && isSettingUpStripe
              ? 'Setting up payment processing...'
              : isAdmin && !stripeSetupComplete
              ? 'Redirecting to payment setup...'
              : 'Your account is ready! Redirecting to profile...'
            }
          </Text>
          
          {isAdmin && (isSettingUpStripe || !stripeSetupComplete) && (
            <View style={styles.stripeSetupContainer}>
              <ActivityIndicator size="small" color="#A6E66E" style={{ marginRight: 8 }} />
              <Text style={styles.stripeSetupText}>
                {isSettingUpStripe ? 'Setting up Stripe Connect...' : 'Please complete payment setup'}
              </Text>
            </View>
          )}

          {/* Stripe Dashboard Section - Only for owners after setup */}
          {isAdmin && stripeSetupComplete && (
            <View style={styles.stripeDashboardContainer}>
              <Text style={styles.stripeDashboardTitle}>Payment Processing</Text>
              
              {stripeStatus.isChecking ? (
                <View style={styles.statusLoadingContainer}>
                  <ActivityIndicator size="small" color="#A6E66E" />
                  <Text style={styles.statusLoadingText}>Checking status...</Text>
                </View>
              ) : (
                <View style={styles.statusContainer}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Account Status:</Text>
                    <View style={[
                      styles.statusBadge,
                      stripeStatus.status === 'verified' ? styles.statusVerified : 
                      stripeStatus.status === 'pending_verification' ? styles.statusPending :
                      styles.statusNotVerified
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {stripeStatus.status === 'verified' ? 'Verified' :
                         stripeStatus.status === 'pending_verification' ? 'Under Review' :
                         stripeStatus.status === 'pending_onboarding' ? 'Setup Required' :
                         'Not Set Up'}
                      </Text>
                    </View>
                  </View>
                  
                  {stripeStatus.status === 'not_created' && (
                    <TouchableOpacity
                      style={styles.setupButton}
                      onPress={reopenStripeOnboarding}
                      disabled={stripeStatus.isSettingUp}
                    >
                      {stripeStatus.isSettingUp ? (
                        <ActivityIndicator size="small" color="#1D234B" />
                      ) : (
                        <Text style={styles.setupButtonText}>Set Up Payment Processing</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {stripeStatus.status === 'pending_onboarding' && (
                    <TouchableOpacity
                      style={styles.setupButton}
                      onPress={reopenStripeOnboarding}
                      disabled={stripeStatus.isSettingUp}
                    >
                      {stripeStatus.isSettingUp ? (
                        <ActivityIndicator size="small" color="#1D234B" />
                      ) : (
                        <Text style={styles.setupButtonText}>Complete Setup</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {stripeStatus.status === 'pending_verification' && (
                    <View style={styles.pendingContainer}>
                      <Text style={styles.pendingText}>
                        Your account is under review. You'll be notified once verification is complete.
                      </Text>
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={refreshStripeStatus}
                        disabled={stripeStatus.isChecking}
                      >
                        {stripeStatus.isChecking ? (
                          <ActivityIndicator size="small" color="#1D234B" />
                        ) : (
                          <Text style={styles.refreshButtonText}>Refresh Status</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {stripeStatus.status === 'verified' && (
                    <View style={styles.verifiedContainer}>
                      <Text style={styles.verifiedText}>
                        ✓ Your payment processing is fully set up and ready to receive payments!
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = {
  stripeSetupContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: Math.min(height * 0.02, 16),
    paddingHorizontal: Math.min(width * 0.08, 30),
  },
  stripeSetupText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.min(width * 0.035, 14),
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center' as const,
  },
  // Stripe Dashboard Styles
  stripeDashboardContainer: {
    width: '100%' as const,
    marginTop: Math.min(height * 0.03, 24),
    padding: Math.min(width * 0.05, 20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stripeDashboardTitle: {
    color: 'white',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: '600' as const,
    marginBottom: Math.min(height * 0.02, 16),
    textAlign: 'center' as const,
  },
  statusLoadingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: Math.min(height * 0.025, 20),
  },
  statusLoadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.min(width * 0.04, 16),
    marginLeft: 8,
  },
  statusContainer: {
    width: '100%' as const,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Math.min(height * 0.02, 16),
  },
  statusLabel: {
    color: 'white',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: Math.min(width * 0.03, 12),
    paddingVertical: Math.min(height * 0.007, 6),
    borderRadius: 20,
  },
  statusVerified: {
    backgroundColor: '#46B649',
  },
  statusPending: {
    backgroundColor: '#FFA500',
  },
  statusNotVerified: {
    backgroundColor: '#FF6B6B',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: '600' as const,
  },
  setupButton: {
    backgroundColor: '#A6E66E',
    paddingVertical: Math.min(height * 0.015, 12),
    paddingHorizontal: Math.min(width * 0.06, 24),
    borderRadius: 25,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  setupButtonText: {
    color: '#1D234B',
    fontSize: Math.min(width * 0.04, 16),
    fontWeight: '600' as const,
  },
  pendingContainer: {
    marginTop: 8,
  },
  pendingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Math.min(width * 0.035, 14),
    lineHeight: Math.min(height * 0.025, 20),
    marginBottom: Math.min(height * 0.015, 12),
    textAlign: 'center' as const,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Math.min(height * 0.01, 8),
    paddingHorizontal: Math.min(width * 0.04, 16),
    borderRadius: 20,
    alignSelf: 'center' as const,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: '500' as const,
  },
  verifiedContainer: {
    marginTop: 8,
    padding: Math.min(width * 0.03, 12),
    backgroundColor: 'rgba(70, 182, 73, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(70, 182, 73, 0.3)',
  },
  verifiedText: {
    color: '#A6E66E',
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
}; 