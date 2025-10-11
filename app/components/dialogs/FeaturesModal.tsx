import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../GradientBackground';
import { GradientButton } from '../buttons';

const { width } = Dimensions.get('window');

interface FeaturesModalProps {
	visible: boolean;
	features: string[];
	onClose: () => void;
	onSave: (features: string[]) => void;
}

export function FeaturesModal({ visible, features, onClose, onSave }: FeaturesModalProps) {
	const [localFeatures, setLocalFeatures] = useState<string[]>(features.length ? features : ['', '']);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		if (visible) {
			setLocalFeatures(features.length ? features : ['', '']);
		}
	}, [visible, features]);

	// Keyboard event listeners
	useEffect(() => {
		console.log('🔧 FeaturesModal: Setting up keyboard listeners');
		
		const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
			console.log('✅ FeaturesModal: KEYBOARD SHOWN!', {
				height: e.endCoordinates.height,
				duration: e.duration,
				platform: Platform.OS
			});
			setKeyboardVisible(true);
			setKeyboardHeight(e.endCoordinates.height);
		});

		const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', (e) => {
			console.log('❌ FeaturesModal: KEYBOARD HIDDEN!', {
				duration: e.duration,
				platform: Platform.OS
			});
			setKeyboardVisible(false);
			setKeyboardHeight(0);
		});

		const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
			console.log('🔄 FeaturesModal: KEYBOARD WILL SHOW', {
				height: e.endCoordinates.height,
				duration: e.duration,
				platform: Platform.OS
			});
		});

		const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', (e) => {
			console.log('🔄 FeaturesModal: KEYBOARD WILL HIDE', {
				duration: e.duration,
				platform: Platform.OS
			});
		});

		return () => {
			console.log('🧹 FeaturesModal: Cleaning up keyboard listeners');
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
			keyboardWillShowListener.remove();
			keyboardWillHideListener.remove();
		};
	}, []);

	const handleChange = (index: number, value: string) => {
		console.log(`📝 FeaturesModal: Input ${index + 1} changed to:`, value);
		setLocalFeatures(prev => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const handleInputFocus = (index: number) => {
		console.log(`🎯 FeaturesModal: Input ${index + 1} FOCUSED!`, {
			platform: Platform.OS,
			modalVisible: visible,
			keyboardVisible
		});
	};

	const handleInputBlur = (index: number) => {
		console.log(`😴 FeaturesModal: Input ${index + 1} BLURRED!`);
	};

	const handleAdd = () => {
		setLocalFeatures(prev => [...prev, '']);
	};

	const allFilled = localFeatures.every(f => f.trim().length > 0);

	const handleSave = () => {
		// Keep number of fields and their values in sync with parent
		onSave(localFeatures);
	};

	console.log('🔍 FeaturesModal: Rendering modal', {
		visible,
		platform: Platform.OS,
		keyboardVisible,
		keyboardHeight
	});

	if (!visible) return null;

	return (
		<View style={styles.overlay} pointerEvents="box-none">
				{Platform.OS === 'ios' ? (
					<KeyboardAvoidingView 
						style={styles.keyboardAvoidingView}
						behavior="padding"
						keyboardVerticalOffset={0}
					>
						<TouchableOpacity 
							style={styles.closeButton} 
							onPress={onClose}
							activeOpacity={0.7}
						>
							<Text style={styles.closeText}>×</Text>
						</TouchableOpacity>
						<View style={styles.container}>
							<GradientBackground />

							<Text style={styles.title}>Add more Features</Text>
					

							<ScrollView 
								style={styles.list} 
								contentContainerStyle={{ paddingBottom: 16 }} 
								showsVerticalScrollIndicator={false}
								nestedScrollEnabled={true}
								keyboardShouldPersistTaps="handled"
								automaticallyAdjustKeyboardInsets={true}
							>
								{localFeatures.map((value, idx) => (
									<View key={idx} style={styles.featureRow}>
										<View style={styles.bullet} />
										<TextInput
											style={styles.input}
											placeholder={`Feature ${idx + 1}`}
											placeholderTextColor={'#FFFFFF4D'}
											value={value}
											onChangeText={(text) => handleChange(idx, text)}
											onFocus={() => handleInputFocus(idx)}
											onBlur={() => handleInputBlur(idx)}
											autoFocus={false}
											blurOnSubmit={false}
											showSoftInputOnFocus={true}
											keyboardType="default"
											returnKeyType="next"
											editable={true}
											multiline={false}
											numberOfLines={1}
										/>
									</View>
								))}
							</ScrollView>

							<View style={{ marginTop: -20, opacity: allFilled ? 1 : 0.6 }}>
								<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} containerStyle={{ borderRadius: 19 }} />
							</View>
							<TouchableOpacity style={styles.addMore} onPress={handleAdd}>
								<Text style={styles.addMoreText}>Add+</Text>
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				) : (
					<View style={styles.keyboardAvoidingView}>
						<TouchableOpacity 
							style={styles.closeButton} 
							onPress={onClose}
							activeOpacity={0.7}
						>
							<Text style={styles.closeText}>×</Text>
						</TouchableOpacity>
						<View style={styles.container}>
							<GradientBackground />

							<Text style={styles.title}>Add more Features</Text>
				

							<ScrollView 
								style={styles.list} 
								contentContainerStyle={{ paddingBottom: 16 }} 
								showsVerticalScrollIndicator={false}
								nestedScrollEnabled={true}
								keyboardShouldPersistTaps="handled"
								automaticallyAdjustKeyboardInsets={true}
							>
								{localFeatures.map((value, idx) => (
									<View key={idx} style={styles.featureRow}>
										<View style={styles.bullet} />
										<TextInput
											style={styles.input}
											placeholder={`Feature ${idx + 1}`}
											placeholderTextColor={'#FFFFFF4D'}
											value={value}
											onChangeText={(text) => handleChange(idx, text)}
											onFocus={() => handleInputFocus(idx)}
											onBlur={() => handleInputBlur(idx)}
											autoFocus={false}
											blurOnSubmit={false}
											showSoftInputOnFocus={true}
											keyboardType="default"
											returnKeyType="next"
											editable={true}
											multiline={false}
											numberOfLines={1}
										/>
									</View>
								))}
							</ScrollView>

							<View style={{ marginTop: -20, opacity: allFilled ? 1 : 0.6 }}>
								<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} containerStyle={{ borderRadius: 19 }} />
							</View>
							<TouchableOpacity style={styles.addMore} onPress={handleAdd}>
								<Text style={styles.addMoreText}>Add+</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
		</View>
	);
}

const styles = StyleSheet.create({
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#00000033',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	keyboardAvoidingView: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	container: {
		width: width - 40,
		borderRadius: 19,
		paddingHorizontal: 20,
		paddingTop: 30,
		paddingBottom: 20,
		backgroundColor: '#1E2653',
		overflow: 'hidden'
	},
	closeButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#1E2653',
		zIndex: 1000,
	},
	closeText: {
		color: '#FFFFFF',
		fontSize: 32,
		lineHeight: 32,
	},
	title: {
		color: '#FFFFFF',
		fontSize: 24,
		fontWeight: '700',
		textAlign: 'center',
		marginVertical: 18,
	},
	debugText: {
		color: '#FFFF00',
		fontSize: 10,
		textAlign: 'center',
		marginBottom: 10,
		backgroundColor: '#00000066',
		padding: 4,
		borderRadius: 4,
	},
	list: {
		height: 138,
		maxHeight: 190,
		marginBottom: 40,
	},
	featureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	bullet: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#0D1A46',
		marginRight: 12,
	},
	input: {
		flex: 1,
		height: 60,
		borderRadius: 18,
		paddingHorizontal: 16,
		backgroundColor: '#0D1A46',
		color: '#FFFFFF',
	},
	saveButton: {
		height: 60,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8,
	},
	saveText: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontSize: 18,
	},
	addMore: {
		alignSelf: 'center',
		paddingVertical: 12,
	},
	addMoreText: {
		color: '#FFFFFF',
		fontSize: 18,
	},
});


