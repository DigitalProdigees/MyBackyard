import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Icons } from '../../constants/icons';
import { router, usePathname } from 'expo-router';
import { CircleButton } from './buttons';
import { useAppSelector } from '../store/hooks';
import { auth, rtdb } from '../lib/firebase';
import { ref, get, onValue, off } from 'firebase/database';
import ChatService from '../lib/services/chatService';
import { UnreadBanner } from './UnreadBanner';
import { useAuth } from '../lib/hooks/useAuth';
import { DrawerActions, useNavigation } from '@react-navigation/native';

export type HeaderComponentType = 'menu' | 'back' | 'notification' | 'bookmark' | 'none';

interface HeaderProps {
  leftComponent?: HeaderComponentType;
  centerComponent?: HeaderComponentType;
  rightComponent?: HeaderComponentType;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  onBookmarkPress?: () => void;
  customLeftComponent?: React.ReactNode;
  customCenterComponent?: React.ReactNode;
  customRightComponent?: React.ReactNode;
  refreshTrigger?: number; // Add refresh trigger prop
}

export function Header({
  leftComponent = 'none',
  centerComponent = 'none',
  rightComponent = 'none',
  onMenuPress,
  onBackPress,
  onNotificationPress,
  onBookmarkPress,
  customLeftComponent,
  customCenterComponent,
  customRightComponent,
  refreshTrigger
}: HeaderProps) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const pathname = usePathname();
  const [fullName, setFullName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch fullName from RTDB if not available in auth state
  useEffect(() => {
    const fetchFullName = async () => {
      if (user?.id) {
        try {
          const fullNameSnap = await get(ref(rtdb, `users/${user.id}/fullName`));
          if (fullNameSnap.exists()) {
            const name = String(fullNameSnap.val());
            setFullName(name);
          }
        } catch (error) {
          console.log('Error fetching fullName:', error);
        }
      }
    };

    fetchFullName();
  }, [user?.id]);

  // Force refresh unread count when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('Header: Refresh trigger activated, forcing unread count refresh');
      const forceRefreshUnreadCount = async () => {
        if (user?.id) {
          try {
            const chatService = ChatService.getInstance();
            const conversations = await chatService.getChatConversations();
            let unreadConversationsCount = 0;
            
            for (const conversation of conversations) {
              console.log(`Header: Force refresh - conversation ${conversation.id} unreadCount:`, conversation.unreadCount);
              if (conversation.unreadCount && conversation.unreadCount > 0) {
                unreadConversationsCount += 1;
              }
            }
            
            console.log('Header: Force refresh - unread conversations count:', unreadConversationsCount);
            console.log('Header: Setting unreadCount state to (force refresh):', unreadConversationsCount);
            setUnreadCount(unreadConversationsCount);
            
            // Force immediate re-render
            setTimeout(() => {
              console.log('Header: Force refresh completed, current unreadCount should be:', unreadConversationsCount);
            }, 100);
          } catch (error) {
            console.log('Header: Error in force refresh:', error);
          }
        }
      };
      forceRefreshUnreadCount();
    }
  }, [refreshTrigger, user?.id]);

  // Track unread conversations
  useEffect(() => {
    console.log('Header: useEffect triggered, user.id:', user?.id);
    const trackUnreadConversations = async () => {
      if (user?.id) {
        try {
          console.log('Header: Starting to track unread conversations');
          const chatService = ChatService.getInstance();
          const conversations = await chatService.getChatConversations();
          let unreadConversationsCount = 0;
          
          for (const conversation of conversations) {
            console.log(`Header: Initial conversation ${conversation.id} unreadCount:`, conversation.unreadCount);
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              unreadConversationsCount += 1; // Count conversations, not messages
            }
          }
          
          console.log('Header: Initial unread conversations count:', unreadConversationsCount);
          console.log('Header: Setting unreadCount state to:', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
        } catch (error) {
          console.log('Error tracking unread conversations:', error);
        }
      } else {
        console.log('Header: No user.id, skipping unread tracking');
      }
    };

    trackUnreadConversations();
    
    // Set up real-time listener for unread conversations
    if (user?.id) {
      console.log('Header: Setting up real-time listener for user:', user.id);
      const conversationsRef = ref(rtdb, `users/${user.id}/conversations`);
      const unsubscribe = onValue(conversationsRef, (snapshot) => {
        console.log('Header: Real-time listener triggered');
        try {
          if (!snapshot.exists()) {
            console.log('Header: No conversations exist, setting unread count to 0');
            setUnreadCount(0);
            return;
          }

          const conversations = snapshot.val();
          let unreadConversationsCount = 0;

          for (const conversationId in conversations) {
            const conversation = conversations[conversationId];
            console.log(`Header: Conversation ${conversationId} unreadCount:`, conversation.unreadCount);
            if (conversation.unreadCount && conversation.unreadCount > 0) {
              unreadConversationsCount += 1; // Count conversations, not messages
            }
          }

          console.log('Header: Real-time unread conversations count:', unreadConversationsCount);
          console.log('Header: Setting unreadCount state to (real-time):', unreadConversationsCount);
          setUnreadCount(unreadConversationsCount);
          
          // Force immediate re-render to ensure the banner updates instantly
          console.log('Header: Real-time update completed, banner should now reflect unreadCount:', unreadConversationsCount);
        } catch (error) {
          console.log('Error updating unread count:', error);
        }
      });

      return () => {
        off(conversationsRef);
        unsubscribe();
      };
    }
  }, [user?.id]);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/(main-app)/notification-centre');
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      // Open the drawer
      try {
        console.log('Header: Attempting to open drawer, pathname:', pathname);
        const nav = navigation as any;
        if (nav.openDrawer) {
          nav.openDrawer();
        } else if (nav.dispatch) {
          nav.dispatch(DrawerActions.openDrawer());
        } else {
          console.log('Header: Navigation does not have drawer methods');
        }
      } catch (error) {
        console.log('Header: Error opening drawer:', error);
      }
    }
  };

  const renderComponent = (type: HeaderComponentType, position: 'left' | 'center' | 'right') => {
    switch (type) {
      case 'menu':
        console.log('Header: Rendering menu component, unreadCount state:', unreadCount);
        return (
          <View style={styles.menuButtonContainer}>
            <CircleButton
              icon={Icons.category}
              onPress={handleMenuPress}
            />
            {unreadCount > 0 && (
              <UnreadBanner count={unreadCount} size="small" position="top-right" />
            )}
          </View>
        );
      case 'back':
        return (
          <CircleButton
            icon={Icons.back}
            onPress={handleBackPress}
          />
        );
      case 'notification':
        return (
          <CircleButton
            icon={Icons.notification}
            onPress={handleNotificationPress}
          />
        );
      case 'bookmark':
        return (
          <CircleButton
            icon={Icons.bookmark}
            onPress={onBookmarkPress || (() => console.log('Bookmark pressed'))}
          />
        );
      case 'none':
      default:
        return <View style={styles.spacer} />;
    }
  };

  return (
    <View style={styles.header}>
      {/* Left component */}
      <View style={styles.headerLeft}>
        {customLeftComponent || renderComponent(leftComponent, 'left')}
      </View>

      {/* Center component */}
      <View style={styles.headerCenter}>
        {customCenterComponent || renderComponent(centerComponent, 'center')}
      </View>

      {/* Right component */}
      <View style={styles.headerRight}>
        {customRightComponent || renderComponent(rightComponent, 'right')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuButtonContainer: {
    position: 'relative',
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 40,
  },
}); 