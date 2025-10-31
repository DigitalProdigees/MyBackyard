import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../lib/hooks/useAuth';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import GradientButton from '../../components/buttons/GradientButton';
import { colors } from '../../../theme/colors';
import { GradientBackground } from '@/app/components/GradientBackground';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function PaymentSuccess() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Clear all payment-related data
  // No need to clear AsyncStorage - backend handles success/failure
  const clearPaymentFlags = useCallback(async () => {
    console.log('Payment Success: No AsyncStorage cleanup needed - backend handles state');
  }, []);

  // Verify payment and create booking
  const verifyPaymentAndCreateBooking = useCallback(async (sessionId: string) => {
    try {
      console.log('Verifying payment for session:', sessionId);
      
      const functions = getFunctions();
      const verifyPayment = httpsCallable(functions, 'verifyPaymentAndCreateBooking');
      
      const result = await verifyPayment({ sessionId });
      const data = result.data as any;
      console.log('Payment verification response:', data);

      if (data.success) {
        console.log('Payment verified and booking created:', data.bookingId);
        setBookingId(data.bookingId);
        setPaymentStatus('success');
        console.log('Payment Success: Payment successful, showing success screen');
      } else {
        console.log('Payment verification failed:', data.error);
        const userFriendlyError = typeof data.error === 'string' ? data.error : 'Payment verification failed. Please contact support.';
        setErrorMessage(userFriendlyError);
        setPaymentStatus('error');
        console.log('Payment Success: Payment failed, showing error screen');
      }
    } catch (error: any) {
      console.log('Payment verification error:', error);
      let errorMsg = 'Payment verification failed. Please contact support.';
      
      if (error?.code === 'functions/unauthenticated') {
        errorMsg = 'You must be logged in to verify payment. Please log in and try again.';
      } else if (error?.code === 'functions/invalid-argument') {
        errorMsg = 'Invalid payment session. Please try again.';
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      setPaymentStatus('error');
      console.log('Payment Success: Payment failed, showing error screen');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      console.log('Payment Success: Initializing component');
      
      // Get session_id from URL params
      const sessionId = params.session_id as string;
      
      if (sessionId) {
        console.log('Payment Success: Session ID found, verifying payment');
        await verifyPaymentAndCreateBooking(sessionId);
      } else {
        console.log('Payment Success: No session ID found, showing error');
        setErrorMessage('No payment session found. Please try again.');
        setPaymentStatus('error');
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [params.session_id, verifyPaymentAndCreateBooking]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner visible={true} />
        <Text style={styles.loadingText}>Verifying payment...</Text>
      </View>
    );
  }

  const handleGoHome = async () => {
    router.replace('/(main-app)/home');
  };

  const handleRetryPayment = () => {
    // Reset state and try again
    setPaymentStatus('loading');
    setIsLoading(true);
    setErrorMessage('');
    // Re-initialize the component
    const sessionId = params.session_id as string;
    if (sessionId) {
      verifyPaymentAndCreateBooking(sessionId);
    }
  };

  return (
    <View style={styles.container}>
        <GradientBackground/>
      {paymentStatus === 'success' && (
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>Your booking has been confirmed</Text>
          
          {bookingId && (
            <Text style={styles.bookingId}>Booking ID: {bookingId}</Text>
          )}
          
          <GradientButton
            text="Continue to Home"
            onPress={handleGoHome}
            containerStyle={styles.button}
          />
        </View>
      )}

      {paymentStatus === 'error' && (
        <View style={styles.content}>
          {/* Error Icon */}
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
          
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetryPayment}>
              <Text style={styles.retryButtonText}>Retry Payment</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#46B649',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIconText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  bookingId: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#46B649',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
