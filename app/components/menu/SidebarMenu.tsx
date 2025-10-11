import React from 'react';
import { View, StyleSheet, Switch, ScrollView, Dimensions, TouchableOpacity, TouchableWithoutFeedback, Text } from 'react-native';
import { MenuItem } from './MenuItem';
import { ProfileSection } from './ProfileSection';
import { Icons } from '../../../constants/icons';
import { GradientBackground } from '../GradientBackground';
import { CustomAlert } from '../dialogs/CustomAlert';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import ChatService from '../../lib/services/chatService';
import { UnreadBanner } from '../UnreadBanner';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../../lib/firebase';

// Menu item interface
interface MenuItemData {
  id: string;
  title: string;
  icon?: any;
  onPress: () => void;
  rightComponent?: React.ReactNode;
}

interface ProfileInfo {
  name: string;
  location: string;
  email: string;
  avatar?: any;
}

interface SidebarMenuProps {
  isVisible: boolean;
  onClose: () => void;
  profileInfo: ProfileInfo;
  onEditProfile: () => void;
}

const { height } = Dimensions.get('window');

export function SidebarMenu({ isVisible, onClose, profileInfo, onEditProfile }: SidebarMenuProps) {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user } = useAuth();

  // Debug: Log unread count changes
  useEffect(() => {
    console.log('SidebarMenu: Unread count changed to:', unreadCount);
  }, [unreadCount]);

  // Track unread messages
  useEffect(() => {
    const trackUnreadMessages = async () => {
      if (user?.id) {
        try {
          const chatService = ChatService.getInstance();
          const count = await chatService.getTotalUnreadCount(user.id);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error tracking unread messages:', error);
        }
      }
    };

    if (isVisible) {
      trackUnreadMessages();
    }
  }, [user?.id, isVisible]);

  // Set up real-time listener for unread messages
  useEffect(() => {
    if (user?.id && isVisible) {
      const conversationsRef = ref(rtdb, `users/${user.id}/conversations`);
      const unsubscribe = onValue(conversationsRef, (snapshot) => {
        try {
          if (!snapshot.exists()) {
            setUnreadCount(0);
            return;
          }

          const conversations = snapshot.val();
          let totalUnread = 0;

          for (const conversationId in conversations) {
            const conversation = conversations[conversationId];
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              totalUnread += conversation.unreadCount;
            }
          }

          setUnreadCount(totalUnread);
        } catch (error) {
          console.error('Error updating unread count in sidebar:', error);
        }
      });

      return () => {
        off(conversationsRef);
        unsubscribe();
      };
    }
  }, [user?.id, isVisible]);

  if (!isVisible) return null;

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    // Here you would typically call an API to update user preferences
    console.log('Notifications enabled:', value);
  };

  const handleEditProfile = () => {
    onClose();
    router.push('/(main-app)/profile');
  };

  const handleLogoutPress = () => {
    setShowLogoutAlert(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutAlert(false);
    onClose(); // Close the menu first

    try {
      // Set user offline BEFORE signing out to avoid permission errors
      const ChatService = (await import('../../lib/services/chatService')).default;
      const chatService = ChatService.getInstance();
      await chatService.setUserOffline();
      console.log('User set to offline before logout');

      // Clear all session data including payment sessions and navigation state
      await Promise.all([
        AsyncStorage.removeItem('payment_session'),
        AsyncStorage.removeItem('checkout_url'),
        AsyncStorage.removeItem('stripe_session_id'),
        AsyncStorage.removeItem('pending_booking'),
        AsyncStorage.removeItem('active_payment_flow'),
        AsyncStorage.removeItem('payment_flow_timestamp'),
        AsyncStorage.removeItem('signup_flow_active'),
        AsyncStorage.removeItem('signup_user_type'),
        AsyncStorage.removeItem('NAVIGATION_STATE'),
        AsyncStorage.removeItem('NAVIGATION_STATE_KEY'),
        AsyncStorage.removeItem('expo-router-state'),
      ]);
      console.log('Cleared all session and navigation data');

      // Small delay to ensure offline status is saved
      await new Promise(resolve => setTimeout(resolve, 500));

      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../../lib/firebase');
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutAlert(false);
  };

  const menuItems: MenuItemData[] = [
    {
      id: 'orders',
      title: 'My Order',
      onPress: () => console.log('Navigate to My Orders'),
    },
    {
      id: 'listings',
      title: 'My Listings',
      onPress: () => console.log('Navigate to My Listings'),
    },
    {
      id: 'messaging',
      title: 'Messaging',
      onPress: () => router.push('/(main-app)/messaging'),
      rightComponent: unreadCount > 0 ? (
        <UnreadBanner count={unreadCount} size="small" position="top-right" />
      ) : undefined,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      onPress: () => router.push('/(main-app)/notifications'),
      rightComponent: (
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notificationsEnabled ? '#2E225C' : '#f4f3f4'}
          style={styles.switch}
        />
      ),
    },
  ];

  const settingsItems: MenuItemData[] = [
    {
      id: 'changePassword',
      title: 'Change Password',
      onPress: () => router.push('/(auth)/reset-password'),
    },
    {
      id: 'resetPassword',
      title: 'Reset Password',
      onPress: () => router.push('/(auth)/forgot-password'),
    },
    {
      id: 'contactUs',
      title: 'Contact Us',
      onPress: () => router.push('/(main-app)/contact-us'),
    },
    {
      id: 'terms',
      title: 'Terms of Services',
      onPress: () => router.push('/(auth)/terms-conditions'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      onPress: () => router.push('/(auth)/privacy-policy'),
    },
  ];

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sidebar}>
        <GradientBackground />

        {/* Profile section */}
        <ProfileSection
          name={profileInfo.name}
          location={profileInfo.location}
          avatar={profileInfo.avatar}
          onEditPress={handleEditProfile}
        />

        {/* Menu items section */}
        <View style={styles.menuContainer}>
          <View style={styles.mainMenuItems}>
            {menuItems.map((item) => (
              <MenuItem
                key={item.id}
                title={item.title}
                icon={item.icon}
                onPress={item.onPress}
                rightComponent={item.rightComponent}
              />
            ))}
          </View>

          <View style={styles.settingsItems}>
            {settingsItems.map((item) => (
              <MenuItem
                key={item.id}
                title={item.title}
                icon={item.icon}
                onPress={item.onPress}
                rightComponent={item.rightComponent}
              />
            ))}
          </View>

          {/* Logout button fixed at bottom */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutPress}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Handle to close menu */}
        <TouchableOpacity style={styles.closeHandle} onPress={onClose}>
          <View style={styles.handleBar} />
        </TouchableOpacity>
      </View>

      {/* Logout Confirmation Alert */}
      <CustomAlert
        visible={showLogoutAlert}
        type="warning"
        title="Logout Confirmation"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: handleLogoutCancel,
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: handleLogoutConfirm,
          },
        ]}
        onClose={handleLogoutCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: '80%',
    height: height,
    position: 'absolute',
    left: 0,
    top: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  menuContainer: {
    flex: 1,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  mainMenuItems: {
    marginBottom: 10,
  },
  settingsItems: {
    marginBottom: 20,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    height: 25,
  },
  logoutButton: {
    paddingVertical: 15,
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  closeHandle: {
    position: 'absolute',
    top: '50%',
    right: -30,
    width: 30,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleBar: {
    width: 4,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
}); 