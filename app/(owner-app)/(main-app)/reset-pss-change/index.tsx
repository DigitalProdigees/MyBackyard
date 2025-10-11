import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authStyles } from '@/app/(auth)/styles/auth.styles';
import { BackButton, GradientBackground, GradientButton, InputField, SuccessDialog } from '@/app/components';
import Success from '@/app/components/dialogs/Success';


export default function ResetPassword() {
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showSuccessDialog, setShowSuccessDialog] = useState(false);
	const [newPasswordError, setNewPasswordError] = useState('');
	const [confirmPasswordError, setConfirmPasswordError] = useState('');
	const scrollViewRef = useRef<ScrollView>(null);

	useEffect(() => {
		const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
			// Auto-scroll to bottom when keyboard opens
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		});

		return () => {
			keyboardDidShowListener?.remove();
		};
	}, []);

	// Auto-navigate back to notifications after 2 seconds when success dialog shows
	useEffect(() => {
		if (showSuccessDialog) {
			const timer = setTimeout(() => {
				setShowSuccessDialog(false);
				router.push('../notifications');
			}, 2000);

			return () => clearTimeout(timer);
		}
	}, [showSuccessDialog]);

	const validateNewPassword = (password: string) => {
		if (!password.trim()) {
			setNewPasswordError('Password cannot be empty');
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
		// Clear new password error when user starts typing
		if (text.trim()) {
			setNewPasswordError('');
		}
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

	const handleConfirmPasswordFocus = () => {
		// Auto-scroll to EXACTLY the same position as keyboardDidShow event
		setTimeout(() => {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}, 100);
	};


	const handleSavePassword = () => {
		const isNewPasswordValid = validateNewPassword(newPassword);
		const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

		if (isNewPasswordValid && isConfirmPasswordValid) {
			console.log('Saving new password:', newPassword);
			setShowSuccessDialog(true);
		}
	};

	const isFormValid = newPassword.trim() && confirmPassword.trim() && newPassword === confirmPassword;

	const handleSuccessDialogClose = () => {
		setShowSuccessDialog(false);
		router.replace('/(auth)/sign-in');
	};

	return (
		<View style={authStyles.container}>
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
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
				>
					<ScrollView
						contentContainerStyle={{ paddingBottom: 140 }}
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
								onFocus={handleConfirmPasswordFocus}
								secureTextEntry
								icon="lock"
							/>
							{confirmPasswordError ? (
								<Text style={authStyles.errorText}>{confirmPasswordError}</Text>
							) : null}
						</View>
					</ScrollView>
				</KeyboardAvoidingView>

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

			<Success
				visible={showSuccessDialog}
				title="Your Password Changed!"
				buttonText="Back to Login"
				onButtonPress={handleSuccessDialogClose}
			/>
		</View>
	);
}
