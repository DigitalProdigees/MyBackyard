import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../../../components/GradientBackground';
import { colors } from '../../../../theme/colors';

export default function PaymentSuccess() {
  const params = useLocalSearchParams();
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    console.log('Payment Success: Component mounted with params:', params);
    
    // Get booking ID from params if available
    if (params.bookingId) {
      setBookingId(params.bookingId as string);
    }
  }, [params]);

  const handleContinueToHome = () => {
    console.log('Payment Success: Continuing to home');
    router.replace('/(main-app)/home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        
        <Text style={styles.title}>Payment Successful!</Text>
        
        <Text style={styles.subtitle}>
          Your booking has been confirmed and payment processed successfully.
        </Text>
        
        {bookingId && (
          <Text style={styles.bookingId}>
            Booking ID: {bookingId}
          </Text>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={handleContinueToHome}
          >
            <Text style={styles.homeButtonText}>Continue to Home</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(166, 230, 110, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    fontSize: 48,
    color: '#A6E66E',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  bookingId: {
    fontSize: 14,
    color: '#A6E66E',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  homeButton: {
    backgroundColor: '#A6E66E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#1D234B',
    fontSize: 16,
    fontWeight: '600',
  },
});