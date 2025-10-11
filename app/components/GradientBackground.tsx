import React from 'react';
import { StyleSheet, View } from 'react-native';
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
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 1.2, y: 0.9 }}
        locations={[0, 0.3, 0.5, 0.65, 0.9, 0.9]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
}); 