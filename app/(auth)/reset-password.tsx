import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import GradientButton from '../components/buttons/GradientButton';
import { Header } from '../components/Header';
import SuccessDialog from '../components/dialogs/SuccessDialog';
import { InputField } from '../components/InputField';
import { authStyles } from './styles/auth.styles';
import { BackButton } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useLocalSearchParams, router } from 'expo-router';

const { height } = Dimensions.get('window');

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const oobCode = (params?.oobCode as string) || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Restore all elements to their original positions when keyboard closes
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }, 100);
    });

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, []);



  const validateNewPassword = (password: string) => {
    if (!password.trim()) {
      setNewPasswordError('Password cannot be empty');
      return false;
    }
    if (password.length < 6) {
      setNewPasswordError('Password should be at least 6 characters long');
      return false;
    }
    setNewPasswordError('');
    return true;
  };

  const validateConfirmPassword = (password: string) => {
    if (!password.trim()) {
      setConfirmPasswordError('Password cannot be empty');
      return false;
    }
    if (password !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    if (text.length === 0) setNewPasswordError('Password cannot be empty');
    else if (text.length < 6) setNewPasswordError('Password should be at least 6 characters long');
    else setNewPasswordError('');
    // Re-validate confirm password when new password changes
    if (confirmPassword.trim()) {
      validateConfirmPassword(confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    // Clear confirm password error when user starts typing
    if (text.trim()) {
      setConfirmPasswordError('');
    }
    // Re-validate if both fields have content
    if (text.trim() && newPassword.trim()) {
      validateConfirmPassword(text);
    }
  };




  const handleSavePassword = async () => {
    const isNewPasswordValid = validateNewPassword(newPassword);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (isNewPasswordValid && isConfirmPasswordValid) {
      try {
        if (!oobCode) {
          try { await verifyPasswordResetCode(auth, ''); } catch { }
        }
        await confirmPasswordReset(auth, oobCode, newPassword);
        setShowSuccessDialog(true);
      } catch (e) {
        console.error('ResetPassword: confirm error', e);
      }
    }
  };

  const isFormValid = newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword;

  const handleSuccessDialogClose = async () => {
    setShowSuccessDialog(false);
    // Clear all form state
    setNewPassword('');
    setConfirmPassword('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Set a flag to prevent success dialogs during navigation
    await AsyncStorage.setItem('suppress_success_dialogs', 'true');

    // Clear any potential leftover state and navigate
    setTimeout(async () => {
      router.replace('/(auth)/sign-in');
      // Clear the suppression flag after navigation
      setTimeout(async () => {
        await AsyncStorage.removeItem('suppress_success_dialogs');
      }, 500);
    }, 100);
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      <BackButton />

      <View style={authStyles.content}>
        {/* Header */}
        <View style={authStyles.header}>
          <Text style={authStyles.title}>Reset Password</Text>
          <Text style={authStyles.subtitle}>Please enter a new password</Text>
        </View>

        {/* Scrollable input fields */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 220 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={authStyles.inputContainer}>
            <InputField
              label="New Password"
              placeholder="***********"
              value={newPassword}
              onChangeText={handleNewPasswordChange}

              secureTextEntry
              icon="lock"
            />
            {newPasswordError ? (
              <Text style={authStyles.errorText}>{newPasswordError}</Text>
            ) : null}

            <InputField
              label="Confirm New Password"
              placeholder="***********"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}

              secureTextEntry
              icon="lock"
            />
            {confirmPasswordError ? (
              <Text style={authStyles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Footer button stays static */}
        <View style={authStyles.footer}>
          <GradientButton
            text="Save New Password"
            onPress={handleSavePassword}
            containerStyle={authStyles.loginButton}
            buttonStyle={!isFormValid ? { opacity: 0.5 } : undefined}
            disabled={!isFormValid}
          />
        </View>
      </View>

      <SuccessDialog
        visible={showSuccessDialog}
        title="Password Changed Successfully!"
        buttonText="Back to Login"
        onButtonPress={handleSuccessDialogClose}
      />
    </SafeAreaView>
  );
}
