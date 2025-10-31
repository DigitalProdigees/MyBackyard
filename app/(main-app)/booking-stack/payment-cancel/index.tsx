import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../../components/GradientBackground';
import { Icons } from '../../../../constants/icons';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function PaymentCancel() {
  const handleGoHome = () => {
    router.replace('/(main-app)/home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Image source={Icons.direct} style={styles.cancelIcon} />
        </View>
        
        <Text style={styles.title}>Payment Cancelled</Text>
        
        <Text style={styles.subtitle}>
          Your payment was cancelled. No charges have been made to your account.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Home</Text>
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
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIcon: {
    width: 80,
    height: 80,
    tintColor: '#FF6B6B',
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
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#2A3062',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
