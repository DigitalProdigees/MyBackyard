import React from 'react';
import { StyleSheet, Text, Image, Pressable, ImageSourcePropType } from 'react-native';

interface SocialButtonProps {
  icon: ImageSourcePropType;
  title: string;
  onPress: () => void;
}

export function SocialButton({ icon, title, onPress }: SocialButtonProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Image source={icon} style={styles.icon} />
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  text: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
}); 