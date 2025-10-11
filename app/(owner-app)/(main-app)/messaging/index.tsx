import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useNavigation } from 'expo-router';

import { Contact } from './types';
import { ContactItem } from './components/ContactItem';
import { ConversationItem } from './components/ConversationItem';
import { GradientBackground, Header } from '@/app/components';
import { Icons } from '@/constants/icons';
import ChatService, { ChatConversation } from '@/app/lib/services/chatService';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase';
import { getUserProfileImage } from '@/app/lib/utils/profileImageUtils';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
const { width, height } = Dimensions.get('window');

export default function Messaging() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [profileImages, setProfileImages] = useState<{[userId: string]: string}>({});
  const chatService = ChatService.getInstance();
  const conversationsRef = useRef<ChatConversation[]>([]);
  const returningFromChatRef = useRef<boolean>(false);

  useEffect(() => {
    loadConversations();
    
    // Set up real-time listener for conversations
    const currentUserId = chatService.getCurrentUserId();
    if (currentUserId) {
      currentUserId.then(async (userId) => {
        if (userId) {
          const conversationsRef = ref(rtdb, `users/${userId}/conversations`);
          const unsubscribe = onValue(conversationsRef, async (snapshot) => {
            if (snapshot.exists()) {
              const conversationsData = snapshot.val();
              console.log('Owner Messaging: Real-time conversations update:', conversationsData);
              
              // Convert to ChatConversation format
              const updatedConversations: ChatConversation[] = [];
              for (const [conversationId, conversationData] of Object.entries(conversationsData)) {
                const conv = conversationData as any;
                
                if (conv && conv.contactId && conv.contactName) {
                  const contact = {
                    id: conv.contactId,
                    name: conv.contactName,
                    avatar: conv.contactAvatar,
                    status: await chatService.getUserStatus(conv.contactId),
                    ownerId: conv.contactId,
                    listingId: conv.listingId
                  };
                  
                  const conversation: ChatConversation = {
                    id: conversationId,
                    contact: contact,
                    messages: [],
                    lastMessage: conv.lastMessage ? {
                      id: 'temp',
                      sequentialId: 0, // Temporary value for last message
                      senderId: conv.lastMessageSenderId || conv.contactId,
                      receiverId: userId,
                      senderType: conv.lastMessageSenderType || 'rental', // Use stored sender type
                      messageType: 'text', // Default to text for conversation cards
                      text: conv.lastMessage,
                      timestamp: conv.lastMessageTime,
                      isRead: true
                    } : undefined,
                    unreadCount: conv.unreadCount || 0
                  };
                  
                  console.log(`Owner Messaging: Conversation ${conversationId} unreadCount:`, conv.unreadCount, '->', conversation.unreadCount);
                  updatedConversations.push(conversation);
                }
              }
              
              // Sort conversations: unread messages first, then by most recent message
              const sortedConversations = updatedConversations.sort((a, b) => {
                // First priority: conversations with unread messages
                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
                
                // Second priority: sort by most recent message timestamp
                const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
                const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
                return bTime - aTime; // Most recent first
              });
              
              setConversations(sortedConversations);
            }
          });
          
          // Store unsubscribe function for cleanup
          (window as any).conversationsUnsubscribe = unsubscribe;
        }
      });
    }
    
    return () => {
      if ((window as any).conversationsUnsubscribe) {
        (window as any).conversationsUnsubscribe();
      }
    };
  }, []);

  // Refresh conversations when screen comes into focus (e.g., returning from chat)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Owner Messaging: Screen focused, refreshing conversations');
      
      // Check if we're returning from chat screen
      if (returningFromChatRef.current) {
        console.log('Owner Messaging: Returning from chat screen, resetting unread counts');
        returningFromChatRef.current = false; // Reset the flag
        
        // Reset unread counts for all conversations when returning from chat
        const resetUnreadCounts = async () => {
          try {
            const currentUserId = await chatService.getCurrentUserId();
            if (currentUserId) {
              // Get all conversations and reset their unread counts
              const currentConversations = conversationsRef.current;
              console.log('Owner Messaging: Current conversations before reset:', currentConversations.map(c => ({ id: c.id, name: c.contact.name, unreadCount: c.unreadCount })));
              
              for (const conversation of currentConversations) {
                if (conversation.unreadCount > 0) {
                  console.log(`Owner Messaging: Resetting unread count for conversation ${conversation.id} (${conversation.contact.name}) from ${conversation.unreadCount} to 0`);
                  await chatService.markConversationAsRead(conversation.id, currentUserId);
                  console.log(`Owner Messaging: Successfully reset unread count for conversation ${conversation.id}`);
                }
              }
              
              // Wait a bit for Firebase to propagate the changes
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Force reset all unread counts one more time to ensure they're zero
              for (const conversation of currentConversations) {
                await chatService.markConversationAsRead(conversation.id, currentUserId);
                console.log(`Owner Messaging: Force reset unread count for conversation ${conversation.id}`);
              }
              
              // Load conversations after resetting unread counts
              console.log('Owner Messaging: Loading conversations after reset...');
              await loadConversations();
            }
          } catch (error) {
            console.error('Owner Messaging: Error resetting unread counts:', error);
            // Still load conversations even if reset fails
            loadConversations();
          }
        };
        
        resetUnreadCounts();
      } else {
        // Normal focus - just load conversations
        loadConversations();
      }
    }, [])
  );

  // Update ref when conversations change
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Real-time status monitoring for all contacts
  useEffect(() => {
    if (conversations.length === 0) return;

    const statusCheckInterval = setInterval(async () => {
      // Get current conversations from ref to avoid stale closure
      const currentConversations = conversationsRef.current;
      
      // Update status for all conversations
      const updatedConversations = await Promise.all(
        currentConversations.map(async (conversation) => {
          const newStatus = await chatService.getUserStatus(conversation.contact.id);
          
          if (newStatus !== conversation.contact.status) {
            return {
              ...conversation,
              contact: {
                ...conversation.contact,
                status: newStatus
              }
            };
          }
          return conversation;
        })
      );

      // Check if any status changed
      const hasChanges = updatedConversations.some((updated, index) => 
        updated.contact.status !== currentConversations[index].contact.status
      );

      if (hasChanges) {
        // Sort conversations: unread messages first, then by most recent message
        const sortedConversations = updatedConversations.sort((a, b) => {
          // First priority: conversations with unread messages
          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
          if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
          
          // Second priority: sort by most recent message timestamp
          const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
        
        setConversations(sortedConversations);
      }
    }, 3000); // Check every 3 seconds

    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [conversations.length]); // Only depend on conversations length to avoid infinite loops

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      // Set current user as online
      await chatService.setUserOnline();
      
      // Debug: Check current state
      await chatService.debugCurrentState();
      
      // Load conversations
      const chatConversations = await chatService.getChatConversations();
      
      // Sort conversations: unread messages first, then by most recent message
      const sortedConversations = chatConversations.sort((a, b) => {
        // First priority: conversations with unread messages
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        // Second priority: sort by most recent message timestamp
        const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return bTime - aTime; // Most recent first
      });
      
      setConversations(sortedConversations);
      
      // Load profile images for all contacts
      loadProfileImages(chatConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile images for all conversations
  const loadProfileImages = async (conversations: ChatConversation[]) => {
    try {
      const imagePromises = conversations.map(async (conversation) => {
        const profileImageData = await getUserProfileImage(conversation.contact.id);
        return {
          userId: conversation.contact.id,
          imageUri: profileImageData?.uri || null
        };
      });

      const imageResults = await Promise.all(imagePromises);
      const imageMap: {[userId: string]: string} = {};
      
      imageResults.forEach(result => {
        if (result.imageUri) {
          imageMap[result.userId] = result.imageUri;
        }
      });

      setProfileImages(imageMap);
    } catch (error) {
      console.error('Error loading profile images:', error);
    }
  };

  const handleContactPress = (contact: Contact) => {
    console.log('Contact pressed:', contact.name);
    router.push({
      pathname: '/(owner-app)/(main-app)/chat',
      params: {
        contactName: contact.name,
        contactAvatar: contact.avatar,
        renterId: contact.id,
        listingId: contact.listingId
      }
    });
  };

  const handleConversationPress = (conversation: ChatConversation) => {
    console.log('Conversation pressed:', conversation.contact.name);
    // Set flag to indicate we're navigating to chat
    returningFromChatRef.current = true;
    router.push({
      pathname: '/(owner-app)/(main-app)/chat',
      params: {
        contactName: conversation.contact.name,
        contactAvatar: conversation.contact.avatar,
        renterId: conversation.contact.ownerId || conversation.contact.id,
        listingId: conversation.contact.listingId
      }
    });
  };

  const handleComposePress = () => {
    console.log('Compose new message');
    // Navigate to new message screen
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={{ paddingTop: 26 }} /><Header
        customLeftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={Icons.back}
              style={{
                height: 50,
                width: 50,
                zIndex: 999,
              }}
            /></TouchableOpacity>
        }
        customCenterComponent={
          <Text style={styles.headerTitle}>Messaging</Text>
        }
        customRightComponent={
          <TouchableOpacity onPress={() => router.push('/(main-app)/notification-centre')}>
            <Image
              source={require('../../../../assets/icons/icBELL.png')}
              style={styles.headerBellIcon}
            />
          </TouchableOpacity>
        }
      />

      {/* Recent Contacts - Horizontal Scroll */}
      <View style={styles.recentContactsContainer}>
        <Text style={styles.sectionTitle}>Recent Contacts</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contactsRow}
        >
          {conversations.slice(0, 5).map((conversation) => {
            const profileImage = profileImages[conversation.contact.id];
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.contactAvatar}
                onPress={() => handleConversationPress(conversation)}
              >
                <View style={styles.avatarContainer}>
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {conversation.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: conversation.contact.status === 'online' ? '#4CAF50' : '#9E9E9E' }
                  ]} />
                </View>
                <Text style={styles.contactName} numberOfLines={1}>
                  {conversation.contact.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Bar */}
      

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Conversations */}
        <View style={styles.conversationsContainer}>
          {isLoading ? (
            <LoadingSpinner 
              visible={true} 
              text="Loading conversations..." 
              overlay={false}
            />
          ) : conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No conversations yet</Text>
              <Text style={styles.emptyStateSubtext}>Potential renters will appear here when they start chatting with you</Text>
            </View>
          ) : (
            conversations.map((conversation) => {
              const lastMessageTime = conversation.lastMessage 
                ? new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              
              // Check if last message is from current user (owner in owner-app)
              const isLastMessageFromCurrentUser = conversation.lastMessage && 
                conversation.lastMessage.senderType === 'owner';
              
              // Format last message text
              const lastMessageText = conversation.lastMessage 
                ? (isLastMessageFromCurrentUser ? `You: ${conversation.lastMessage.text}` : conversation.lastMessage.text)
                : '';
              
              const profileImage = profileImages[conversation.contact.id];
              console.log(`Owner Messaging: Conversation ${conversation.contact.name} unread count:`, conversation.unreadCount);
              return (
                <ConversationItem
                  key={conversation.id}
                  contact={{
                    id: conversation.contact.id,
                    name: conversation.contact.name,
                    avatar: profileImage || conversation.contact.avatar,
                    status: conversation.contact.status,
                  }}
                  lastMessage={lastMessageText || 'No messages yet'}
                  time={lastMessageTime}
                  unreadCount={conversation.unreadCount || 0}
                  onPress={() => handleConversationPress(conversation)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Compose Button */}
      <TouchableOpacity
        style={styles.composeButton}
        onPress={handleComposePress}
      >
        <Image
          source={require('../../../../assets/icons/new.png')}
          style={styles.buttonIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBellIcon: {
    width: 53,
    height: 53,
    resizeMode: 'contain',
  },
  container: {
    flex: 1,

  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    height: '60%',
    maxHeight: '63%',
  },
  contentContainer: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  searchContainer: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  recentContactsContainer: {
    paddingVertical: 16,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  contactsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contactAvatar: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  contactName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  conversationsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  composeButton: {
    borderRadius: 30,
    top:'85%',
    left:'75%',
    alignItems: 'flex-end',
    position:'absolute',
    paddingHorizontal: 16,
    
    marginTop: 10
  },
  buttonIcon: {
    width: 64,
    height: 64,
  },
});