import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GradientButton from '../buttons/GradientButton';
import { colors } from '../../../theme/colors';

interface SuccessDialogProps {
	visible: boolean;
	title: string;
	buttonText: string;
	onButtonPress: () => void;
	errorMessage?: string;
}

export default function Success({
	visible,
	title,
	buttonText,
	onButtonPress,
	errorMessage,
}: SuccessDialogProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
		>
			<View style={styles.overlay}>
				<BlurView intensity={10} tint="dark" style={styles.blurContainer}>
					<View style={styles.dialogContainer}>
						<LinearGradient
							colors={[
								'#202857',
								'#202857',
								'#46B649',
								'#34A853',
								'#202857',
								'#202857'
							]}
							style={StyleSheet.absoluteFill}
							start={{ x: -0.9, y: -0.9 }}
							end={{ x: 1.1, y: 0.3 }}
							locations={[0, 0.1, 0.1, 0.45, 0.9, 0.1]}
						/>
						<View style={styles.content}>
							{/* Success/Error Icon Circle */}
							<View style={[styles.iconCircle, errorMessage && styles.errorIconCircle]}>
								{errorMessage ? (
									<Text style={styles.errorIcon}>✕</Text>
								) : (
									<View style={styles.checkmark} />
								)}
							</View>

							{/* Title */}
							<Text style={styles.title}>{title}</Text>

							{/* Error Message */}
							{errorMessage && (
								<Text style={styles.errorMessage}>{errorMessage}</Text>
							)}

							{/* Button - only show if buttonText is provided */}
							{buttonText && (
								<GradientButton
									text={buttonText}
									onPress={onButtonPress}
									buttonStyle={styles.button}
								/>
							)}

						</View>
					</View>
				</BlurView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
	},
	blurContainer: {
		width: '80%',
		maxWidth: 300,
		borderRadius: 20,
	},
	dialogContainer: {
		width: '100%',
		aspectRatio: 1.2,
		borderRadius: 20,
		overflow: 'hidden',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		top: 15
	},
	iconCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#46B649',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	checkmark: {
		width: 44,
		height: 20,
		borderBottomWidth: 6,
		borderLeftWidth: 6,
		borderColor: 'white',
		transform: [{ rotate: '-45deg' }],
		marginTop: -4,
	},
	title: {
		color: colors.text.primary,
		fontSize: 24,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 32,
	},
	button: {
		width: '100%',
		marginBottom:20,
	},
	errorIconCircle: {
		backgroundColor: '#FF6B6B',
	},
	errorIcon: {
		color: 'white',
		fontSize: 32,
		fontWeight: 'bold',
	},
	errorMessage: {
		color: colors.text.secondary,
		fontSize: 16,
		textAlign: 'center',
		marginTop: 16,
		marginBottom: 24,
		lineHeight: 22,
	},
}); 