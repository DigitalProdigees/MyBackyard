import React from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import { GradientBackground } from './GradientBackground';
import { LoadingIndicator } from './LoadingIndicator';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ 
  visible, 
  message = 'Loading...', 
  transparent = false 
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType="fade"
    >
      <View style={[styles.overlay, transparent && styles.transparentOverlay]}>
        {!transparent && <GradientBackground />}
        <View style={styles.content}>
          <LoadingIndicator size="large" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  transparentOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    fontFamily: 'Urbanist-Medium',
  },
}); 