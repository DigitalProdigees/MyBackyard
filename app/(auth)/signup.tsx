import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Image,
} from 'react-native';
import { Keyboard } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import GradientButton from '../components/buttons/GradientButton';
import { InputField } from '../components/InputField';
import { authStyles } from './styles/auth.styles';
import { BackButton } from '../components';
import { Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

const { width, height } = Dimensions.get('window');

export default function SignUp() {
  const [fullName, setFullName] = useState(__DEV__ ? 'Tamoor' : '');
  const [email, setEmail] = useState(__DEV__ ? 'tam@gmail.com' : '');
  const [password, setPassword] = useState(__DEV__ ? '88888888' : '');
  const [confirmPassword, setConfirmPassword] = useState(__DEV__ ? '88888888' : '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const initialScrollPosition = useRef(0);

  // Validation states
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardOpen(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
      // Restore all elements to their original positions when keyboard closes
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Full name validation
  const validateFullName = (name: string) => {
    if (!name.trim()) {
      setFullNameError('Full name is required');
      return false;
    } else if (name.trim().length < 2) {
      setFullNameError('Full name must be at least 2 characters long');
      return false;
    } else {
      setFullNameError('');
      return true;
    }
  };

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

  // Confirm password validation
  const validateConfirmPassword = (confirmPass: string, originalPass: string) => {
    if (!confirmPass.trim()) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (confirmPass !== originalPass) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    } else {
      setConfirmPasswordError('');
      return true;
    }
  };

  // Handle full name change with validation
  const handleFullNameChange = (text: string) => {
    setFullName(text);
    // Always validate as user types
    validateFullName(text);
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
    // Also re-validate confirm password if it has an error
    if (confirmPasswordError && confirmPassword) {
      validateConfirmPassword(confirmPassword, text);
    }
  };

  // Handle confirm password change with validation
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    // Always validate as user types
    validateConfirmPassword(text, password);
  };

  // Handle field focus - show validation errors immediately
  const handleFullNameFocus = () => {
    if (fullName.trim()) {
      validateFullName(fullName);
    }
  };

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

  const handleConfirmPasswordFocus = () => {
    if (confirmPassword.trim()) {
      validateConfirmPassword(confirmPassword, password);
    }
  };

  const handleCreateAccount = async () => {
    // Validate all fields
    const isFullNameValid = validateFullName(fullName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password);

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return; // Don't proceed if validation fails
    }

    if (!termsAccepted || !privacyAccepted) {
      return;
    }

    setIsSigningUp(true);
    console.log('Creating account:', { email });

    try {
      // Check if email is already registered
      const normalizedEmail = email.trim().toLowerCase();
      try {
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        if (methods && methods.length > 0) {
          setEmailError('This email is already registered.');
          return;
        }
      } catch (e) {
        // If this fails, do not block the user; continue
      }
      // Mark signup flow active to influence post-auth navigation
      try { 
        await AsyncStorage.setItem('signup_flow_active', 'true'); 
        await AsyncStorage.setItem('signup_user_type', isAdmin ? 'owner' : 'customer');
        console.log('✅ Signup flow flags set in signup component');
      } catch (e) { 
        console.warn('Failed to set signup flow flags in signup:', e); 
      }
      // Do not create the user yet; follow terms -> privacy -> success flow
      router.push({ pathname: '/(auth)/terms-conditions', params: { email, fullName, password, isAdmin: String(isAdmin) } });
    } catch (error) {
      console.log('Signup nav error:', error);
      setEmailError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsSigningUp(false);
    }
  };

  const isFormValid = fullName.trim() && email.trim() && password.trim() &&
    confirmPassword.trim() && termsAccepted && privacyAccepted &&
    password === confirmPassword && !fullNameError && !emailError &&
    !passwordError && !confirmPasswordError;

  return (
    <View style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={authStyles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Get Started</Text>
          <Text style={styles.subtitle}>Create an account to continue</Text>
        </View>

        {/* Scrollable input fields */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            {/* Admin Toggle - visible immediately */}
            <View style={[styles.checkboxRow1, { marginBottom: Math.min(height * 0.02, 1), marginTop: 20 }]}>
              <Text style={styles.checkboxText}>Owner</Text>
              <Switch value={isAdmin} onValueChange={setIsAdmin} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.fieldContainer}>
                <InputField
                  label="Full Name"
                  placeholder="Enter name"
                  value={fullName}
                  onChangeText={handleFullNameChange}
                  onFocus={handleFullNameFocus}
                  icon="icU"
                />
                {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}
              </View>

              <View style={styles.fieldContainer}>
                <InputField
                  label="Email"
                  placeholder="Enter email"
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={handleEmailFocus}
                  icon="mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.fieldContainer}>
                <InputField
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  onFocus={handlePasswordFocus}
                  secureTextEntry
                  icon="lock"
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              <View style={styles.fieldContainer}>
                <InputField
                  label="Confirm Password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  onFocus={handleConfirmPasswordFocus}
                  secureTextEntry
                  icon="lock"
                />
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
              </View>
            </View>

            {/* Checkboxes */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxFilled
                ]}>
                  {termsAccepted && (
                    <Image
                      source={require('../../assets/icons/icc.png')}
                      style={styles.checkmarkImage}
                    />
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  By sign up I agree with Terms and Conditions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
              >
                <View style={[
                  styles.checkbox,
                  privacyAccepted && styles.checkboxFilled
                ]}>
                  {privacyAccepted && (
                    <Image
                      source={require('../../assets/icons/icc.png')}
                      style={styles.checkmarkImage}
                    />
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  By sign up I agree with Privacy and Policy
                </Text>
              </TouchableOpacity>


            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer button stays static */}
        <View style={styles.footerInner}>
          <GradientButton
            text={isSigningUp ? "Creating Account..." : "Create Account Now"}
            onPress={handleCreateAccount}
            containerStyle={styles.createAccountButton}
            buttonStyle={!isFormValid ? { opacity: 0.5 } : undefined}
            disabled={!isFormValid || isSigningUp}
          />

          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.signInLinkText}>
              Already have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </View>
      {/* Pinned footer - keep above keyboard */}
      <View pointerEvents="box-none" style={styles.footer}>
        <View style={{ height: 0 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Math.min(height * 0.01, 8),
    marginTop: Math.min(height * 0.01, -10),
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Urbanist-Bold',
    fontSize: Math.min(width * 0.08, 34),
    color: '#FFFFFF',
    marginBottom: Math.min(height * 0.01, 8),
    lineHeight: Math.min(width * 0.09, 41),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: Math.min(width * 0.04, 18),
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: Math.min(width * 0.05, 22),
    textAlign: 'center',
  },
  inputContainer: {
    marginTop: Math.min(height * 0.01, -20)
  },
  fieldContainer: {
    marginBottom: Math.min(height * 0.01, 8),
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: Math.min(width * 0.035, 14),
    fontFamily: 'System',
    marginTop: Math.min(height * 0.005, 4),
    marginLeft: Math.min(width * 0.02, 8),
  },
  checkboxContainer: {
    marginTop: Math.min(height * 0.03, 24),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.min(height * 0.02, 16),
  },
  checkboxRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Math.min(height * 0.02, 16),
    alignSelf: 'flex-end'
  },
  checkbox: {
    width: Math.min(width * 0.05, 20),
    height: Math.min(width * 0.05, 20),
    borderRadius: Math.min(width * 0.025, 10),
    borderWidth: 2,
    borderColor: '#BADA8B',
    marginRight: Math.min(width * 0.03, 12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxFilled: {
    backgroundColor: '#CCCCCC',
  },
  checkmarkImage: {
    width: Math.min(width * 0.05, 20),
    height: Math.min(width * 0.05, 20),
    resizeMode: 'contain',
  },
  checkmark: {
    width: Math.min(width * 0.03, 12),
    height: Math.min(width * 0.025, 10),
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#46B649',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: Math.min(width * 0.035, 14),
    fontFamily: 'Urbanist-Regular',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    width: '100%',
    paddingBottom: Math.min(height * 0.03, 24),
  },
  footerInner: {
    alignItems: 'center',
    marginTop: Math.min(height * 0.06, 36),
    marginBottom: Math.min(height * 0.06, 36),
    width: '100%',
  },
  createAccountButton: {
    width: '100%',
    height: Math.min(height * 0.07, 56),
  },
  signInLink: {
    marginTop: Math.min(height * 0.02, 5),
    alignItems: 'center',
  },
  signInLinkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Math.min(width * 0.035, 22),
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
  },
  signInLinkBold: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    textDecorationLine: 'underline',

  },
}); 