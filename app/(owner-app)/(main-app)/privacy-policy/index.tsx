import React from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '@/app/components/GradientBackground';
import { Icons } from '@/constants/icons';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function OwnerPrivacyPolicy() {
	return (
		<View style={styles.container}>
			<StatusBar style="light" />
			<GradientBackground />

			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Image source={Icons.back} style={styles.backIcon} />
				</TouchableOpacity>
				<Text style={styles.headerText}>Privacy Policy</Text>
			</View>

			<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
				<Text style={styles.paragraph}>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

				</Text>
				<Text style={styles.paragraph}>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
				</Text>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: 'transparent', paddingVertical: 24 },
	header: { paddingHorizontal: Math.min(width * 0.08, 30), marginTop: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
	backIcon: { width: 54, height: 54, resizeMode: 'contain' },
	headerText: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginLeft: 8, position: 'absolute', left: '35%' },
	content: { flex: 1, paddingHorizontal: Math.min(width * 0.08, 30) },
	contentContainer: { flexGrow: 1, justifyContent: 'center' },
	paragraph: { fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 24, marginBottom: 12, textAlign: 'center' },
});
