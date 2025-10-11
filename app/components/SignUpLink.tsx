import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SignUpLinkProps {
  onPress: () => void;
  style?: any;
}

export function SignUpLink({ onPress, style }: SignUpLinkProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        Don't have an account?{' '}
        <Text style={styles.linkText} onPress={onPress}>
          Sign Up
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  text: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Urbanist-Regular',
    fontSize: Math.min(width * 0.04, 16), // Responsive font size
  },
  linkText: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-SemiBold',
    fontSize: Math.min(width * 0.04, 16), // Responsive font size
    textDecorationLine: 'underline',
  },
});
