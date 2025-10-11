import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	KeyboardAvoidingView,
	Platform,
	TextInput,
	Image,
	Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../components/GradientBackground';
import GradientButton from '../components/buttons/GradientButton';
import { Header } from '../components/Header';
import { colors } from '../../theme/colors';
import { authStyles } from './styles/auth.styles';
import { Icons } from '../../constants/icons';
import { BackButton } from '../components';

const { width, height } = Dimensions.get('window');
const ratio = Math.min(width, height) / 375; // Base ratio for responsive scaling

export default function OypVerification() {
	const params = useLocalSearchParams();
	const email = params.email as string;

	const [verificationCode, setVerificationCode] = useState(['', '', '', '', '']);
	const [timeLeft, setTimeLeft] = useState(20);
	const [canResend, setCanResend] = useState(false);
	const [isTimerExpired, setIsTimerExpired] = useState(false);
	const inputRefs = useRef<Array<TextInput | null>>([]);

	// Redirect to signup if no email provided
	useEffect(() => {
		if (!email) {
			router.replace('/(auth)/signup');
		}
	}, [email]);

	// Function to censor email (show first 3 chars + *** + domain)
	const getCensoredEmail = (email: string) => {
		if (!email || !email.includes('@')) return 'user@***.com';

		const [localPart, domain] = email.split('@');
		if (localPart.length <= 3) {
			return `${localPart}@***.${domain.split('.').pop()}`;
		}
		return `${localPart.substring(0, 3)}***@***.${domain.split('.').pop()}`;
	};

	useEffect(() => {
		if (timeLeft > 0) {
			const timer = setTimeout(() => {
				setTimeLeft(timeLeft - 1);
			}, 1000);
			return () => clearTimeout(timer);
		} else {
			setCanResend(true);
			setIsTimerExpired(true);
		}
	}, [timeLeft]);

	const handleVerification = () => {
		const code = verificationCode.join('');
		// TODO: Implement verification logic
		// Navigate to verification success screen
		router.push({
			pathname: '/(auth)/verification-success',
			params: {
				email: email,
				fullName: params.fullName as string,
				password: params.password as string
			}
		});
	};

	const handleResend = () => {
		// TODO: Implement resend logic with email
		console.log('Resending code to:', email);
		setTimeLeft(20);
		setCanResend(false);
		setIsTimerExpired(false);
		// Reset verification code
		setVerificationCode(['', '', '', '', '']);
		// Focus first input
		inputRefs.current[0]?.focus();
	};

	const handleCodeChange = (text: string, index: number) => {
		if (text.length <= 1) {
			const newCode = [...verificationCode];
			newCode[index] = text;
			setVerificationCode(newCode);

			// Auto-focus next input
			if (text.length === 1 && index < 4) {
				inputRefs.current[index + 1]?.focus();
			}
		}
	};

	const handleKeyPress = (e: any, index: number) => {
		// Handle backspace - clear current input and move to previous
		if (e.nativeEvent.key === 'Backspace') {
			if (verificationCode[index] !== '') {
				// If current input has text, clear it first
				const newCode = [...verificationCode];
				newCode[index] = '';
				setVerificationCode(newCode);
			}
			// Always move to previous input after backspace (if not first input)
			if (index > 0) {
				inputRefs.current[index - 1]?.focus();
			}
		}
	};

	const handleInputFocus = (index: number) => {
		// When focusing an input, if it has a value and user wants to edit, 
		// select all text for easy replacement
		if (verificationCode[index]) {
			inputRefs.current[index]?.setNativeProps({
				selection: { start: 0, end: verificationCode[index].length }
			});
		}
	};

	const handleBackspace = (index: number) => {
		// Handle backspace - move to previous input when current is empty
		if (verificationCode[index] === '' && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	// Check if all inputs are filled
	const isAllInputsFilled = verificationCode.every(digit => digit !== '');

	return (
		<View style={authStyles.container}>
			<StatusBar style="light" />
			<GradientBackground />

			<BackButton />
			<KeyboardAvoidingView
				style={authStyles.content}
			>
				<View style={{ flex: 1 }}>
					<View style={authStyles.header}>
						<Text style={authStyles.title}>Verify your Email</Text>
						<Text style={authStyles.subtitle}>
							We already sent a code to your email {email} Please input the code below to confirm your email address
						</Text>

					</View>

					<View style={[authStyles.inputContainer, { flexDirection: 'row', justifyContent: 'space-between' }]}>
						{verificationCode.map((digit, index) => (
							<TextInput
								key={index}
								ref={(ref) => {
									inputRefs.current[index] = ref;
								}}
								style={[authStyles.input, {
									width: Math.min(width * 0.157, 59),
									height: Math.min(height * 0.07, 56),
									textAlign: 'center',
									color: '#FFFFFF',
									fontSize: Math.min(width * 0.064, 24),
									fontFamily: 'Urbanist-Bold',
									opacity: isTimerExpired ? 0.5 : 1
								}]}
								value={digit}
								onChangeText={(text) => handleCodeChange(text, index)}
								onKeyPress={(e) => handleKeyPress(e, index)}
								onFocus={() => handleInputFocus(index)}
								onBlur={() => handleBackspace(index)}
								keyboardType="number-pad"
								maxLength={1}
								editable={!isTimerExpired}
							/>
						))}
					</View>

					<View style={{ alignItems: 'center', marginTop: Math.min(height * 0.03, 24) }}>
						{!canResend ? (
							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<Image
									source={Icons.timer}
									style={{
										width: Math.min(width * 0.053, 20),
										height: Math.min(width * 0.053, 20),
										marginRight: Math.min(width * 0.021, 8),
										resizeMode: 'contain',
										tintColor: '#FFFFFF'
									}}
								/>
								<Text style={[authStyles.subtitle, { fontSize: Math.min(width * 0.043, 16) }]}>
									{`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
								</Text>
							</View>
						) : (
							<Text
								onPress={handleResend}
								style={[authStyles.subtitle, {
									fontSize: Math.min(width * 0.043, 16),
									textDecorationLine: 'underline',
								}]}
							>
								Resend Code
							</Text>
						)}
					</View>
				</View>

				<View style={authStyles.footer}>
					<GradientButton
						text="Confirm Now"
						onPress={handleVerification}
						containerStyle={authStyles.loginButton}
						buttonStyle={!isAllInputsFilled ? { opacity: 0.5 } : undefined}
						disabled={!isAllInputsFilled}
					/>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}
