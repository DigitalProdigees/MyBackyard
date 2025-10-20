import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function GradientBackground() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          '#202857',
          '#202857',
          '#46B649',
          '#34A853',
          '#202857',
          '#202857'
        ]}
        style={StyleSheet.absoluteFill}
        start={[-0.9, -0.9]}
        end={[1.1, 0.3]}
        locations={[0, 0.1, 0.1, 0.45, 0.9, 0.1]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
