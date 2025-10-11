import React from 'react';
import { View, StyleSheet, Text, Image, ImageSourcePropType, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../../theme/colors';

interface SocialLoginButtonProps {
  icon: ImageSourcePropType;
  title: string;
  onPress: () => void;
}

export const SocialLoginButton = ({ icon, title, onPress }: SocialLoginButtonProps) => (
  <Pressable onPress={onPress}>
    <BlurView intensity={17} tint="dark" style={styles.socialButtonContainer}>
      <View style={styles.socialButtonContent}>
        <Image source={icon} style={styles.socialIcon} />
        <Text style={styles.socialButtonText}>{title}</Text>
      </View>
    </BlurView>
  </Pressable>
);

const styles = StyleSheet.create({
  socialButtonContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    height: 72,
    width: '100%',
  },
  socialButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 24,
  },
  socialIcon: {
    resizeMode: 'contain',
    position: 'absolute',
    left: 40,
    width: 24,
    height: 24,
  },
  socialButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    width: '100%',
    textAlign: 'left',
    paddingLeft: 70,
  },
}); 