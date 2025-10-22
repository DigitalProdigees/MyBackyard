import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(user?.name ?? null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationText, setLocationText] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [stripeStatus, setStripeStatus] = useState({
    status: 'not_created',
    isChecking: false
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Check Stripe Connect status for owners
  useEffect(() => {
    const checkStripeStatus = async () => {
      console.log('CustomDrawerContent: Checking Stripe status', { 
        userId: user?.id, 
        userType: user?.type,
        isOwner: user?.type === 'owner'
      });

      if (!user?.id || user?.type !== 'owner') {
        console.log('CustomDrawerContent: Not checking Stripe status - not owner');
        return;
      }
      
      setStripeStatus(prev => ({ ...prev, isChecking: true }));
      
      try {
        const functions = getFunctions();
        const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
        
        const result = await checkStatus({ userId: user.id });
        const data = result.data as any;
        
        console.log('CustomDrawerContent: Stripe status result', data);
        
        if (data.success) {
          setStripeStatus({
            status: data.status,
            isChecking: false
          });
          console.log('CustomDrawerContent: Stripe status updated', data.status);
        }
      } catch (error) {
        console.log('Error checking Stripe status in drawer:', error);
        setStripeStatus(prev => ({ ...prev, isChecking: false }));
      }
    };

    checkStripeStatus();
  }, [user?.id, user?.type]);

  

  // Add periodic refresh for Stripe status (every 30 seconds)
  useEffect(() => {
    if (!user?.id || user?.type !== 'owner') return;

    const interval = setInterval(async () => {
      console.log('CustomDrawerContent: Periodic Stripe status check');
      try {
        const functions = getFunctions();
        const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
        
        const result = await checkStatus({ userId: user.id });
        const data = result.data as any;
        
        if (data.success) {
          setStripeStatus(prev => {
            if (prev.status !== data.status) {
              console.log('CustomDrawerContent: Stripe status changed from', prev.status, 'to', data.status);
              return {
                status: data.status,
                isChecking: false
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.log('Error in periodic Stripe status check:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, user?.type]);

  // Refresh Stripe status when drawer is focused/opened
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id && user?.type === 'owner') {
        console.log('CustomDrawerContent: Drawer focused, refreshing Stripe status');
        handleRefreshStripeStatus();
      }
    }, [user?.id, user?.type])
  );

  const getUserInitials = () => {
    const name = displayName || user?.name || user?.email || 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Determine if user is owner and get appropriate routes
  const isOwner = user?.type === 'owner';
  const baseRoute = isOwner ? '/(owner-app)/(main-app)' : '/(main-app)';
  
  // Check verification status for owners
  const isVerified = stripeStatus.status === 'verified';
  const isOwnerVerified = !isOwner || isVerified;
  const isOwnerPending = isOwner && !isVerified;

  // Debug logging
  console.log('CustomDrawerContent: Verification status debug', {
    userType: user?.type,
    isOwner,
    stripeStatus: stripeStatus.status,
    isVerified,
    isOwnerVerified,
    isOwnerPending,
    isChecking: stripeStatus.isChecking
  });

  const handleEditProfile = () => {
    props.navigation.closeDrawer();
    router.push({ pathname: `${baseRoute}/profile`, params: { mode: 'edit' } });
  };

  const handleRefreshStripeStatus = async () => {
    if (!user?.id || user?.type !== 'owner') return;
    
    console.log('CustomDrawerContent: Manual refresh of Stripe status');
    setStripeStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
      
      const result = await checkStatus({ userId: user.id });
      const data = result.data as any;
      
      console.log('CustomDrawerContent: Manual refresh result', data);
      
      if (data.success) {
        setStripeStatus({
          status: data.status,
          isChecking: false
        });
        console.log('CustomDrawerContent: Manual refresh - status updated to', data.status);
      }
    } catch (error) {
      console.log('Error in manual Stripe status refresh:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
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
              setIsLoggingOut(true);
              // Don't close drawer immediately - keep it open to show loader
              
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
              
              // Close drawer after logout is complete
              props.navigation.closeDrawer();
            } catch (error) {
              setIsLoggingOut(false);
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
          <TouchableOpacity 
            style={[styles.editProfileButton, isOwnerPending && styles.disabledEditProfileButton]} 
            onPress={isOwnerPending ? () => {} : handleEditProfile}
            disabled={isOwnerPending}
          >
            <Text style={[styles.editProfileText, isOwnerPending && styles.disabledEditProfileText]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Verification Status Banner for Owners */}
      {isOwnerPending && (
        <View style={styles.verificationBanner}>
          <Text style={styles.verificationBannerText}>
            Complete KYC to access all features
          </Text>
          <Text style={styles.debugText}>
            Status: {stripeStatus.status} | Checking: {stripeStatus.isChecking ? 'Yes' : 'No'}
          </Text>
          {/* Refresh moved to Owner Home screen */}
        </View>
      )}

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/home`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Home</Text>
        </TouchableOpacity>

        {/* Show different menu items based on user type */}
        {isOwner ? (
          <>
            <TouchableOpacity
              style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
              onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/home`)}
              disabled={isOwnerPending}
            >
              <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>My Listings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
              onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/my-orders`)}
              disabled={isOwnerPending}
            >
              <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>My Orders</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
              onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/my-earnings`)}
              disabled={isOwnerPending}
            >
              <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>My Earnings</Text>
            </TouchableOpacity> */}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
            onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/my-bookings`)}
            disabled={isOwnerPending}
          >
            <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>My Bookings</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/messaging`)}
          disabled={isOwnerPending}
        >
          <View style={styles.menuItemWithBanner}>
            <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Messaging</Text>
            {unreadCount > 0 && !isOwnerPending && (
              <UnreadBanner count={unreadCount} size="small" position="top-right" />
            )}
          </View>
        </TouchableOpacity>

        <View style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}>
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Notifications</Text>
          <ToggleSwitch
            isOn={notificationsEnabled}
            onColor="#BADA8B"
            offColor="#757575"
            size="small"
            onToggle={isOwnerPending ? () => {} : setNotificationsEnabled}
            thumbOnStyle={styles.thumbOn}
            thumbOffStyle={styles.thumbOff}
            disabled={isOwnerPending}
          />
        </View>

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/change-pass`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/reset-pass`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Reset Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/contact-us`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Contact Us</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/terms-conditions`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Terms of Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, isOwnerPending && styles.disabledMenuItem]}
          onPress={isOwnerPending ? () => {} : () => handleNavigation(`${baseRoute}/privacy-policy`)}
          disabled={isOwnerPending}
        >
          <Text style={[styles.menuText, isOwnerPending && styles.disabledMenuText]}>Privacy Policy</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity 
        style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.logoutText}>Logging out...</Text>
          </>
        ) : (
          <>
            <Image
              source={require('../../../assets/icons/icLogout.png')}
              style={styles.logoutIcon}
              resizeMode='contain'
            />
            <Text style={styles.logoutText}>Logout</Text>
          </>
        )}
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
  logoutButtonDisabled: {
    opacity: 0.6,
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
  disabledMenuItem: {
    opacity: 0.5,
  },
  disabledMenuText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  disabledEditProfileButton: {
    backgroundColor: 'rgba(70, 182, 73, 0.5)',
  },
  disabledEditProfileText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  verificationBanner: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  verificationBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  refreshIcon: {
    width: 22,
    height: 22,
    tintColor: 'white',
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
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

