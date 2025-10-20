import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import { BackButton } from '../components/BackButton';
import { InputField } from '../components/InputField';
import { ForgotPasswordLink } from '../components/ForgotPasswordLink';
import { SignUpLink } from '../components/SignUpLink';
import GradientButton from '../components/buttons/GradientButton';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, rtdb } from '../lib/firebase';
import { ref, get } from 'firebase/database';

const { width, height } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set development values after component mounts to prevent flash
  useEffect(() => {
    if (__DEV__) {
      setEmail('tam@gmail.com');
      setPassword('88888888');
      // Uncomment the line below to reset onboarding for testing
      // AsyncStorage.removeItem('onboarded');
    }
  }, []);

  // Navigation is handled by the root layout (_layout.tsx) based on user type
  // No need to redirect here as it would override the proper role-based routing

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };

  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Always validate as user types
    validateEmail(text);
  };

  // Handle password change with validation
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Always validate as user types
    validatePassword(text);
  };

  // Handle field focus - show validation errors immediately
  const handleEmailFocus = () => {
    if (email.trim()) {
      validateEmail(email);
    }
  };

  const handlePasswordFocus = () => {
    if (password.trim()) {
      validatePassword(password);
    }
  };

  const handleEmailSignIn = async () => {
    // Validate both fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return; // Don't proceed if validation fails
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim();
      console.log('🔐 Attempting to sign in with email:', normalizedEmail);
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('✅ Sign in successful, auth hook will handle navigation');
      // Auth hook will handle navigation automatically
    } catch (error: any) {
      console.log('❌ Sign in failed:', error);
      const code = error?.code as string | undefined;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        Alert.alert('Login Failed', 'Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Login Failed', 'Too many attempts. Try again later.');
      } else if (code === 'auth/network-request-failed') {
        Alert.alert('Network Error', 'Please check your internet connection.');
      } else {
        Alert.alert('Login Failed', 'Unable to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (email.trim()) {
      router.push({
        pathname: '/(auth)/forgot-password',
        params: { email: email.trim() }
      });
    } else {
      router.push('/(auth)/forgot-password');
    }
  };

  const handleNavigateToSignUp = () => {
    router.push('/signup');
  };

  return (
    <View style={styles.container}>
      <GradientBackground />
      <StatusBar style="light" translucent backgroundColor="transparent" animated={true} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Hi, Welcome Back</Text>
          <Text style={styles.subtitle}>Please to see you!</Text>
        </View>


        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        ><ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

            <View >
              <View style={styles.inputContainer}>
                <InputField
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={handleEmailFocus}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <InputField
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  secureTextEntry
                  icon="lock"
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              <ForgotPasswordLink onPress={handleForgotPassword} />
            </View>


          </ScrollView></KeyboardAvoidingView>
        <GradientButton
          text="Login"
          onPress={handleEmailSignIn}
          containerStyle={styles.loginButton}
          disabled={isLoading}
        />
        <View style={styles.buttons}>
          <SignUpLink onPress={handleNavigateToSignUp} />
          <View style={styles.buttonSpacing} />
        </View>

        {/* Centered Loader Overlay */}
        {isLoading && (
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderContainer}>
              <LoadingIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loaderText}>Signing you in...</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: Math.min(width * 0.08, 32), // Responsive horizontal padding
    paddingTop: Math.min(height * 0.12, 80), // Responsive top padding
  },
  header: {
    alignItems: 'center',
    marginTop: Math.min(height * 0.05, 40), // Responsive top margin
    marginBottom: Math.min(height * 0.05, 40), // Responsive margin
  },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: Math.min(width * 0.08, 32), // Responsive font size
    color: '#FFFFFF',
    marginBottom: Math.min(height * 0.01, 8),
    lineHeight: Math.min(width * 0.09, 38),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'System',
    fontWeight: 'normal',
    fontSize: Math.min(width * 0.045, 16),
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: Math.min(width * 0.055, 20),
    textAlign: 'center',
  },
  form: {
    paddingVertical: Math.min(height * 0.02, 20), // Responsive padding
  },
  inputContainer: {
    marginBottom: Math.min(height * 0.01, 8),
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: Math.min(width * 0.035, 14),
    fontFamily: 'System',
    marginTop: Math.min(height * 0.005, 4),
    marginLeft: Math.min(width * 0.02, 8),
  },
  buttons: {
    paddingBottom: Math.min(height * 0.04, 32), // Responsive bottom padding
  },
  loginButton: {
    width: '100%',
    height: Math.min(height * 0.07, 56), // Responsive button height
    marginBottom: Math.min(height * 0.01, 8), // Responsive margin
  },
  secondaryButton: {
    width: '100%',
    height: Math.min(height * 0.07, 56), // Responsive button height
  },
  buttonSpacing: {
    height: Math.min(height * 0.02, 16), // Responsive spacing
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Light grey overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    paddingHorizontal: Math.min(width * 0.08, 32),
    paddingVertical: Math.min(height * 0.03, 24),
    borderRadius: 12,
    alignItems: 'center',
    minWidth: Math.min(width * 0.6, 200),
  },
  loaderText: {
    color: '#FFFFFF',
    fontSize: Math.min(width * 0.045, 18),
    fontFamily: 'System',
    marginTop: Math.min(height * 0.015, 12),
    fontWeight: '500',
  },
}); 