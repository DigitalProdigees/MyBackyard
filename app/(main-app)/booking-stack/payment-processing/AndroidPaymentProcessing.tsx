import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Image, Alert, ActivityIndicator, Linking, TouchableOpacity, Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../../components/GradientBackground';
import { Icons } from '../../../../constants/icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createCheckoutSession, checkSessionStatus, getErrorMessage, PaymentData } from './shared/paymentUtils';

export default function AndroidPaymentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReturningFromStripe, setIsReturningFromStripe] = useState(false);
  const [processedSessionId, setProcessedSessionId] = useState<string | null>(null);
  const [hasNavigatedToSuccess, setHasNavigatedToSuccess] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isPaymentFullyProcessed, setIsPaymentFullyProcessed] = useState(false);
  
  // Better state management
  const [paymentState, setPaymentState] = useState<'idle' | 'creating' | 'processing' | 'completed' | 'cancelled' | 'error'>('idle');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Refs for preventing race conditions
  const isProcessingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const hasStartedPaymentRef = useRef(false);
  const hasBeenCancelledRef = useRef(false);
  const lastRetryTimeRef = useRef(0); // Track last retry time to prevent rapid retries
  
  const params = useLocalSearchParams();

  // Initialize component and validate params
  useEffect(() => {
    const initializeComponent = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;

      console.log('Android Payment Processing: Initializing component');

      // Reset all payment state flags on mount
      isProcessingRef.current = false;
      hasStartedPaymentRef.current = false;
      setPaymentState('idle');
      setIsProcessing(false);
      setIsStuck(false);
      setCurrentSessionId(null);
      setIsPaymentFullyProcessed(false);
      setProcessedSessionId(null);
      setIsReturningFromStripe(false);
      setHasNavigatedToSuccess(false);
      console.log('Android Payment Processing: Reset all payment state flags on mount');

      const listingId = params.listingId as string;
      const total = params.total as string;
      
      if (!listingId || !total) {
        console.log('Android Payment Processing: Missing required params on mount, redirecting to home');
        router.replace('/(main-app)/home');
        return;
      }

      console.log('Android Payment Processing: Params validated, ready for payment');
    };

    initializeComponent();

    // Cleanup: just reset refs and unsubscribe
    return () => {
      // Cleanup auth listener
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
        authUnsubscribeRef.current = null;
      }
      
      // Clear any pending timeout
      if ((window as any).webBrowserTimeoutId) {
        clearTimeout((window as any).webBrowserTimeoutId);
        (window as any).webBrowserTimeoutId = null;
      }
      
      // Reset payment start flag
      hasStartedPaymentRef.current = false;
      setIsReturningFromStripe(false);
      console.log('Android Payment Processing: Component cleanup completed');
    };
  }, []);

  // Handle payment cancellation - Android specific
  const handlePaymentCancellation = useCallback(async () => {
    console.log('Android Payment Processing: Handling payment cancellation');
    setPaymentState('cancelled');
    
    // Set cancellation flag to prevent automatic reopening
    hasBeenCancelledRef.current = true;
    
    // Android-specific: Ensure WebBrowser is dismissed
    try {
      await WebBrowser.dismissBrowser();
      console.log('Android WebBrowser dismissed after cancellation');
    } catch (error) {
      console.log('Error dismissing WebBrowser (may already be closed):', error);
    }
    
    // Clear processing flags to prevent reopening
    isProcessingRef.current = false;
    hasStartedPaymentRef.current = false;
    setIsProcessing(false);
    setCurrentSessionId(null);
    setCheckoutUrl('');
    
    // Don't auto-navigate - let user choose what to do
    console.log('Android Payment Processing: Payment cancelled, waiting for user action');
  }, []);

  // Create Stripe Checkout Session - Android optimized
  const createCheckoutSessionAndroid = useCallback(async () => {
    // Simple guard: only prevent if currently processing
    if (isProcessingRef.current) {
      console.log('Android Payment Processing: Checkout already in progress, skipping');
      return;
    }

    // Check if we have an existing session that might still be valid
    if (currentSessionId) {
      const isSessionValid = await checkSessionStatus(currentSessionId);
      if (!isSessionValid) {
        console.log('Android Payment Processing: Existing session is no longer valid, creating new one');
        setCurrentSessionId(null);
      } else {
        console.log('Android Payment Processing: Existing session is still valid, reopening checkout');
        // Reopen the existing checkout URL if we have it
        if (checkoutUrl) {
          const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
            dismissButtonStyle: 'cancel',
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, // Android prefers full screen
          });
          
          if (result.type === 'dismiss' || result.type === 'cancel') {
            await handlePaymentCancellation();
          }
          return;
        }
      }
    }

    try {
      console.log('Android Payment Processing: Starting createCheckoutSession');
      isProcessingRef.current = true;
      setPaymentState('creating');
      setIsProcessing(true);
      setPaymentError('');

      // Get booking data from params
      const paymentData: PaymentData = {
        listingId: params.listingId as string,
        fullName: params.fullName as string,
        guests: params.guests as string,
        hours: params.hours as string,
        total: params.total as string,
        selectedDate: params.selectedDate as string,
        startTime: params.startTime as string,
        endTime: params.endTime as string,
      };

      if (!paymentData.listingId) {
        throw new Error('Missing listing ID');
      }

      const { checkoutUrl: newCheckoutUrl, sessionId } = await createCheckoutSession(paymentData);
      
      setCheckoutUrl(newCheckoutUrl);
      
      if (sessionId) {
        setCurrentSessionId(sessionId);
        console.log('Android Payment Processing: Session ID received:', sessionId);
      } else {
        console.log('Session ID not returned from function, will extract from success URL');
      }
      
      setPaymentState('processing');
      
      // Android-specific: Open Stripe Checkout with full screen presentation
      const result = await WebBrowser.openBrowserAsync(newCheckoutUrl, {
        dismissButtonStyle: 'cancel',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        // Android-specific options
        showInRecents: false,
        enableBarCollapsing: false,
      });
      
      console.log('Android WebBrowser result:', result);
      
      // Handle the result when user returns
      if (result.type === 'dismiss' || result.type === 'cancel') {
        // User cancelled or closed the browser
        console.log('Android Payment cancelled by user');
        setPaymentState('cancelled');
        setIsProcessing(false);
        isProcessingRef.current = false;
        hasStartedPaymentRef.current = false;
        setCurrentSessionId(null);
        setCheckoutUrl('');
      } else if (result.type === 'opened') {
        // Browser opened successfully, wait for deep link or cancellation
        console.log('Android Stripe checkout opened successfully');
        // Keep processing state until deep link or cancellation
        
        // Add shorter timeout to detect when WebBrowser is closed
        const timeoutId = setTimeout(() => {
          console.log('Android WebBrowser timeout - treating as cancellation');
          setPaymentState('cancelled');
          setIsProcessing(false);
          isProcessingRef.current = false;
          hasStartedPaymentRef.current = false;
          setCurrentSessionId(null);
          setCheckoutUrl('');
        }, 5000); // 5 second timeout for faster detection
        
        // Store timeout ID for cleanup
        (window as any).webBrowserTimeoutId = timeoutId;
      } else {
        // Handle any other result type as cancellation
        console.log('Android WebBrowser returned unexpected result, treating as cancellation');
        setPaymentState('cancelled');
        setIsProcessing(false);
        isProcessingRef.current = false;
        hasStartedPaymentRef.current = false;
        setCurrentSessionId(null);
        setCheckoutUrl('');
      }
    } catch (error) {
      console.log('Android Checkout error:', error);
      console.log('Error type:', typeof error);
      console.log('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      setPaymentError(errorMessage);
      setPaymentState('error');
      
      Alert.alert('Checkout Error', errorMessage);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [params, paymentState, currentSessionId, checkoutUrl, handlePaymentCancellation]);

  // Handle authentication and start payment process
  useEffect(() => {
    const startPaymentProcess = async () => {
      // Check if we have required params
      const listingId = params.listingId as string;
      const total = params.total as string;
      
      console.log('Android Payment Processing: Checking params - listingId:', listingId, 'total:', total);
      
      if (!listingId || !total) {
        console.log('Missing required payment params, redirecting to home');
        router.replace('/(main-app)/home');
        return;
      }

      // Start payment process if not already started and not cancelled
      if (!isProcessingRef.current && !hasStartedPaymentRef.current && paymentState !== 'cancelled' && paymentState !== 'error' && !hasBeenCancelledRef.current) {
        console.log('Android User is authenticated, starting payment process');
        hasStartedPaymentRef.current = true;
        await createCheckoutSessionAndroid();
      } else {
        console.log('Android Payment already in progress, cancelled, or error state - skipping');
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      startPaymentProcess();
    }, 100);

    return () => clearTimeout(timer);
  }, [params, createCheckoutSessionAndroid, paymentState]);

  // Listen for app state changes to detect WebBrowser closure
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('Android App state changed to:', nextAppState);
      
      // If app comes back to active and we're in processing state, check if WebBrowser is still open
      if (nextAppState === 'active' && paymentState === 'processing' && !isReturningFromStripe && !hasBeenCancelledRef.current) {
        console.log('Android App returned to active, checking WebBrowser status');
        
        // Add a small delay to allow WebBrowser to properly close
        setTimeout(async () => {
          try {
            // Try to dismiss WebBrowser - if it's already closed, this will throw an error
            await WebBrowser.dismissBrowser();
            console.log('Android WebBrowser was still open, now dismissed');
          } catch (error) {
            // WebBrowser is already closed, treat as cancellation
            console.log('Android WebBrowser already closed, treating as cancellation');
            setPaymentState('cancelled');
            setIsProcessing(false);
            isProcessingRef.current = false;
            hasStartedPaymentRef.current = false;
            hasBeenCancelledRef.current = true;
            setCurrentSessionId(null);
            setCheckoutUrl('');
            
            // Prevent any further automatic payment attempts
            return;
          }
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [paymentState, isReturningFromStripe]);

  // Listen for deep links (when user returns from Stripe) - Android specific
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Android Deep link received:', url);
      setIsReturningFromStripe(true);
      
      // Clear any pending timeout
      if ((window as any).webBrowserTimeoutId) {
        clearTimeout((window as any).webBrowserTimeoutId);
        (window as any).webBrowserTimeoutId = null;
      }
      
      // Android-specific: Dismiss the WebBrowser if it's still open
      try {
        await WebBrowser.dismissBrowser();
        console.log('Android WebBrowser dismissed');
      } catch (error) {
        console.log('Error dismissing WebBrowser (may already be closed):', error);
      }
      
      if (url.includes('payment-success')) {
        // Extract session_id from URL
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId) {
          // Check if we've already navigated to success screen
          if (hasNavigatedToSuccess) {
            console.log('Already navigated to success screen, skipping:', sessionId);
            return;
          }
          
          console.log('Android Payment successful, navigating to payment success screen...');
          setProcessedSessionId(sessionId);
          setHasNavigatedToSuccess(true);
          
          // Navigate to payment success screen
          router.push({
            pathname: '/(main-app)/booking-stack/payment-success',
            params: { session_id: sessionId }
          });
        }
      } else if (url.includes('payment-cancel')) {
        console.log('Android Payment cancelled via deep link');
        await handlePaymentCancellation();
      } else {
        // Android-specific: Handle any other deep link that might indicate cancellation
        console.log('Android Unknown deep link received, treating as cancellation');
        await handlePaymentCancellation();
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
  }, [processedSessionId, handlePaymentCancellation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      {/* Payment Processing UI */}
      <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            {isProcessing ? (
              <ActivityIndicator size="large" color="#A6E66E" />
            ) : (
              <Image source={Icons.direct} style={styles.arrowIcon} />
            )}
          </View>
          <Text style={styles.title}>
            {paymentState === 'cancelled' ? 'Payment Cancelled' :
             paymentState === 'error' ? 'Payment Error' :
             paymentState === 'creating' ? 'Creating Payment Session...' :
             paymentState === 'processing' ? 'Opening Stripe Checkout...' : 
             'Redirecting to Payment'}
          </Text>
          <Text style={styles.subtitle}>
            {paymentState === 'cancelled' ? 'You cancelled the payment. You can try again.' :
             paymentState === 'error' ? 'Something went wrong. Please try again.' :
             paymentState === 'creating' ? 'Please wait while we create your payment session' :
             paymentState === 'processing' ? 'Please wait while we redirect you to Stripe' : 
             'You will be redirected to Stripe to complete your payment securely'}
          </Text>
          {paymentError && (
            <Text style={styles.errorText}>{paymentError}</Text>
          )}
          {(paymentState === 'error' || paymentState === 'cancelled') && (
            <View style={styles.buttonContainer}>
              {/* <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  const now = Date.now();
                  const timeSinceLastRetry = now - lastRetryTimeRef.current;
                  
                  // Prevent rapid retries (minimum 2 seconds between retries)
                  if (timeSinceLastRetry < 2000) {
                    console.log('Android Payment: Retry too soon, please wait');
                    return;
                  }
                  
                  lastRetryTimeRef.current = now;
                  
                  // Reset all payment state
                  isProcessingRef.current = false;
                  hasStartedPaymentRef.current = false;
                  hasBeenCancelledRef.current = false;
                  setPaymentState('idle');
                  setIsProcessing(false);
                  setPaymentError('');
                  setCurrentSessionId(null);
                  setProcessedSessionId(null);
                  setHasNavigatedToSuccess(false);
                  setIsReturningFromStripe(false);
                  setCheckoutUrl('');
                  // Retry payment
                  setTimeout(() => {
                    createCheckoutSessionAndroid();
                  }, 100);
                }}
              >
                <Text style={styles.retryButtonText}>Retry Payment</Text>
              </TouchableOpacity> */}
              <TouchableOpacity 
                style={styles.homeButton}
                onPress={async () => {
                  router.replace('/(main-app)/home');
                }}
              >
                <Text style={styles.homeButtonText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      {/* Show processing when returning from Stripe */}
      {isReturningFromStripe && (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color="#A6E66E" />
          </View>
          <Text style={styles.subtitle}>
            Please wait while we verify your payment and create your booking
          </Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 131,
    height: 131,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#A6E66E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  retryButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: '#2A3062',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
