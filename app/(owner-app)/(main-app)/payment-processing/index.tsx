import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import Success from '@/app/components/dialogs/Success';
import { GradientBackground } from '@/app/components';
import { Icons } from '@/constants/icons';

export default function PaymentProcessing() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    // Show success modal after 7 seconds
    const timer = setTimeout(() => {
      setShowSuccessModal(true);
    }, 2000);

    return () => clearTimeout(timer);

  }, []);

  const handleComplete = () => {
    router.push('/(main-app)/home');
  };

  // Auto-navigate to home after 2 seconds when success dialog is shown
  useEffect(() => {
    if (showSuccessModal) {
      const navigationTimer = setTimeout(() => {
        setShowSuccessModal(false)

        router.push('/(main-app)/home');
      }, 2000);

      return () => clearTimeout(navigationTimer);
    }
  }, [showSuccessModal]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      {/* Payment Processing UI */}
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Image source={Icons.direct} style={styles.arrowIcon} />
        </View>
        <Text style={styles.title}>We direct to your payment getaway!</Text>
        <Text style={styles.subtitle}>We are waiting for you to complete the payment</Text>
      </View>

      <Success
        visible={showSuccessModal}
        title="Payment Success!"
        buttonText="Continue"
        onButtonPress={handleComplete}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 24,
    backgroundColor: 'rgba(18, 18, 66, 0.9)',
    borderRadius: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0F0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  successIcon: {
    width: 30,
    height: 30,
    tintColor: '#FFFFFF',
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }
}); 