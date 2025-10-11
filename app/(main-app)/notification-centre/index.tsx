import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Icons } from '../../../constants/icons';
import { useAuth } from '@/app/lib/hooks/useAuth';

const { width, height } = Dimensions.get('window');

interface Notification {
	id: string;
	message: string;
	timestamp: string;
	isRead: boolean;
}

export default function NotificationCentre() {
	const { user } = useAuth();
	const notifications: Notification[] = [
		{
			id: '1',
			message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
			timestamp: '2h ago',
			isRead: false
		},
		{
			id: '2',
			message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
			timestamp: '2h ago',
			isRead: false
		},
		{
			id: '3',
			message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
			timestamp: '2h ago',
			isRead: false
		}
	];

	const renderNotification = (notification: Notification) => (
		<View key={notification.id} style={styles.notificationItem}>
			<View style={styles.notificationIcon}>
				<Image
					source={require('../../../assets/icons/icBELL.png')}
					style={styles.bellIcon}
				/>
			</View>
			<View style={styles.notificationContent}>
				<Text style={styles.notificationMessage}>{notification.message}</Text>
				<Text style={styles.notificationTimestamp}>{notification.timestamp}</Text>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="light" />
			<GradientBackground />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Image source={Icons.back} style={styles.backIcon} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>{(user?.name || user?.email || 'User') + "'s Notifications"}</Text>
			</View>

			{/* Notifications List */}
			<ScrollView
				style={styles.notificationsContainer}
				contentContainerStyle={styles.notificationsContent}
				showsVerticalScrollIndicator={false}
			>
				{notifications.map(renderNotification)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 26,

	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	backButton: {
	},
	backIcon: {
		width: 54,
		height: 54,
		resizeMode: 'contain',
	},
	headerTitle: {
		color: 'white',
		fontSize: 24,
		fontWeight: 'bold',
		marginTop: 40
	},
	notificationsContainer: {
		flex: 1,
		paddingHorizontal: 20,
	},
	notificationsContent: {
		paddingVertical: 16,
	},
	notificationItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,

		borderBottomWidth: 1,
		borderBottomColor: '#FFFFFF1A',
	},
	notificationIcon: {

		borderRadius: 25,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	bellIcon: {
		resizeMode: 'contain',
		width: 70,
		height: 70,
	},
	notificationContent: {
		flex: 1,
		justifyContent: 'center',
	},
	notificationMessage: {
		color: '#FFFFFF',
		fontSize: 18,
		lineHeight: 22,
		marginBottom: 4,
	},
	notificationTimestamp: {
		color: 'white',
		fontSize: 15,
	},
});
