import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, Image, Platform, KeyboardAvoidingView, InteractionManager, Animated, Keyboard } from 'react-native';
import { GradientBackground } from '../GradientBackground';
import { GradientButton } from '../buttons';

const { width } = Dimensions.get('window');

export interface CalculateAreaData {
	address: string;
	size: string; // number as string to keep input simple
}

interface CalculateAreaModalProps {
	visible: boolean;
	data: CalculateAreaData | null;
	onClose: () => void;
	onSave: (data: CalculateAreaData) => void;
}

export function CalculateAreaModal({ visible, data, onClose, onSave }: CalculateAreaModalProps) {
	const [address, setAddress] = useState<string>('');
	const [size, setSize] = useState<string>('');
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			setAddress(data?.address ?? '');
			setSize(data?.size ?? '');
		}
	}, [visible, data]);

	// Keyboard event listeners
	useEffect(() => {
		console.log('🔧 CalculateAreaModal: Setting up keyboard listeners');
		
		const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
			console.log('✅ CalculateAreaModal: KEYBOARD SHOWN!', {
				height: e.endCoordinates.height,
				platform: Platform.OS
			});
			setKeyboardVisible(true);
			setKeyboardHeight(e.endCoordinates.height);
		});

		const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', (e) => {
			console.log('❌ CalculateAreaModal: KEYBOARD HIDDEN!', {
				platform: Platform.OS
			});
			setKeyboardVisible(false);
			setKeyboardHeight(0);
		});

		return () => {
			console.log('🧹 CalculateAreaModal: Cleaning up keyboard listeners');
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	const allFilled = address.trim().length > 0 && size.trim().length > 0;

	const handleSave = () => {
		onSave({ address: address.trim(), size: size.trim() });
	};

	const handleInputFocus = (fieldName: string) => {
		console.log(`🎯 CalculateAreaModal: ${fieldName} FOCUSED!`, {
			platform: Platform.OS,
			modalVisible: visible,
			keyboardVisible
		});
	};

	const handleInputBlur = (fieldName: string) => {
		console.log(`😴 CalculateAreaModal: ${fieldName} BLURRED!`);
	};

	console.log('🔍 CalculateAreaModal: Rendering modal', {
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
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<Text style={styles.closeText}>×</Text>
					</TouchableOpacity>
					<View style={styles.container}>
						<GradientBackground />

						<Text style={styles.title}>Calculate Area</Text>
						

				<ScrollView 
					style={styles.list} 
					contentContainerStyle={{ paddingBottom:0 }} 
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled={true}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.fieldLabel}>Area</Text>
					<TextInput
						style={styles.input}
						placeholder="Add Address"
						placeholderTextColor={'#FFFFFF4D'}
						value={address}
						onChangeText={setAddress}
						onFocus={() => handleInputFocus('Address')}
						onBlur={() => handleInputBlur('Address')}
						blurOnSubmit={false}
						returnKeyType="next"
						showSoftInputOnFocus={true}
						keyboardType="default"
						editable={true}
					/>

					<View style={{ height: 22 }} />
					<Text style={styles.fieldLabel}>Map</Text>
					<View style={styles.mapBox}>
						<Image source={require('../../../assets/icons/map.png')} style={styles.mapImage} />
					</View>
					<Text style={styles.mapHint}>Click the map icon to your location now, or just filling the your address</Text>

					<View style={{ height: 22 }} />
					<Text style={styles.fieldLabel}>Your Backyard Size</Text>
					<View style={styles.sizeRow}>
						<TextInput
							style={styles.sizeInput}
							placeholder="200"
							placeholderTextColor={'#FFFFFF4D'}
							value={size}
							onChangeText={setSize}
							onFocus={() => handleInputFocus('Size')}
							onBlur={() => handleInputBlur('Size')}
							keyboardType="numeric"
							blurOnSubmit={false}
							returnKeyType="done"
							showSoftInputOnFocus={true}
							editable={true}
						/>
						<Text style={styles.sizeUnit}>/sq.ft</Text>
					</View>
				</ScrollView>

				<View style={{ marginTop: -8, opacity: allFilled ? 1 : 0.6 }}>
					<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} />
				</View>
					</View>
				</KeyboardAvoidingView>
			) : (
				<View style={styles.keyboardAvoidingView}>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<Text style={styles.closeText}>×</Text>
					</TouchableOpacity>
					<View style={styles.container}>
						<GradientBackground />

						<Text style={styles.title}>Calculate Area</Text>
						

						<ScrollView 
							style={styles.list} 
							contentContainerStyle={{ paddingBottom:0 }} 
							showsVerticalScrollIndicator={false}
							nestedScrollEnabled={true}
							keyboardShouldPersistTaps="handled"
							automaticallyAdjustKeyboardInsets={true}
						>
							<Text style={styles.fieldLabel}>Area</Text>
							<TextInput
								style={styles.input}
								placeholder="Add Address"
								placeholderTextColor={'#FFFFFF4D'}
								value={address}
								onChangeText={setAddress}
								onFocus={() => handleInputFocus('Address')}
								onBlur={() => handleInputBlur('Address')}
								blurOnSubmit={false}
								returnKeyType="next"
								showSoftInputOnFocus={true}
								keyboardType="default"
								editable={true}
							/>

							<View style={{ height: 22 }} />
							<Text style={styles.fieldLabel}>Map</Text>
							<View style={styles.mapBox}>
								<Image source={require('../../../assets/icons/map.png')} style={styles.mapImage} />
							</View>
							<Text style={styles.mapHint}>Click the map icon to your location now, or just filling the your address</Text>

							<View style={{ height: 22 }} />
							<Text style={styles.fieldLabel}>Your Backyard Size</Text>
							<View style={styles.sizeRow}>
								<TextInput
									style={styles.sizeInput}
									placeholder="200"
									placeholderTextColor={'#FFFFFF4D'}
									value={size}
									onChangeText={setSize}
									onFocus={() => handleInputFocus('Size')}
									onBlur={() => handleInputBlur('Size')}
									keyboardType="numeric"
									blurOnSubmit={false}
									returnKeyType="done"
									showSoftInputOnFocus={true}
									editable={true}
								/>
								<Text style={styles.sizeUnit}>/sq.ft</Text>
							</View>
						</ScrollView>

						<View style={{ marginTop: -8, opacity: allFilled ? 1 : 0.6 }}>
							<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} />
						</View>
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
		width: width - 70,
		paddingHorizontal: 20,
		paddingTop: 30,
		paddingBottom: 20,
		backgroundColor: '#1E2653',
		borderRadius: 19,
		overflow: 'hidden',
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
		maxHeight: 300,
		marginBottom: 24,
	},
	fieldLabel: {
		color: '#FFFFFF',
		fontSize: 18,
		marginBottom: 10,
		fontWeight: '600',
		marginLeft: 10
	},
	input: {
		height: 60,
		borderRadius: 19,
		paddingHorizontal: 16,
		backgroundColor: '#0D1A46',
		color: '#FFFFFF',
	},
	mapBox: {
		height: 190,
		borderRadius: 19,
		overflow: 'hidden',
		backgroundColor: '#0D1A46',
	},
	mapImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	mapHint: {
		color: '#FFFFFFB3',
		marginTop: 12,
		fontSize: 16,
	},
	sizeRow: {
		height: 60,
		borderRadius: 19,
		paddingHorizontal: 16,
		backgroundColor: '#0D1A46',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sizeInput: {
		color: '#FFFFFF',
		fontSize: 18,
		width: '70%',
	},
	sizeUnit: {
		color: '#FFFFFF80',
		fontSize: 16,
	},
});

export default CalculateAreaModal;


