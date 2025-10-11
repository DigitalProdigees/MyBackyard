import React, { useEffect } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import GradientButton from '../components/buttons/GradientButton';
import { Header } from '../components/Header';
import { authStyles } from './styles/auth.styles';
import { StyleSheet } from 'react-native';
import { BackButton } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');

export default function TermsAndConditions() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const fullName = params.fullName as string;
  const password = params.password as string;
  const isAdmin = (params.isAdmin as string) === 'true';

  // Redirect to signup if no email provided
  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/signup');
    }
  }, [email]);

  const handleAgree = async () => {
    // Ensure signup flow remains active as we proceed
    try {
      await AsyncStorage.setItem('signup_flow_active', 'true');
      await AsyncStorage.setItem('signup_user_type', isAdmin ? 'owner' : 'customer');
      console.log('✅ Signup flow flags maintained in terms screen');
    } catch (e) {
      console.warn('Failed to maintain signup flow flags in terms:', e);
    }
    
    router.push({
      pathname: '/(auth)/privacy-policy',
      params: {
        email: email,
        fullName: fullName,
        password: password,
        isAdmin: String(isAdmin)
      }
    });
  };

  return (
    <View style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <BackButton />
      <View style={styles.header}>
        <Text style={styles.headerText}>Terms & Conditions</Text>
        <Text style={styles.subHeaderText}>Last updated on Jan 12, 2024</Text>
      </View>

      <ScrollView style={styles.content}>


        <Text style={styles.paragraph}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum
        </Text>

        <Text style={styles.paragraph}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          text="Agree"
          onPress={handleAgree}
          containerStyle={styles.agreeButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 120,
    marginBottom: 24,
    paddingHorizontal: Math.min(width * 0.08, 30), // Responsive horizontal padding

  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    paddingHorizontal: Math.min(width * 0.08, 30), // Responsive horizontal padding
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  paragraph: {

    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 12,

  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  agreeButton: {
    width: '100%',
  },
}); 