import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  Alert,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import GradientButton from '../components/buttons/GradientButton';
import { Header } from '../components/Header';
import { colors } from '../../theme/colors';
import { authStyles } from './styles/auth.styles';
import { Icons } from '../../constants/icons';
import { useFocusEffect } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { RESET_REDIRECT_URL } from '../../firebaseConfig';
import { useAppDispatch } from '../store/hooks';
import { sessionService } from '../lib/services/sessionService';
import { BackButton } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width, height } = Dimensions.get('window');

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const dispatch = useAppDispatch();

  // Reset loading state when component comes into focus (user navigates back)
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
      setLinkSent(false);
    }, [])
  );

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

  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Always validate as user types
    validateEmail(text);
  };

  const handleSendResetLink = async () => {
    const isEmailValid = validateEmail(email);
    if (!isEmailValid) return;

    try {
      setIsLoading(true);
      // Normalize email to reduce mismatches
      const normalizedEmail = email.trim().toLowerCase();
      console.log('ForgotPassword: projectId', (auth.app as any)?.options?.projectId);
      console.log('ForgotPassword: checking email', normalizedEmail);
      // STRICT: Only proceed if the email exists (and ideally supports password sign-in)
      let methods: string[] = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        console.log('ForgotPassword: sign-in methods', methods);
      } catch (e: any) {
        console.log('ForgotPassword: fetchSignInMethodsForEmail error', e?.code, e?.message);
        methods = [];
      }
      if (!methods || methods.length === 0) {
        console.log('ForgotPassword: no account found for email');
        setEmailError('This email is not registered to any account');
        setIsLoading(false);
        return;
      }
      if (!methods.includes('password')) {
        console.log('ForgotPassword: account exists but not password provider', methods);
        setEmailError('This email is registered but uses a different sign-in method');
        setIsLoading(false);
        return;
      }
      console.log('ForgotPassword: sending reset email...');
      // In-app flow via app scheme redirect page if provided
      const inAppUrl = ExpoLinking.createURL('/(auth)/reset-password');
      if (RESET_REDIRECT_URL) {
        // Your hosted page should read mode/oobCode and then `window.location.href = inAppUrl + '?oobCode=...'`
        await sendPasswordResetEmail(auth, normalizedEmail, {
          url: RESET_REDIRECT_URL,
          handleCodeInApp: true,
        } as any);
      } else {
        await sendPasswordResetEmail(auth, normalizedEmail);
      }
      console.log('ForgotPassword: reset email sent');
      setLinkSent(true);

      Alert.alert(
        'Reset link sent',
        'A password reset link has been sent to your email. Click the link to reset your password.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Email',
            onPress: async () => {
              try {
                if (Platform.OS === 'android') {
                  try { await Linking.openURL('https://mail.google.com'); return; } catch { }
                }
                const canMailto = await Linking.canOpenURL('mailto:');
                if (canMailto) {
                  await Linking.openURL('mailto:');
                } else {
                  await Linking.openURL('https://mail.google.com');
                }
              } catch { }
            },
          },
        ]
      );
    } catch (e: any) {
      console.log('ForgotPassword: send link error', e?.code, e?.message);
      if (e?.code === 'auth/user-not-found') {
        setEmailError('This email is not registered to any account');
      } else {
        Alert.alert('Error', 'Failed to send reset link. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <BackButton />

      <View
        style={authStyles.content}
      >
        <View style={{ flex: 1 }}>
          <View style={authStyles.header}>
            <Text style={authStyles.title}>Forgot Password</Text>
            <Text style={authStyles.subtitle}>
              {linkSent
                ? `We sent you the link to\n${email},\nplease check and click it to reset\nyour password`
                : 'Enter your email address and we\'ll send\nyou a link to reset your password'
              }
            </Text>
          </View>

          {!linkSent && (
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.inputLabel}>Email</Text>
              <View style={[authStyles.input, { flexDirection: 'row', alignItems: 'center' }]}>
                <Image
                  source={Icons.mail}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  placeholder="john.doe@example.com"
                  placeholderTextColor={colors.text.secondary}
                  value={email}
                  onChangeText={handleEmailChange}
                  style={authStyles.inputText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>
          )}
        </View>

        <View style={authStyles.footer}>
          <GradientButton
            text={
              isLoading
                ? "Sending..."
                : linkSent
                  ? "Resend the Link"
                  : "Send Reset Link"
            }
            onPress={handleSendResetLink}
            containerStyle={authStyles.loginButton}
            disabled={isLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#FF6B6B',
    fontSize: Math.min(width * 0.035, 14),
    fontFamily: 'System',
    marginTop: Math.min(height * 0.005, -10),
    marginLeft: Math.min(width * 0.02, 8),
  },
}); 