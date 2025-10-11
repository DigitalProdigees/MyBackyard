import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { Icons } from '../../constants/icons';

const { width, height } = Dimensions.get('window');

interface InputFieldProps {
	label: string;
	placeholder: string;
	value: string;
	onChangeText: (text: string) => void;
	onFocus?: () => void;
	secureTextEntry?: boolean;
	keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
	autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
	icon?: keyof typeof Icons;
	rightIcon?: keyof typeof Icons;
	onRightIconPress?: () => void;
	style?: any;
}

export function InputField({
	label,
	placeholder,
	value,
	onChangeText,
	onFocus,
	secureTextEntry = false,
	keyboardType = 'default',
	autoCapitalize = 'none',
	icon,
	rightIcon,
	onRightIconPress,
	style,
}: InputFieldProps) {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const handleTogglePassword = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	return (
		<View style={[styles.container, style]}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.inputContainer}>
				{icon && (
					<View style={styles.leftIcon}>
						<Image source={Icons[icon]} style={styles.icon} />
					</View>
				)}
				<TextInput
					style={styles.input}
					placeholder={placeholder}
					placeholderTextColor="rgba(255, 255, 255, 0.5)"
					value={value}
					onChangeText={onChangeText}
					onFocus={onFocus}
					secureTextEntry={secureTextEntry && !isPasswordVisible}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
				/>
				{secureTextEntry && (
					<TouchableOpacity style={styles.rightIcon} onPress={handleTogglePassword}>
						<Image
							source={isPasswordVisible ? Icons.hide : Icons.eye}
							style={styles.icon}
						/>
					</TouchableOpacity>
				)}
				{rightIcon && !secureTextEntry && (
					<TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
						<Image source={Icons[rightIcon]} style={styles.icon} />
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: Math.min(height * 0.04, 34) // Responsive margin
	},
	label: {
		color: '#FFFFFF',
		fontFamily: 'Urbanist-Medium',
		fontSize: Math.min(width * 0.035, 14), // Responsive font size
		marginBottom: Math.min(height * 0.01, 8), // Responsive margin
		marginLeft: Math.min(width * 0.01, 4), // Responsive margin
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		height: Math.min(height * 0.08, 66), // Responsive height
		backgroundColor: '#202857',
		borderRadius: Math.min(width * 0.04, 16), // Responsive border radius
		paddingHorizontal: Math.min(width * 0.06, 24), // Responsive padding
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.1)',
	},
	leftIcon: {
		marginRight: Math.min(width * 0.04, 16), // Responsive margin
		justifyContent: 'center',
		alignItems: 'center',
		width: Math.min(width * 0.06, 24), // Responsive width
		height: Math.min(width * 0.06, 24), // Responsive height
	},
	rightIcon: {
		marginLeft: Math.min(width * 0.04, 16), // Responsive margin
		justifyContent: 'center',
		alignItems: 'center',
		width: Math.min(width * 0.06, 24), // Responsive width
		height: Math.min(width * 0.06, 24), // Responsive height
	},
	input: {
		flex: 1,
		color: '#FFFFFF',
		fontFamily: 'Urbanist-SemiBold',
		fontSize: Math.min(width * 0.045, 18), // Responsive font size
		height: '100%',
	},
	icon: {
		width: Math.min(width * 0.06, 25), // Responsive icon width
		height: Math.min(width * 0.06, 25), // Responsive icon height
		tintColor: '#FFFFFF',
		resizeMode: 'contain',
	},
});
