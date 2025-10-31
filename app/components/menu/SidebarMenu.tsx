import React from 'react';
import { View, StyleSheet, Switch, ScrollView, Dimensions, TouchableOpacity, TouchableWithoutFeedback, Text, ActivityIndicator } from 'react-native';
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
import { getFunctions, httpsCallable } from 'firebase/functions';

// Menu item interface
interface MenuItemData {
  id: string;
  title: string;
  icon?: any;
  onPress: () => void;
  rightComponent?: React.ReactNode;
  disabled?: boolean;
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [locationText, setLocationText] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [stripeStatus, setStripeStatus] = useState({
    status: 'not_created',
    isChecking: false
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user } = useAuth();

  // Load profile data from Firebase
  useEffect(() => {
    if (!isVisible || !user?.id) return;

    const userRef = ref(rtdb, `users/${user.id}`);
    const nameRef = ref(rtdb, `users/${user.id}/fullName`);
    
    const unsubUser = onValue(userRef, (snap) => {
      const data = snap.val() || {};
      const country = data.country || '';
      const city = data.city || '';
      const stateVal = data.state || '';
      const parts = [city, stateVal, country].filter(Boolean);
      setLocationText(parts.length ? parts.join(', ') : 'Update your location');
      
      // Load profile image - try Storage URL first, fallback to base64
      if (data.profileImageUrl) {
        setProfileImage(data.profileImageUrl);
      } else if (data.profileImage) {
        const mimeType = data.profileImageMimeType || 'image/jpeg';
        const imageUri = `data:${mimeType};base64,${data.profileImage}`;
        setProfileImage(imageUri);
      }
    });

    const unsubName = onValue(nameRef, (snap) => {
      const v = snap.val();
      if (v) setDisplayName(String(v));
    });

    return () => {
      try { off(userRef); } catch { }
      try { off(nameRef); } catch { }
      try { unsubUser(); } catch { }
      try { unsubName(); } catch { }
    };
  }, [user?.id, isVisible]);

  // Track unread conversations (count conversations, not messages)
  useEffect(() => {
    const trackUnreadConversations = async () => {
      if (user?.id) {
        try {
          const chatService = ChatService.getInstance();
          const conversations = await chatService.getChatConversations();
          let unreadConversationsCount = 0;
          
          for (const conversation of conversations) {
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              unreadConversationsCount += 1; // Count conversations, not messages
            }
          }
          
          console.log('SidebarMenu: Total unread conversations count:', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
        } catch (error) {
          console.log('Error tracking unread conversations:', error);
        }
      }
    };

    if (isVisible) {
      trackUnreadConversations();
    }
  }, [user?.id, isVisible]);

  // Set up real-time listener for unread conversations
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
          let unreadConversationsCount = 0;

          for (const conversationId in conversations) {
            const conversation = conversations[conversationId];
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              unreadConversationsCount += 1; // Count conversations, not messages
            }
          }

