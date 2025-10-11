import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { GradientBackground } from '../GradientBackground';
import { GradientButton } from '../buttons';

const { width } = Dimensions.get('window');

export interface AdditionalServicesModalProps {
	visible: boolean;
	services: string[];
	onClose: () => void;
	onSave: (services: string[]) => void;
}

export function AdditionalServicesModal({ visible, services, onClose, onSave }: AdditionalServicesModalProps) {
	const [localServices, setLocalServices] = useState<string[]>(services.length ? services : ['']);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		if (visible) {
			setLocalServices(services.length ? services : ['']);
		}
	}, [visible, services]);

	// Keyboard event listeners
	useEffect(() => {
		console.log('🔧 AdditionalServicesModal: Setting up keyboard listeners');
		
		const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
			console.log('✅ AdditionalServicesModal: KEYBOARD SHOWN!', {
				height: e.endCoordinates.height,
				platform: Platform.OS
			});
			setKeyboardVisible(true);
			setKeyboardHeight(e.endCoordinates.height);
		});

		const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', (e) => {
			console.log('❌ AdditionalServicesModal: KEYBOARD HIDDEN!', {
				platform: Platform.OS
			});
			setKeyboardVisible(false);
			setKeyboardHeight(0);
		});

		return () => {
			console.log('🧹 AdditionalServicesModal: Cleaning up keyboard listeners');
			keyboardDidShowListener.remove();
			keyboardDidHideListener.remove();
		};
	}, []);

	const handleChange = (index: number, value: string) => {
		console.log(`📝 AdditionalServicesModal: Input ${index + 1} changed to:`, value);
		setLocalServices(prev => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const handleInputFocus = (index: number) => {
		console.log(`🎯 AdditionalServicesModal: Input ${index + 1} FOCUSED!`, {
			platform: Platform.OS,
			modalVisible: visible,
			keyboardVisible
		});
	};

	const handleInputBlur = (index: number) => {
		console.log(`😴 AdditionalServicesModal: Input ${index + 1} BLURRED!`);
	};

	const handleAdd = () => {
		setLocalServices(prev => [...prev, '']);
	};

	const allFilled = localServices.every(s => s.trim().length > 0);

	const handleSave = () => {
		onSave(localServices);
	};

	console.log('🔍 AdditionalServicesModal: Rendering modal', {
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

						<Text style={styles.title}>Additional Services</Text>
						

						<ScrollView 
							style={styles.list} 
							contentContainerStyle={{ paddingBottom: 16 }} 
							showsVerticalScrollIndicator={false}
							nestedScrollEnabled={true}
							keyboardShouldPersistTaps="handled"
							automaticallyAdjustKeyboardInsets={true}
						>
							{localServices.map((value, idx) => (
								<View key={idx} style={styles.featureRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.fieldLabel}>Service Name</Text>
										<TextInput
											style={styles.input}
											placeholder={"Add here.."}
											placeholderTextColor={'#FFFFFF4D'}
											value={value}
											onChangeText={(text) => handleChange(idx, text)}
											onFocus={() => handleInputFocus(idx)}
											onBlur={() => handleInputBlur(idx)}
											showSoftInputOnFocus={true}
											keyboardType="default"
											returnKeyType="next"
											editable={true}
											multiline={false}
											numberOfLines={1}
										/>
									</View>
								</View>
							))}
						</ScrollView>

						<View style={{ marginTop: -20, opacity: allFilled ? 1 : 0.6 }}>
							<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} />
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

						<Text style={styles.title}>Additional Services</Text>
						

						<ScrollView 
							style={styles.list} 
							contentContainerStyle={{ paddingBottom: 16 }} 
							showsVerticalScrollIndicator={false}
							nestedScrollEnabled={true}
							keyboardShouldPersistTaps="handled"
							automaticallyAdjustKeyboardInsets={true}
						>
							{localServices.map((value, idx) => (
								<View key={idx} style={styles.featureRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.fieldLabel}>Service Name</Text>
										<TextInput
											style={styles.input}
											placeholder={"Add here.."}
											placeholderTextColor={'#FFFFFF4D'}
											value={value}
											onChangeText={(text) => handleChange(idx, text)}
											onFocus={() => handleInputFocus(idx)}
											onBlur={() => handleInputBlur(idx)}
											showSoftInputOnFocus={true}
											keyboardType="default"
											returnKeyType="next"
											editable={true}
											multiline={false}
											numberOfLines={1}
										/>
									</View>
								</View>
							))}
						</ScrollView>

						<View style={{ marginTop: -20, opacity: allFilled ? 1 : 0.6 }}>
							<GradientButton text="Save" onPress={handleSave} disabled={!allFilled} />
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
	fieldLabel: {
		color: '#FFFFFF',
		fontSize: 16,
		marginBottom: 8,
		fontWeight: '600',
	},
	input: {
		flex: 1,
		height: 60,
		borderRadius: 19,
		paddingHorizontal: 16,
		backgroundColor: '#0D1A46',
		color: '#FFFFFF',
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

export default AdditionalServicesModal;


