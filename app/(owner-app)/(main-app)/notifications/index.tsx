import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Dimensions, TextInput, Alert } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { BackButton, GradientBackground, UnreadBanner } from '@/app/components';
import { SafeAreaView } from 'react-native-safe-area-context';  // ✅ added
import { useAuth } from '@/app/lib/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { sessionService } from '@/app/lib/services/sessionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import ChatService from '@/app/lib/services/chatService';
import { capitalizeFirstLetter } from '@/app/lib/utils/textUtils';


const { width, height } = Dimensions.get('window');

export default function Notifications() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(user?.name ?? null);
  const [locationText, setLocationText] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Log user data when component mounts or user changes
  useEffect(() => {
    console.log('Notifications screen - User data received:', user);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const nameRef = ref(rtdb, `users/${uid}/fullName`);
    const locRef = ref(rtdb, `users/${uid}`);
    const unsub = onValue(nameRef, (snap) => {
      const v = snap.val();
      if (v) setDisplayName(String(v));
    });
    const unsub2 = onValue(locRef, (snap) => {
      const data = snap.val() || {};
      const country = data.country || '';
      const city = data.city || '';
      const stateVal = data.state || '';
      const parts = [city, stateVal, country].filter(Boolean);
      setLocationText(parts.length ? parts.join(', ') : '');
      
        // Load profile image - try Storage URL first, fallback to base64
        if (data.profileImageUrl) {
          setProfileImage(data.profileImageUrl);
        } else if (data.profileImage) {
          const mimeType = data.profileImageMimeType || 'image/jpeg';
          const imageUri = `data:${mimeType};base64,${data.profileImage}`;
          setProfileImage(imageUri);
        }
    });
    return () => {
      try { off(nameRef); } catch { }
      try { off(locRef); } catch { }
      try { unsub(); } catch { }
      try { unsub2(); } catch { }
    };
  }, [user]);

  // Refresh profile data when screen comes into focus (e.g., returning from edit mode)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Notifications screen focused - checking for updated profile data');
    }, [])
  );

  // Track unread messages
  useFocusEffect(
    React.useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const trackUnreadConversations = async () => {
        try {
          const chatService = ChatService.getInstance();
          const conversations = await chatService.getChatConversations();
          let unreadConversationsCount = 0;
          
          for (const conversation of conversations) {
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              unreadConversationsCount += 1; // Count conversations, not messages
            }
          }
          
          console.log('Owner Notifications: Total unread conversations count:', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
        } catch (error) {
          console.error('Error tracking unread conversations:', error);
        }
      };

      trackUnreadConversations();
      
      // Set up real-time listener for unread conversations
      const conversationsRef = ref(rtdb, `users/${uid}/conversations`);
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

          console.log('Owner Notifications: Real-time unread conversations count:', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
        } catch (error) {
          console.error('Error updating unread count:', error);
        }
      });

      return () => {
        try { off(conversationsRef); } catch { }
        try { unsubscribe(); } catch { }
      };
    }, [])
  );

  const handleBack = () => {
    router.back();
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    const name = displayName || user?.name || user?.email || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEditProfile = () => {
    // Navigate to profile screen with edit mode and current user data
    console.log('Edit Profile pressed, navigating to profile screen');
    router.push({
      pathname: '/(owner-app)/(main-app)/profile',
      params: {
        mode: 'edit',
      }
    });
  };

  const handleLogout = () => {
    console.log('Logout button pressed');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('Logout confirmed, starting logout process');
            try {
              // Set user offline BEFORE signing out to avoid permission errors
              const ChatService = (await import('@/app/lib/services/chatService')).default;
              const chatService = ChatService.getInstance();
              await chatService.setUserOffline();
              console.log('User set to offline before logout');

              // Clear all session data including payment sessions and navigation state
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
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
              const { auth } = await import('@/app/lib/firebase');
              await signOut(auth);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleMenuItem = (menuItem: string) => {
    // Handle menu item navigation
    console.log(`${menuItem} pressed`);

    switch (menuItem) {
      case 'Change Password':
        router.push('../change-pass');
        break;
      case 'My Order':
        router.push('/(owner-app)/(main-app)/my-orders');
        break;
      case 'My Listings':
        router.push('/(owner-app)/(main-app)/home');
        break;
      case 'Messaging':
        router.push('/(owner-app)/(main-app)/messaging');
        break;
      case 'Reset Password':
        router.push('../reset-pass');
        break;
      case 'Contact Us':
        router.push('/(owner-app)/(main-app)/contact-us');
        break;
      case 'Terms of Services':
        router.push('../terms-conditions');
        break;
      case 'Privacy Policy':
        router.push('../privacy-policy');
        break;
      default:
        console.log(`No navigation defined for: ${menuItem}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <GradientBackground />

      {/* Left Sidebar Menu */}
      <View style={styles.sidebar}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageInitials}>{getUserInitials()}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{capitalizeFirstLetter(displayName || user?.name || user?.email || 'User')}</Text>
            <Text style={styles.userLocation}>{locationText || 'Update your location'}</Text>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Menu */}
        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('My Order')}>
            <Text style={styles.menuText}>My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('My Listings')}>
            <Text style={styles.menuText}>My Listings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Messaging')}>
            <View style={styles.menuItemWithBanner}>
              <Text style={styles.menuText}>Messaging</Text>
              {unreadCount > 0 && (
                <UnreadBanner count={unreadCount} size="small" position="top-right" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Text style={styles.menuText}>Notifications</Text>
            <ToggleSwitch
              isOn={notificationsEnabled}
              onColor="#BADA8B"
              offColor="#757575"
              size="small"
              onToggle={setNotificationsEnabled}
              labelStyle={styles.switch}
              thumbOnStyle={styles.thumbOn}
              thumbOffStyle={styles.thumbOff}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Change Password')}>
            <Text style={styles.menuText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Reset Password')}>
            <Text style={styles.menuText}>Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Contact Us')}>
            <Text style={styles.menuText}>Contact Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Terms of Services')}>
            <Text style={styles.menuText}>Terms of Services</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('Privacy Policy')}>
            <Text style={styles.menuText}>Privacy Policy</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Image
            source={require('../../../../assets/icons/icLogout.png')}
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Right Mobile Frame Overlay */}
      <View style={styles.mobileFrameContainer} pointerEvents="none">
        <Image
          source={require('../../../../assets/icons/icCover.png')}
          style={styles.mobileFrame}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.65,
    backgroundColor: 'transparent',
    paddingBottom: 40,
  },
  profileSection: {
    borderWidth: 1,
    borderBottomRightRadius: 30,
    borderColor: '#202857',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    padding: 20,
    backgroundColor: '#222952'
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 40,
    top: -20,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 40,
    top: -20,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileImageInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
  },
  userLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'left',
  },
  editProfileButton: {
    backgroundColor: '#46B649',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    overflow: 'visible', // Ensure banner is not clipped
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'visible', // Ensure banner is not clipped
  },
  menuItemWithBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingRight: 10, // Add space for banner
    minHeight: 24, // Ensure minimum height for banner
  },
  menuText: {
    color: 'white',
    fontSize: 16,
    marginRight: 10
  },
  switch: {},
  thumbOn: {
    backgroundColor: '#000000',
    width: 10,
    height: 10,
    marginLeft: 10
  },
  thumbOff: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    marginLeft: 5
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  logoutIcon: {
    resizeMode: 'contain',
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: 'white',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  mobileFrameContainer: {},
  mobileFrame: {
    width: width * 1.2,
    height: height * 0.8,
    resizeMode: 'contain',
    marginRight: -width * 0.1,
    marginTop: width * 0.25,
    marginLeft: -width * 0.27,
  },
});
