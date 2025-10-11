import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  text: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export default function GradientButton({
  text,
  onPress,
  containerStyle,
  buttonStyle,
  textStyle,
  disabled = false,
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={['#AF70AF', '#2E225C', '#AF70AF']}
        start={{ x: 0.5257, y: -1.1167 }}
        end={{ x: 0.5257, y: 1 }}
        style={[styles.button, buttonStyle]}
      >
        <Text style={[styles.text, textStyle]}>
          {text}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 56,
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 