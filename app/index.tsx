import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from './lib/theme';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function HomeScreen() {
  useEffect(() => {
    // checkOnboarding();
  }, []);

  // const checkOnboarding = async () => {
  //   try {
  //     const onboarded = await AsyncStorage.getItem('onboarded');
  //     if (onboarded !== 'true') {
  //       router.replace('/(onboarding)');
  //     }
  //   } catch (error) {
  //     console.log('Error checking onboarding status:', error);
  //   }
  // };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyBackyard</Text>
      <Text style={styles.subtitle}>Welcome to your new app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
  },
}); 