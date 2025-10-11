import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../components/GradientBackground';
import { Icons } from '../../../constants/icons';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function PaymentSuccess() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');
  const params = useLocalSearchParams();
  const sessionId = params.session_id as string;

  useEffect(() => {
    if (sessionId) {
      verifyPaymentAndCreateBooking();
    } else {
      setError('No payment session found');
      setIsProcessing(false);
    }
  }, [sessionId]);

  const verifyPaymentAndCreateBooking = async () => {
    try {
      console.log('Verifying payment for session:', sessionId);
      
      const functions = getFunctions();
      const verifyPayment = httpsCallable(functions, 'verifyPaymentAndCreateBooking');
      
      const result = await verifyPayment({ sessionId });
      const data = result.data as any;
      
      if (data.success) {
        console.log('Payment verified and booking created:', data.bookingId);
        // Redirect to home with success flag
        router.replace({
          pathname: '/(main-app)/home',
          params: { paymentSuccess: 'true', bookingId: data.bookingId }
        });
      } else {
        setError(data.error || 'Payment verification failed');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment');
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    router.replace('/(main-app)/home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          {isProcessing ? (
            <ActivityIndicator size="large" color="#A6E66E" />
          ) : (
            <Image source={Icons.direct} style={styles.successIcon} />
          )}
        </View>
        
        <Text style={styles.title}>
          {isProcessing ? 'Verifying Payment...' : error ? 'Payment Error' : 'Payment Successful!'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isProcessing 
            ? 'Please wait while we verify your payment and create your booking'
            : error 
            ? error
            : 'Your booking has been confirmed and will appear in My Bookings'
          }
        </Text>

        {!isProcessing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>
                {error ? 'Go to Home' : 'View My Bookings'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    tintColor: '#A6E66E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 40,
  },
  retryButton: {
    backgroundColor: '#A6E66E',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#1D234B',
    fontSize: 16,
    fontWeight: '600',
  },
});
