import React from 'react';
import { Platform } from 'react-native';
import AndroidPaymentProcessing from './AndroidPaymentProcessing';
import IOSPaymentProcessing from './iOSPaymentProcessing';

export default function PaymentProcessing() {
  // Use platform-specific components to avoid conflicts
  if (Platform.OS === 'android') {
    return <AndroidPaymentProcessing />;
  } else if (Platform.OS === 'ios') {
    return <IOSPaymentProcessing />;
        } else {
    // Fallback for web or other platforms - use iOS component as default
    return <IOSPaymentProcessing />;
  }
}