          console.log('SidebarMenu: Real-time unread conversations count:', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
        } catch (error) {
          console.log('Error updating unread count in sidebar:', error);
        }
      });

      return () => {
        try { off(conversationsRef); } catch { }
        try { unsubscribe(); } catch { }
      };
    }
  }, [user?.id, isVisible]);

  // Check Stripe Connect status for owners
  useEffect(() => {
    const checkStripeStatus = async () => {
      console.log('SidebarMenu: Checking Stripe status', { 
        isVisible, 
        userId: user?.id, 
        userType: user?.type,
        isOwner: user?.type === 'owner'
      });
      
      if (!isVisible || !user?.id || user?.type !== 'owner') {
        console.log('SidebarMenu: Not checking Stripe status - not owner or not visible');
        return;
      }
      
      setStripeStatus(prev => ({ ...prev, isChecking: true }));
      
      try {
        const functions = getFunctions();
        const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
        
        const result = await checkStatus({});
        const data = result.data as any;
        
        console.log('SidebarMenu: Stripe status result', data);
        
        if (data.success) {
          setStripeStatus({
            status: data.status,
            isChecking: false
          });
          console.log('SidebarMenu: Stripe status updated', data.status);
        }
      } catch (error) {
        console.log('Error checking Stripe status in sidebar:', error);
        setStripeStatus(prev => ({ ...prev, isChecking: false }));
      }
    };

    if (isVisible) {
      checkStripeStatus();
    }
  }, [user?.id, user?.type, isVisible]);

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
    setIsLoggingOut(true);
    // Don't close menu immediately - keep it open to show loader

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
      
      // Close menu after logout is complete
      onClose();
    } catch (error) {
      console.log('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutAlert(false);
  };

  // Check if owner is verified
  const isOwner = user?.type === 'owner';
  const isVerified = stripeStatus.status === 'verified';
  const isOwnerVerified = !isOwner || isVerified;
  const isOwnerPending = isOwner && !isVerified;
  
  // TEMPORARY: Force disabled state for testing - disable all owners for now
  const forceDisabled = isOwner; // Force disable ALL owners for testing
  
  // TEST: Always disable for testing
  const alwaysDisabled = true;
  
  // DEBUG: Always show disabled state for testing
  console.log('🔍 DEBUG: Menu disabled state', {
    userType: user?.type,
    isOwner,
    forceDisabled,
    alwaysDisabled,
    stripeStatus: stripeStatus.status
  });
  
  console.log('SidebarMenu: Verification status', {
    userType: user?.type,
    stripeStatus: stripeStatus.status,
    isOwner,
    isVerified,
    isOwnerVerified,
    isOwnerPending,
    forceDisabled
  });

  const menuItems: MenuItemData[] = [
    {
      id: 'home',
      title: 'Home',
      onPress: (isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : () => {
        onClose();
        if (user?.type === 'owner') {
          router.replace('/(owner-app)/(main-app)/home');
        } else {
          router.replace('/(main-app)/home');
        }
      },
      disabled: isOwnerPending || forceDisabled || alwaysDisabled,
    },
    // Only show bookings for verified users
    ...(isOwnerVerified ? [{
      id: 'bookings',
      title: 'My Bookings',
      onPress: () => {
        onClose();
        if (user?.type === 'owner') {
          router.push('/(owner-app)/(main-app)/my-bookings');
        } else {
          router.push('/(main-app)/my-bookings');
        }
      },
    }] : []),
    // Only show messaging for verified users
    ...(isOwnerVerified ? [{
      id: 'messaging',
      title: 'Messaging',
      onPress: () => {
        onClose();
        if (user?.type === 'owner') {
          router.push('/(owner-app)/(main-app)/messaging');
        } else {
          router.push('/(main-app)/messaging');
        }
      },
      rightComponent: unreadCount > 0 ? (
        <UnreadBanner count={unreadCount} size="small" position="top-right" />
      ) : undefined,
    }] : []),
    {
      id: 'notifications',
      title: 'Notifications',
      onPress: (isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : () => {}, // No navigation, just toggle
      disabled: isOwnerPending || forceDisabled || alwaysDisabled,
      rightComponent: (
        <Switch
          value={notificationsEnabled}
          onValueChange={(isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : handleNotificationToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notificationsEnabled ? '#2E225C' : '#f4f3f4'}
          style={[styles.switch, (isOwnerPending || forceDisabled || alwaysDisabled) && styles.disabledSwitch]}
          disabled={isOwnerPending || forceDisabled || alwaysDisabled}
        />
      ),
    },
  ];

  const settingsItems: MenuItemData[] = [
    // Only show profile-related settings for verified users
    ...(isOwnerVerified ? [
      {
        id: 'changePassword',
        title: 'Change Password',
        onPress: () => {
          onClose();
          if (user?.type === 'owner') {
            router.push('/(owner-app)/(main-app)/change-pass');
          } else {
            router.push('/(main-app)/change-pass');
          }
        },
      },
      {
        id: 'resetPassword',
        title: 'Reset Password',
        onPress: () => {
          onClose();
          if (user?.type === 'owner') {
            router.push('/(owner-app)/(main-app)/reset-pass');
          } else {
            router.push('/(main-app)/reset-pass');
          }
        },
      },
    ] : []),
    // Always show contact and legal pages but disable for pending owners
    {
      id: 'contactUs',
      title: 'Contact Us',
      onPress: (isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : () => {
        onClose();
        if (user?.type === 'owner') {
          router.push('/(owner-app)/(main-app)/contact-us');
        } else {
          router.push('/(main-app)/contact-us');
        }
      },
      disabled: isOwnerPending || forceDisabled || alwaysDisabled,
    },
    {
      id: 'terms',
      title: 'Terms of Services',
      onPress: (isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : () => {
        onClose();
        if (user?.type === 'owner') {
          router.push('/(owner-app)/(main-app)/terms-conditions');
        } else {
          router.push('/(main-app)/terms-conditions');
        }
      },
      disabled: isOwnerPending || forceDisabled || alwaysDisabled,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      onPress: (isOwnerPending || forceDisabled || alwaysDisabled) ? () => {} : () => {
        onClose();
        if (user?.type === 'owner') {
          router.push('/(owner-app)/(main-app)/privacy-policy');
        } else {
          router.push('/(main-app)/privacy-policy');
        }
      },
      disabled: isOwnerPending || forceDisabled || alwaysDisabled,
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
          name={displayName || profileInfo.name}
          location={locationText || profileInfo.location}
          avatar={profileImage || profileInfo.avatar}
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
                disabled={item.disabled}
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
                disabled={item.disabled}
              />
            ))}
          </View>

          {/* Logout button fixed at bottom */}
          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogoutPress}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.logoutText}>Logging out...</Text>
              </>
            ) : (
              <Text style={styles.logoutText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Handle to close menu */}
        <TouchableOpacity style={styles.closeHandle} onPress={onClose}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* Logout Loading Overlay */}
        {isLoggingOut && (
          <View style={styles.logoutOverlay}>
            <View style={styles.logoutLoaderContainer}>
              <ActivityIndicator size="large" color="#A6E66E" />
              <Text style={styles.logoutLoaderText}>Logging out...</Text>
            </View>
          </View>
        )}
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
  disabledSwitch: {
    opacity: 0.5,
  },
  logoutButton: {
    paddingVertical: 15,
    marginTop: 'auto',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
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
  // Logout Overlay Styles
  logoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logoutLoaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoutLoaderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
}); 