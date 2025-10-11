import React, { useState } from 'react';
import {
	View,
	Text,
	Platform,
	Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { authStyles } from '@/app/(auth)/styles/auth.styles';
import { BackButton, GradientBackground, GradientButton } from '@/app/components';
import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/app/lib/firebase';
import { RESET_REDIRECT_URL } from '../../../../firebaseConfig';

export default function ResetPassword() {
	const email = auth.currentUser?.email || '';
	const [isLoading, setIsLoading] = useState(false);
	const [linkSent, setLinkSent] = useState(false);

	const handleSendResetLink = async () => {
		if (!email) {
			Alert.alert('No email', 'No email found for your account.');
			return;
		}
		if (isLoading) return;
		try {
			setIsLoading(true);
			const inAppUrl = ExpoLinking.createURL('/(auth)/reset-password');
			if (RESET_REDIRECT_URL) {
				await sendPasswordResetEmail(auth, email, { url: RESET_REDIRECT_URL, handleCodeInApp: true } as any);
			} else {
				await sendPasswordResetEmail(auth, email);
			}
			setLinkSent(true);
			Alert.alert(
				'Reset link sent',
				'A password reset link has been sent to your email. Click it to reset your password.',
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
						}
					}
				]
			);
		} catch (e: any) {
			Alert.alert('Error', 'Failed to send reset link. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	React.useEffect(() => {
		handleSendResetLink();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<View style={authStyles.container}>
			<StatusBar style="light" />
			<GradientBackground />
			<BackButton />

			<View style={[authStyles.content, { flex: 1 }]}>
				<View style={authStyles.header}>
					<Text style={authStyles.title}>Reset Password</Text>
					<Text style={authStyles.subtitle}>
						{linkSent
							? `We sent you the link to\n${email},\nplease check and click it to reset\nyour password`
							: `We will send a reset link to\n${email}\nTap the button below.`}
					</Text>
				</View>

				<View style={[authStyles.footer, { flex: 1, justifyContent: 'flex-end', paddingBottom: 50 }]}>
					<GradientButton
						text={isLoading ? 'Sending...' : linkSent ? 'Reset Password' : 'Send Reset Link'}
						onPress={handleSendResetLink}
						containerStyle={authStyles.loginButton}
						disabled={isLoading}
					/>
				</View>
			</View>
		</View>
	);
}
