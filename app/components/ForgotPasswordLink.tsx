import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ForgotPasswordLinkProps {
	onPress: () => void;
	style?: any;
}

export function ForgotPasswordLink({ onPress, style }: ForgotPasswordLinkProps) {
	return (
		<TouchableOpacity style={[styles.container, style]} onPress={onPress}>
			<Text style={styles.text}>Forgot Password?</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		alignSelf: 'flex-end',
		marginTop: 8,
		marginBottom: 24,
	},
	text: {
		color: '#FFFFFF',
		fontFamily: 'Urbanist-Medium',
		fontSize: 14,
		textDecorationLine: 'underline',
	},
});
