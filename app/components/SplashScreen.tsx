import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MyBackyard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
}); 