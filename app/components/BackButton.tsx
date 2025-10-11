import React from 'react';
import { TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Icons } from '../../constants/icons';

const { width, height } = Dimensions.get('window');

interface BackButtonProps {
	onPress?: () => void;
	style?: any;
}

export function BackButton({ onPress, style }: BackButtonProps) {
	const handlePress = () => {
		if (onPress) {
			onPress();
		} else {
			router.back();
		}
	};

	return (
		<TouchableOpacity style={[styles.backButton, style]} onPress={handlePress}>
			<Image source={Icons.back} style={styles.icon} />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	backButton: {
		position: 'absolute',
		top: 60, // Responsive top position
		left: Math.min(width * 0.08, 30), // Responsive left position
		zIndex: 1,
		width: Math.min(width * 0.12, 44), // Responsive width
		height: Math.min(width * 0.12, 44), // Responsive height
		borderRadius: Math.min(width * 0.06, 22), // Responsive border radius
		justifyContent: 'center',
		alignItems: 'center',
	},
	icon: {
		width: Math.min(width * 0.17, 80), // Responsive icon width
		height: Math.min(width * 0.17, 80), // Responsive icon height
	},
});
