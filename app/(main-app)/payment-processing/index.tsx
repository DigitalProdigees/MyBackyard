import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Image, Alert, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../components/GradientBackground';
import { Icons } from '../../../constants/icons';
import SuccessDialog from '../../components/dialogs/SuccessDialog';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import Success from '@/app/components/dialogs/Success';
import { auth, rtdb } from '@/app/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, set, push, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { STRIPE_CONFIG } from '@/app/lib/stripe';
import * as WebBrowser from 'expo-web-browser';

export default function PaymentProcessing() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReturningFromStripe, setIsReturningFromStripe] = useState(false);
  const [processedSessionId, setProcessedSessionId] = useState<string | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  
  // Better state management
  const [paymentState, setPaymentState] = useState<'idle' | 'creating' | 'processing' | 'completed' | 'cancelled' | 'error'>('idle');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Refs for preventing race conditions
  const isProcessingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  
  const params = useLocalSearchParams();

  // Initialize component and validate params
  useEffect(() => {
    const initializeComponent = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;

      console.log('Payment Processing: Initializing component');

      // Clear any existing payment flow flags on mount to start fresh
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.removeItem('active_payment_flow');
        await AsyncStorage.removeItem('payment_flow_timestamp');
        await AsyncStorage.removeItem('current_session_id');
        console.log('Payment Processing: Cleared payment flow flags on mount');
      } catch (error) {
        console.log('Error clearing payment flow flags on mount:', error);
      }

      // Reset all payment state flags on mount
      isProcessingRef.current = false;
      setPaymentState('idle');
      setIsProcessing(false);
      setIsStuck(false);
      setCurrentSessionId(null);
      console.log('Payment Processing: Reset all payment state flags on mount');

      const listingId = params.listingId as string;
      const total = params.total as string;
      
      if (!listingId || !total) {
        console.log('Payment Processing: Missing required params on mount, redirecting to home');
        router.replace('/(main-app)/home');
        return;
      }

      console.log('Payment Processing: Params validated, ready for payment');
    };

    initializeComponent();

    // Cleanup: remove the flag when component unmounts
    return () => {
      const cleanup = async () => {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('active_payment_flow');
          await AsyncStorage.removeItem('payment_flow_timestamp');
          await AsyncStorage.removeItem('current_session_id');
          console.log('Payment Processing: Cleared active payment flow flag on unmount');
        } catch (error) {
          console.log('Error clearing payment flow flag:', error);
        }
        
        // Cleanup auth listener
        if (authUnsubscribeRef.current) {
          authUnsubscribeRef.current();
          authUnsubscribeRef.current = null;
        }
      };
      cleanup();
    };
  }, []);

  // Create Stripe Checkout Session
  const createCheckoutSession = useCallback(async () => {
    // Prevent multiple simultaneous checkout attempts
    if (isProcessingRef.current || paymentState !== 'idle') {
      console.log('Payment Processing: Checkout already in progress or not in idle state, skipping');
      return;
    }

    try {
      console.log('Payment Processing: Starting createCheckoutSession');
      isProcessingRef.current = true;
      setPaymentState('creating');
      setIsProcessing(true);
      setPaymentError('');

      // Set payment flow flag when we actually start checkout
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('active_payment_flow', 'true');
        await AsyncStorage.setItem('payment_flow_timestamp', Date.now().toString());
        console.log('Payment Processing: Set active payment flow flag');
      } catch (error) {
        console.log('Error setting payment flow flag:', error);
      }

      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        setPaymentState('error');
        router.push('/(auth)/sign-in');
        return;
      }

      const uid = user.uid;
      console.log('User authenticated with UID:', uid);

      // Get booking data from params
      const listingId = params.listingId as string;
      const fullName = params.fullName as string;
      const guests = params.guests as string;
      const hours = params.hours as string;
      const total = params.total as string;
      const selectedDate = params.selectedDate as string;
      const startTime = params.startTime as string;
      const endTime = params.endTime as string;

      if (!listingId) {
        throw new Error('Missing listing ID');
      }

      // Get listing details from Firebase
      const listingRef = ref(rtdb, `listings/${listingId}`);
      const listingSnapshot = await get(listingRef);
      
      if (!listingSnapshot.exists()) {
        throw new Error('Listing not found');
      }

      const listing = listingSnapshot.val();

      // Initialize Firebase Functions
      const functions = getFunctions();
      const createCheckoutSessionFunction = httpsCallable(functions, 'createCheckoutSession');

      // Create checkout session
      const checkoutData = {
        amount: parseFloat(total),
        currency: 'usd',
        listingId,
        ownerId: listing.ownerId,
        ownerName: listing.ownerName || 'Property Owner',
        bookingData: {
          fullName,
          guests,
          hours,
          mainImage: listing.mainImage || listing.images?.[0] || '',
          date: {
            selectedDate,
            formattedDate: new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          },
          time: {
            startTime,
            endTime,
            duration: hours
          },
          listingInfo: {
            id: listingId,
            title: listing.title,
            location: `${listing.city || ''}, ${listing.state || ''}, ${listing.country || ''}`.replace(/^,\s*|,\s*$/g, ''),
            mainImage: listing.mainImage || listing.images?.[0] || ''
          }
        }
      };
      
      console.log('Payment Processing: Calling createCheckoutSession with data:', checkoutData);
      const checkoutResult = await createCheckoutSessionFunction(checkoutData);
      console.log('Payment Processing: Checkout result:', checkoutResult);

      const { checkoutUrl, sessionId } = checkoutResult.data as any;
      
      if (checkoutUrl) {
        setCheckoutUrl(checkoutUrl);
        
        // Handle sessionId if available (for newer function versions)
        if (sessionId) {
          setCurrentSessionId(sessionId);
          
          // Store session ID for tracking
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.setItem('current_session_id', sessionId);
          } catch (error) {
            console.log('Error storing session ID:', error);
          }
        } else {
          console.log('Session ID not returned from function, will extract from success URL');
        }
        
        setPaymentState('processing');
        
        // Open Stripe Checkout in in-app browser
        const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
          dismissButtonStyle: 'cancel',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        
        console.log('WebBrowser result:', result);
        
        // Handle the result when user returns
        if (result.type === 'dismiss' || result.type === 'cancel') {
          // User cancelled or closed the browser
          console.log('Payment cancelled by user');
          await handlePaymentCancellation();
        }
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.log('Checkout error:', error);
      console.log('Error type:', typeof error);
      console.log('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      setPaymentError(errorMessage);
      setPaymentState('error');
      
      // Clear payment flow flags on error
      await clearPaymentFlags();
      
      Alert.alert('Checkout Error', errorMessage);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [params, paymentState]);

  // Handle payment cancellation
  const handlePaymentCancellation = useCallback(async () => {
    console.log('Payment Processing: Handling payment cancellation');
    setPaymentState('cancelled');
    await clearPaymentFlags();
    isProcessingRef.current = false;
    setIsProcessing(false);
    setCurrentSessionId(null);
    router.replace('/(main-app)/home');
  }, []);

  // Clear payment flags
  const clearPaymentFlags = useCallback(async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem('active_payment_flow');
      await AsyncStorage.removeItem('payment_flow_timestamp');
      await AsyncStorage.removeItem('current_session_id');
      console.log('Payment Processing: Cleared payment flow flags');
    } catch (error) {
      console.log('Error clearing payment flow flags:', error);
    }
  }, []);

  // Handle authentication and start payment process
  useEffect(() => {
    const startPaymentProcess = async () => {
      // Check if we have required params
      const listingId = params.listingId as string;
      const total = params.total as string;
      
      console.log('Payment Processing: Checking params - listingId:', listingId, 'total:', total);
      
      if (!listingId || !total) {
        console.log('Missing required payment params, redirecting to home');
        router.replace('/(main-app)/home');
        return;
      }

      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        router.replace('/(auth)/sign-in');
        return;
      }

      // Only start payment if we're in idle state and haven't started yet
      if (paymentState === 'idle' && !isProcessingRef.current) {
        console.log('User is authenticated, starting payment process');
        await createCheckoutSession();
      } else {
        console.log('Payment already in progress or not in idle state, skipping');
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      startPaymentProcess();
    }, 100);

    return () => clearTimeout(timer);
  }, [params, paymentState, createCheckoutSession]);


  // Listen for deep links (when user returns from Stripe)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('Deep link received:', url);
      setIsReturningFromStripe(true);
      
      // Dismiss the WebBrowser if it's still open
      try {
        await WebBrowser.dismissBrowser();
        console.log('WebBrowser dismissed');
      } catch (error) {
        console.log('Error dismissing WebBrowser (may already be closed):', error);
      }
      
      if (url.includes('payment-success')) {
        // Extract session_id from URL
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId) {
          // Check if we've already processed this session to prevent duplicates
          if (processedSessionId === sessionId) {
            console.log('Session already processed, skipping:', sessionId);
            return;
          }
          
          console.log('Payment successful, verifying booking...');
          setProcessedSessionId(sessionId);
          setPaymentState('completed');
          await verifyPaymentAndCreateBooking(sessionId);
        }
      } else if (url.includes('payment-cancel')) {
        console.log('Payment cancelled via deep link');
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

  const verifyPaymentAndCreateBooking = useCallback(async (sessionId: string) => {
    try {
      console.log('Verifying payment for session:', sessionId);
      setIsProcessing(true);
      setPaymentError('');

      const functions = getFunctions();
      const verifyPayment = httpsCallable(functions, 'verifyPaymentAndCreateBooking');
      
      const result = await verifyPayment({ sessionId });
      const data = result.data as any;
      
      if (data.success) {
        console.log('Payment verified and booking created:', data.bookingId);
        if (data.isExisting) {
          console.log('Booking already existed, showing success anyway');
        }
        
        // Clear the payment flow flag
        await clearPaymentFlags();
        
        setShowSuccessModal(true);
        // Store booking ID for navigation after modal dismissal
        setBookingId(data.bookingId);
        
        // Auto-close modal after 3 seconds and navigate to home
        setTimeout(() => {
          setShowSuccessModal(false);
          router.replace({
            pathname: '/(main-app)/home',
            params: { 
              paymentSuccess: 'true', 
              bookingId: data.bookingId || '' 
            }
          });
        }, 3000);
      } else {
        // Handle different error types
        const errorMsg = data.error || 'Payment verification failed';
        const userFriendlyError = getErrorMessage(errorMsg);
        
        setErrorMessage(userFriendlyError);
        setShowErrorModal(true);
        setPaymentState('error');
        
        // Auto-close error modal after 4 seconds and go back
        setTimeout(async () => {
          setShowErrorModal(false);
          await clearPaymentFlags();
          router.replace('/(main-app)/home');
        }, 4000);
      }
    } catch (error) {
      console.log('Payment verification error:', error);
      const errorMsg = 'Failed to verify payment. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      setPaymentState('error');
      
      // Auto-close error modal after 4 seconds and go back
      setTimeout(async () => {
        setShowErrorModal(false);
        await clearPaymentFlags();
        router.replace('/(main-app)/home');
      }, 4000);
    } finally {
      setIsProcessing(false);
    }
  }, [clearPaymentFlags]);

  // Function to convert Stripe error codes to user-friendly messages
  const getErrorMessage = (error: string) => {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('card_declined')) {
      return 'Your card was declined. Please try a different payment method.';
    } else if (errorLower.includes('insufficient_funds')) {
      return 'Insufficient funds. Please check your account balance and try again.';
    } else if (errorLower.includes('incorrect_cvc') || errorLower.includes('cvc')) {
      return 'Incorrect CVC code. Please check your card details and try again.';
    } else if (errorLower.includes('expired_card')) {
      return 'Your card has expired. Please use a different payment method.';
    } else if (errorLower.includes('processing_error')) {
      return 'Payment processing error. Please try again later.';
    } else if (errorLower.includes('authentication_required')) {
      return 'Additional authentication required. Please complete the verification process.';
    } else {
      return 'Payment failed. Please try again or use a different payment method.';
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      {/* Payment Processing UI - only show if not returning from Stripe */}
      {!isReturningFromStripe && (
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
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                isProcessingRef.current = false;
                setPaymentState('idle');
                setIsProcessing(false);
                setPaymentError('');
                setCurrentSessionId(null);
                // Retry payment
                setTimeout(() => {
                  createCheckoutSession();
                }, 100);
              }}
            >
              <Text style={styles.retryButtonText}>Retry Payment</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Show processing when returning from Stripe */}
      {isReturningFromStripe && (
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color="#A6E66E" />
          </View>
          <Text style={styles.title}>Verifying Payment...</Text>
          <Text style={styles.subtitle}>
            Please wait while we verify your payment and create your booking
          </Text>
        </View>
      )}


      <Success
        visible={showSuccessModal}
        title="Payment Success!"
        buttonText=""
        onButtonPress={() => {}}
      />

      <Success
        visible={showErrorModal}
        title="Payment Failed"
        buttonText=""
        onButtonPress={() => {}}
        errorMessage={errorMessage}
      />
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
  retryButton: {
    backgroundColor: '#A6E66E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#1D234B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardInput: {
    backgroundColor: '#2A3062',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  amountContainer: {
    backgroundColor: 'rgba(166, 230, 110, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  amountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  amountValue: {
    color: '#A6E66E',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A3062',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#A6E66E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#1D234B',
    fontSize: 16,
    fontWeight: '600',
  },
});