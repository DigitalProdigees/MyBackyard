import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface CircleButtonProps {
  icon: any;
  onPress?: () => void;
  style?: any;
}

export const CircleButton = ({ icon, onPress, style }: CircleButtonProps) => {
  return (
    <View style={styles.circleButtonOuterContainer}>
      <TouchableOpacity
        style={[styles.circleButtonContainer, style]}
        onPress={onPress}
      >
        <Image source={icon} style={styles.circleButtonIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  circleButtonOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonContainer: {
    backgroundColor: '#222952',
    borderRadius: 100,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  circleButtonIcon: {
    height: 20,
    width: 20
  },
});

export default CircleButton; 