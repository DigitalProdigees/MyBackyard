import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Alert } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { GradientBackground } from '../GradientBackground';
import { useAuth } from '../../lib/hooks/useAuth';
import { auth, rtdb } from '../../lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import ChatService from '../../lib/services/chatService';
import { UnreadBanner } from '../UnreadBanner';
import { capitalizeFirstLetter } from '../../lib/utils/textUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ToggleSwitch from 'toggle-switch-react-native';

const { width } = Dimensions.get('window');

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(user?.name ?? null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationText, setLocationText] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Load profile data from Firebase
  useEffect(() => {
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
  }, []);

  // Track unread conversations
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const trackUnreadConversations = async () => {
      try {
        const chatService = ChatService.getInstance();
        const conversations = await chatService.getChatConversations();
        let unreadConversationsCount = 0;
        
        for (const conversation of conversations) {
          if (conversation.unreadCount && conversation.unreadCount > 0) {
            unreadConversationsCount += 1;
          }
        }
        
        setUnreadCount(unreadConversationsCount);
      } catch (error) {
        console.log('Error tracking unread conversations:', error);
      }
    };

    trackUnreadConversations();
    
    // Set up real-time listener
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
            unreadConversationsCount += 1;
          }
        }

        setUnreadCount(unreadConversationsCount);
      } catch (error) {
        console.log('Error updating unread count:', error);
      }
    });

    return () => {
      try { off(conversationsRef); } catch { }
      try { unsubscribe(); } catch { }
    };
  }, []);

  const getUserInitials = () => {
    const name = displayName || user?.name || user?.email || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEditProfile = () => {
    props.navigation.closeDrawer();
    router.push({ pathname: '/(main-app)/profile', params: { mode: 'edit' } });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              props.navigation.closeDrawer();
              
              // Set user offline BEFORE signing out
              const ChatService = (await import('../../lib/services/chatService')).default;
              const chatService = ChatService.getInstance();
              await chatService.setUserOffline();

              // Clear all session data
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

              await new Promise(resolve => setTimeout(resolve, 500));

              const { signOut } = await import('firebase/auth');
              const { auth } = await import('../../lib/firebase');
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleNavigation = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <GradientBackground />
      
      {/* Profile Section */}
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
          <Text style={styles.userName}>
            {capitalizeFirstLetter(displayName || user?.name || user?.email || 'User')}
          </Text>
          <Text style={styles.userLocation}>{locationText || 'Update your location'}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/home')}
        >
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/my-bookings')}
        >
          <Text style={styles.menuText}>My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/messaging')}
        >
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
            thumbOnStyle={styles.thumbOn}
            thumbOffStyle={styles.thumbOff}
          />
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/change-pass')}
        >
          <Text style={styles.menuText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/reset-pass')}
        >
          <Text style={styles.menuText}>Reset Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/contact-us')}
        >
          <Text style={styles.menuText}>Contact Us</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/terms-conditions')}
        >
          <Text style={styles.menuText}>Terms of Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleNavigation('/(main-app)/privacy-policy')}
        >
          <Text style={styles.menuText}>Privacy Policy</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Image
          source={require('../../../assets/icons/icLogout.png')}
          style={styles.logoutIcon}
        />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    borderWidth: 1,
    borderBottomRightRadius: 30,
    borderColor: '#202857',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#222952',
    marginTop: 20,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileImageInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 12,
  },
  editProfileButton: {
    backgroundColor: '#46B649',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editProfileText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemWithBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  menuText: {
    color: 'white',
    fontSize: 15,
    marginRight: 10,
  },
  thumbOn: {
    backgroundColor: '#000000',
    width: 10,
    height: 10,
    marginLeft: 10,
  },
  thumbOff: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    marginLeft: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutIcon: {
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
});

