import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { GradientBackground } from '@/app/components';
import { Icons } from '@/constants/icons';
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
	
	];

	const renderNotification = (notification: Notification) => (
		<View key={notification.id} style={styles.notificationItem}>
			<View style={styles.notificationIcon}>
				<Image
					source={require('../../../../assets/icons/icBELL.png')}
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
				<Text style={styles.headerTitle}>{(user?.name || user?.email || 'Owner') + "'s Notifications"}</Text>
			</View>

			{/* Notifications List */}
			<ScrollView
				style={styles.notificationsContainer}
				contentContainerStyle={styles.notificationsContent}
				showsVerticalScrollIndicator={false}
			>
				{notifications.length > 0 ? (
					notifications.map(renderNotification)
				) : (
					<View style={styles.emptyStateContainer}>
						<Image
							source={require('../../../../assets/icons/icBELL.png')}
							style={styles.emptyStateIcon}
						/>
						<Text style={styles.emptyStateTitle}>No Notifications</Text>
						<Text style={styles.emptyStateMessage}>
							You're all caught up! We'll notify you when something new happens.
						</Text>
					</View>
				)}
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
	emptyStateContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 60,
		paddingHorizontal: 40,
	},
	emptyStateIcon: {
		width: 80,
		height: 80,
		resizeMode: 'contain',
		opacity: 0.6,
		marginBottom: 24,
	},
	emptyStateTitle: {
		color: '#FFFFFF',
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center',
	},
	emptyStateMessage: {
		color: '#FFFFFF',
		fontSize: 16,
		lineHeight: 22,
		textAlign: 'center',
		opacity: 0.8,
	},
});
