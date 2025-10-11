import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UnreadBannerProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function UnreadBanner({ count, size = 'small', position = 'top-right' }: UnreadBannerProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          fontSize: 10,
        };
      case 'medium':
        return {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          fontSize: 12,
        };
      case 'large':
        return {
          minWidth: 26,
          height: 26,
          borderRadius: 13,
          fontSize: 14,
        };
      default:
        return {
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          fontSize: 10,
        };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return {
          top: -6,
          right: -6,
        };
      case 'top-left':
        return {
          top: -6,
          left: -6,
        };
      case 'bottom-right':
        return {
          bottom: -6,
          right: -6,
        };
      case 'bottom-left':
        return {
          bottom: -6,
          left: -6,
        };
      default:
        return {
          top: -6,
          right: -6,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const positionStyles = getPositionStyles();

  return (
    <View style={[
      styles.banner,
      {
        minWidth: sizeStyles.minWidth,
        height: sizeStyles.height,
        borderRadius: sizeStyles.borderRadius,
        ...positionStyles,
      }
    ]}>
      <Text style={[
        styles.bannerText,
        { fontSize: sizeStyles.fontSize }
      ]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});