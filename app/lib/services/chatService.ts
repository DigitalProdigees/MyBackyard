import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { ref, push, set, get, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase';
import { cleanupLegacyChatData, emergencyCleanup } from '../utils/storageCleanup';

export interface ChatContact {
  id: string;
  name: string;
  avatar?: any;
  status: 'online' | 'offline';
  lastSeen?: string;
  ownerId?: string;
  listingId?: string;
}

export interface ChatMessage {
  id: string;
  sequentialId: number; // 1, 2, 3, 4...
  senderId: string;
  receiverId: string;
  senderType: 'owner' | 'rental'; // Track if sender is owner or rental
  messageType: 'text' | 'emoji' | 'file'; // Type of message
  text?: string; // For text and emoji messages
  emoji?: string; // For emoji messages
  fileData?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl?: string; // For uploaded files
    localUri?: string; // For local files before upload
    base64Data?: string; // For shared files via base64
    mimeType?: string; // MIME type for base64 data
  };
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed'; // Message status for optimistic UI
  isRead: boolean;
  listingId?: string;
}

export interface ChatConversation {
  id: string;
  contact: ChatContact;
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

class ChatService {
  private static instance: ChatService;
  private onlineUsers: Set<string> = new Set();
  private appStateSubscription: any = null;
  private onlineUsersListener: any = null;

  private constructor() {
    this.initializeAppStateListener();
    this.initializeOnlineUsersListener();
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async clearTemporaryData(): Promise<void> {
    try {
      console.log('ChatService: Clearing temporary user data');
      // Clear any temporary user data
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.uid && user.uid.startsWith('temp_user_')) {
          console.log('ChatService: Removing temporary user:', user.uid);
          // Remove from online users list
          const onlineUsers = await this.getOnlineUsers();
          const filteredUsers = onlineUsers.filter(id => id !== user.uid);
          await AsyncStorage.setItem('online_users', JSON.stringify(filteredUsers));
          this.onlineUsers.delete(user.uid);
          // Clear user data
          await AsyncStorage.removeItem('user_data');
        }
      }
    } catch (error) {
      console.error('Error clearing temporary data:', error);
    }
  }

  private initializeAppStateListener() {
    // Listen to app state changes to track online/offline status
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.setUserOnline();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.setUserOffline();
      }
    });
  }

  private initializeOnlineUsersListener() {
    // Listen to Firebase for real-time online users updates
    const onlineUsersRef = ref(rtdb, 'online_users');
    this.onlineUsersListener = onValue(onlineUsersRef, (snapshot) => {
      const onlineUsersData = snapshot.val();
      
      // Handle both array and object formats from Firebase
      let onlineUsersArray: string[] = [];
      
      if (Array.isArray(onlineUsersData)) {
        // If it's already an array, use it directly
        onlineUsersArray = onlineUsersData.filter(Boolean);
      } else if (onlineUsersData && typeof onlineUsersData === 'object') {
        // If it's an object, convert to array
        onlineUsersArray = Object.values(onlineUsersData).filter(Boolean) as string[];
      }
      
      this.onlineUsers = new Set(onlineUsersArray);
    });
  }

  public async setUserOnline(userId?: string): Promise<void> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      console.log(`ChatService: Setting user online - ID: ${currentUserId}`);
      if (currentUserId) {
        this.onlineUsers.add(currentUserId);
        await this.updateUserStatus(currentUserId, 'online');
        
        // Update online users list in Firebase (shared across all apps)
        const onlineUsersRef = ref(rtdb, 'online_users');
        const onlineUsersArray = Array.from(this.onlineUsers);
        await set(onlineUsersRef, onlineUsersArray);
        
        console.log(`ChatService: User ${currentUserId} is now online`);
      }
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  public async setUserOffline(userId?: string): Promise<void> {
    try {
      const currentUserId = userId || await this.getCurrentUserId();
      console.log(`ChatService: Setting user offline - ID: ${currentUserId}`);
      if (currentUserId) {
        this.onlineUsers.delete(currentUserId);
        await this.updateUserStatus(currentUserId, 'offline');
        
        // Update online users list in Firebase (shared across all apps)
        const onlineUsersRef = ref(rtdb, 'online_users');
        const onlineUsersArray = Array.from(this.onlineUsers);
        await set(onlineUsersRef, onlineUsersArray);
        
        console.log(`ChatService: User ${currentUserId} is now offline`);
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  public async getUserStatus(userId: string): Promise<'online' | 'offline'> {
    try {
      // Check Firebase for user status first
      const userStatusRef = ref(rtdb, `users/${userId}/status`);
      const statusSnapshot = await get(userStatusRef);
      
      if (statusSnapshot.exists()) {
        const status = statusSnapshot.val();
        return status;
      }
      
      // Fallback: Check if user is in the online users list
      const onlineUsers = await this.getOnlineUsers();
      const isInOnlineList = onlineUsers.includes(userId);
      
      if (isInOnlineList) {
        return 'online';
      }
      
      // Default to offline if no status found
      return 'offline';
    } catch (error) {
      console.error('Error getting user status:', error);
      return 'offline'; // Default to offline if error
    }
  }

  public async getOnlineUsers(): Promise<string[]> {
    try {
      // Fetch online users from Firebase (shared across all apps)
      const onlineUsersRef = ref(rtdb, 'online_users');
      const snapshot = await get(onlineUsersRef);
      const onlineUsers = snapshot.val() || [];
      return onlineUsers;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  private async updateUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      // Store user status in Firebase instead of AsyncStorage
      const userStatusRef = ref(rtdb, `users/${userId}/status`);
      await set(userStatusRef, status);
      
      // Update last seen timestamp for offline users in Firebase
      if (status === 'offline') {
        const lastSeen = new Date().toISOString();
        const lastSeenRef = ref(rtdb, `users/${userId}/lastSeen`);
        await set(lastSeenRef, lastSeen);
      }
      
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  public async getCurrentUserId(): Promise<string | null> {
    try {
      // Always try Firebase auth first to get the real UID
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (currentUser) {
        
        // Check if we have temporary user data that needs to be replaced
        const existingUserData = await AsyncStorage.getItem('user_data');
        if (existingUserData) {
          const existingUser = JSON.parse(existingUserData);
          if (existingUser.uid && existingUser.uid.startsWith('temp_user_')) {
            // Clear the temporary user from online users list
            const onlineUsers = await this.getOnlineUsers();
            const filteredUsers = onlineUsers.filter(id => id !== existingUser.uid);
            await AsyncStorage.setItem('online_users', JSON.stringify(filteredUsers));
            this.onlineUsers.delete(existingUser.uid);
          }
        }
        
        // Store the Firebase user data in AsyncStorage for consistency
        const firebaseUserData = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || ''
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(firebaseUserData));
        
        return currentUser.uid;
      }
      
      // If no Firebase user, try AsyncStorage as fallback
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        const userId = user.uid || user.id;
        return userId;
      }
      
      // Only create temporary ID if absolutely no user is found
      const tempUserId = 'temp_user_' + Date.now();
      
      // Store the temporary user data
      const tempUserData = {
        uid: tempUserId,
        email: 'temp@demo.com',
        displayName: 'Demo User'
      };
      await AsyncStorage.setItem('user_data', JSON.stringify(tempUserData));
      
      return tempUserId;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  public async getChatConversations(): Promise<ChatConversation[]> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) return [];

      const conversations: ChatConversation[] = [];
      
      // Simple: Get conversation cards from user's conversations
      const userConversationsRef = ref(rtdb, `users/${currentUserId}/conversations`);
      const conversationsSnapshot = await get(userConversationsRef);
      
      if (conversationsSnapshot.exists()) {
        const conversationsData = conversationsSnapshot.val();
        
        for (const [conversationId, conversationData] of Object.entries(conversationsData)) {
          const conv = conversationData as any;
          
          // Skip if conversation data is invalid
          if (!conv || !conv.contactId || !conv.contactName) {
            continue;
          }
          
          // Create simple contact object
          const contact = {
            id: conv.contactId,
            name: conv.contactName,
            avatar: conv.contactAvatar,
            status: await this.getUserStatus(conv.contactId),
            ownerId: conv.contactId,
            listingId: conv.listingId
          };
          
          // Create conversation with last message
          const conversation: ChatConversation = {
            id: conversationId,
            contact: contact,
            messages: [],
            lastMessage: conv.lastMessage ? {
              id: 'temp',
              sequentialId: 0, // Temporary value for last message
              senderId: conv.lastMessageSenderId || conv.contactId,
              receiverId: currentUserId,
              senderType: conv.lastMessageSenderType || 'owner', // Use stored sender type
              messageType: 'text', // Default to text for conversation cards
              text: conv.lastMessage,
              timestamp: conv.lastMessageTime,
              isRead: true
            } : undefined,
            unreadCount: conv.unreadCount || 0
          };
          
          
          conversations.push(conversation);
        }
      }

      return conversations;
    } catch (error) {
      console.error('Error getting chat conversations:', error);
      return [];
    }
  }

  public async createOrUpdateConversation(contact: ChatContact): Promise<ChatConversation> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) throw new Error('No current user ID');
      
      // Create a consistent conversation ID based on both users' IDs
      const conversationId = this.generateConversationId(currentUserId, contact.id);
      const conversationRef = ref(rtdb, `users/${currentUserId}/conversations/${conversationId}`);
      
      // Check if conversation exists
      const snapshot = await get(conversationRef);
      
      let conversation: ChatConversation;
      if (snapshot.exists()) {
        // Update existing conversation
        conversation = snapshot.val() as ChatConversation;
        conversation.contact = { ...conversation.contact, ...contact };
      } else {
        // Create new conversation
        conversation = {
          id: conversationId,
          contact,
          messages: [],
          unreadCount: 0
        };
      }

      // Save to Firebase under user-specific path
      await set(conversationRef, conversation);
      
      return conversation;
    } catch (error) {
      console.error('Error creating/updating conversation:', error);
      throw error;
    }
  }

  public async getMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    try {
      // Simple: Read from shared conversation path
      const messagesRef = ref(rtdb, `conversations/${conversationId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messages: ChatMessage[] = Object.values(messagesData || {});
        // Sort by sequential ID for proper message order
        messages.sort((a, b) => a.sequentialId - b.sequentialId);
        return messages;
      }
      return [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  public async sendMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead' | 'sequentialId' | 'senderType' | 'messageType'>, senderType: 'owner' | 'rental', messageType: 'text' | 'emoji' | 'file' = 'text'): Promise<ChatMessage> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) throw new Error('No current user ID');
      
      // Get existing messages to determine next sequential ID
      const existingMessages = await this.getMessages(conversationId);
      const nextSequentialId = existingMessages.length + 1;
      
      // Generate unique message ID
      const now = Date.now();
      const messageId = `msg_${now}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the provided sender type
      
      const newMessage: ChatMessage = {
        ...message,
        id: messageId,
        sequentialId: nextSequentialId,
        senderType: senderType,
        messageType: messageType,
        timestamp: new Date(now).toISOString(),
        isRead: false
      };

      // Simple: Save message to shared conversation path
      const messagesRef = ref(rtdb, `conversations/${conversationId}/messages/${messageId}`);
      await set(messagesRef, newMessage);
      console.log('Message saved to shared conversation:', conversationId);

      // Create simple conversation cards for both users
      await this.createSimpleConversationCard(currentUserId, message.receiverId, newMessage, message.listingId);
      await this.createSimpleConversationCard(message.receiverId, currentUserId, newMessage, message.listingId);

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  public async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) return;
      
      
      // Mark all messages in the shared conversation as read
      const messagesRef = ref(rtdb, `conversations/${conversationId}/messages`);
      const snapshot = await get(messagesRef);
      
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        let markedCount = 0;
        let totalMessages = 0;
        
        // Mark all messages as read for the current user
        for (const [messageId, messageData] of Object.entries(messagesData)) {
          const message = messageData as any;
          totalMessages++;
          if (message.receiverId === currentUserId && !message.isRead) {
            const messageRef = ref(rtdb, `conversations/${conversationId}/messages/${messageId}/isRead`);
            await set(messageRef, true);
            markedCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  private async createContactEntry(contactId: string, listingId?: string): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) return;

      // Check if contact already exists for this user
      const contactsRef = ref(rtdb, `users/${currentUserId}/contacts/${contactId}`);
      const snapshot = await get(contactsRef);
      
      if (!snapshot.exists()) {
        // Get contact information from Firebase user data
        let contactName = 'User';
        let contactEmail = '';
        let contactAvatar = require('../../../assets/icons/profile.png');
        
        try {
          // Try to get contact info from user's Firebase profile
          const contactUserRef = ref(rtdb, `users/${contactId}`);
          const contactUserSnapshot = await get(contactUserRef);
          if (contactUserSnapshot.exists()) {
            const contactUser = contactUserSnapshot.val();
            contactName = contactUser.fullName || contactUser.displayName || 'User';
            contactEmail = contactUser.email || '';
          }
        } catch (error) {
          console.error('Error fetching contact user data:', error);
        }

        // If we still don't have a name and we have a listing, try to get owner info
        if (contactName === 'User' && listingId) {
          try {
            const listingRef = ref(rtdb, `listings/${listingId}`);
            const listingSnapshot = await get(listingRef);
            if (listingSnapshot.exists()) {
              const listing = listingSnapshot.val();
              // If the contact is the owner of this listing, use listing owner info
              if (listing.ownerId === contactId) {
                contactName = listing.ownerName || contactName;
                contactEmail = listing.ownerEmail || contactEmail;
              }
            }
          } catch (error) {
            console.error('Error fetching listing data for contact:', error);
          }
        }

        // Create contact entry
        const contactData = {
          id: contactId,
          name: contactName,
          email: contactEmail,
          avatar: contactAvatar,
          status: await this.getUserStatus(contactId),
          listingId: listingId,
          createdAt: new Date().toISOString()
        };

        await set(contactsRef, contactData);
        console.log('Contact entry created for:', contactId, 'with name:', contactName);
      }
    } catch (error) {
      console.error('Error creating contact entry:', error);
    }
  }

  private async createContactEntryForSender(senderId: string, listingId?: string): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) return;

      // Create contact entry for the receiver (current user) in the sender's contacts
      const contactsRef = ref(rtdb, `users/${senderId}/contacts/${currentUserId}`);
      const snapshot = await get(contactsRef);
      
      if (!snapshot.exists()) {
        // Get current user information
        const { auth } = await import('../firebase');
        const currentUser = auth.currentUser;
        
        let userName = 'User';
        let userEmail = '';
        let userAvatar = require('../../../assets/icons/profile.png');
        
        if (currentUser) {
          userName = currentUser.displayName || 'User';
          userEmail = currentUser.email || '';
        }

        // Create contact entry for the current user in the sender's contacts
        const contactData = {
          id: currentUserId,
          name: userName,
          email: userEmail,
          avatar: userAvatar,
          status: await this.getUserStatus(currentUserId),
          listingId: listingId,
          createdAt: new Date().toISOString()
        };

        await set(contactsRef, contactData);
        console.log('Contact entry created for sender:', currentUserId);
      }
    } catch (error) {
      console.error('Error creating contact entry for sender:', error);
    }
  }

  /**
   * Create conversation entry for the receiver when a message is sent
   */
  private async createConversationForReceiver(receiverId: string, senderId: string, listingId?: string): Promise<void> {
    try {
      const conversationId = this.generateConversationId(receiverId, senderId);
      const receiverConversationRef = ref(rtdb, `users/${receiverId}/conversations/${conversationId}`);
      
      // Check if conversation already exists for receiver
      const snapshot = await get(receiverConversationRef);
      if (snapshot.exists()) {
        console.log('Conversation already exists for receiver:', receiverId, conversationId);
        return;
      }

      // Get sender information to create contact
      let senderName = 'User';
      let senderEmail = '';
      let senderAvatar = require('../../../assets/icons/profile.png');
      
      try {
        // Try to get sender info from Firebase user data
        const senderUserRef = ref(rtdb, `users/${senderId}`);
        const senderUserSnapshot = await get(senderUserRef);
        if (senderUserSnapshot.exists()) {
          const senderUser = senderUserSnapshot.val();
          senderName = senderUser.fullName || senderUser.displayName || 'User';
          senderEmail = senderUser.email || '';
        }
      } catch (error) {
        console.error('Error fetching sender user data:', error);
      }

      // Create contact for the sender (from receiver's perspective)
      const senderContact = {
        id: senderId,
        name: senderName,
        email: senderEmail,
        avatar: senderAvatar,
        status: await this.getUserStatus(senderId),
        ownerId: senderId,
        listingId: listingId
      };

      // Create conversation for receiver
      const conversation: ChatConversation = {
        id: conversationId,
        contact: senderContact,
        messages: [],
        unreadCount: 0
      };

      await set(receiverConversationRef, conversation);
      console.log('Conversation created for receiver:', receiverId, 'with sender:', senderId);
    } catch (error) {
      console.error('Error creating conversation for receiver:', error);
    }
  }

  /**
   * Generate a consistent conversation ID for two users
   * This ensures both users reference the same conversation
   */
  private generateConversationId(userId1: string, userId2: string): string {
    // Sort the IDs to ensure consistent ordering
    const sortedIds = [userId1, userId2].sort();
    const conversationId = `conv_${sortedIds[0]}_${sortedIds[1]}`;
    return conversationId;
  }

  /**
   * Create simple conversation card for a user
   */
  public async createSimpleConversationCard(userId: string, otherUserId: string, message: ChatMessage, listingId?: string): Promise<void> {
    try {
      // Get other user's info
      let otherUserName = 'User';
      let otherUserAvatar = require('../../../assets/icons/profile.png');
      
      try {
        const otherUserRef = ref(rtdb, `users/${otherUserId}`);
        const otherUserSnapshot = await get(otherUserRef);
        if (otherUserSnapshot.exists()) {
          const otherUser = otherUserSnapshot.val();
          otherUserName = otherUser.fullName || otherUser.displayName || 'User';
        }
      } catch (error) {
        console.error('Error fetching other user data:', error);
      }

      // Create conversation card with proper message display
      let lastMessageText = '';
      if (message.messageType === 'file') {
        lastMessageText = `📷 ${message.fileData?.fileName || 'Image'}`;
      } else if (message.messageType === 'emoji') {
        lastMessageText = message.emoji || '';
      } else {
        lastMessageText = message.text || '';
      }

      // Check if this is a new message for the receiver (increment unread count)
      const isMessageForReceiver = message.receiverId === userId;
      
      // Get existing conversation to check current unread count
      const conversationId = this.generateConversationId(userId, otherUserId);
      const existingConversationRef = ref(rtdb, `users/${userId}/conversations/${conversationId}`);
      const existingConversationSnapshot = await get(existingConversationRef);
      
      let currentUnreadCount = 0;
      if (existingConversationSnapshot.exists()) {
        const existingConversation = existingConversationSnapshot.val();
        currentUnreadCount = existingConversation.unreadCount || 0;
      }
      
      // Increment unread count only for the receiver
      if (isMessageForReceiver) {
        currentUnreadCount += 1;
      } else {
        // Reset unread count for sender (they just sent a message)
        currentUnreadCount = 0;
      }

      const conversationCard = {
        id: conversationId,
        contactId: otherUserId,
        contactName: otherUserName,
        contactAvatar: otherUserAvatar,
        lastMessage: lastMessageText,
        lastMessageTime: message.timestamp,
        lastMessageSenderId: message.senderId, // Track who sent the last message
        lastMessageSenderType: message.senderType, // Track sender type
        unreadCount: currentUnreadCount, // Set unread count
        listingId: listingId
      };

      // Save to user's conversation list
      const userConversationsRef = ref(rtdb, `users/${userId}/conversations/${conversationId}`);
      await set(userConversationsRef, conversationCard);
    } catch (error) {
      console.error('Error creating conversation card:', error);
      console.error('Conversation card data:', {
        userId,
        otherUserId,
        messageType: message.messageType,
        messageText: message.text,
        messageEmoji: message.emoji,
        messageFileData: message.fileData
      });
    }
  }

  /**
   * Debug method to check current state of conversations and contacts
   */
  public async debugCurrentState(): Promise<void> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        console.log('Debug: No current user ID found');
        return;
      }

      console.log('=== DEBUG: Current State ===');
      console.log('Current User ID:', currentUserId);

      // Check conversations
      const conversationsRef = ref(rtdb, `users/${currentUserId}/conversations`);
      const conversationsSnapshot = await get(conversationsRef);
      console.log('Conversations exist:', conversationsSnapshot.exists());
      if (conversationsSnapshot.exists()) {
        const conversationsData = conversationsSnapshot.val();
        console.log('Conversation keys:', Object.keys(conversationsData || {}));
        for (const [key, value] of Object.entries(conversationsData || {})) {
          console.log(`Conversation ${key}:`, value);
        }
      }

      // Check contacts
      const contactsRef = ref(rtdb, `users/${currentUserId}/contacts`);
      const contactsSnapshot = await get(contactsRef);
      console.log('Contacts exist:', contactsSnapshot.exists());
      if (contactsSnapshot.exists()) {
        const contactsData = contactsSnapshot.val();
        console.log('Contact keys:', Object.keys(contactsData || {}));
        for (const [key, value] of Object.entries(contactsData || {})) {
          console.log(`Contact ${key}:`, value);
        }
      }

      // Check online users
      const onlineUsersRef = ref(rtdb, 'online_users');
      const onlineUsersSnapshot = await get(onlineUsersRef);
      console.log('Online users:', onlineUsersSnapshot.exists() ? onlineUsersSnapshot.val() : 'None');
      
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Debug error:', error);
    }
  }

  /**
   * Clean up legacy chat data from AsyncStorage to prevent SQLite full errors
   */
  public async cleanupStorage(): Promise<void> {
    try {
      await cleanupLegacyChatData();
    } catch (error) {
      console.error('ChatService: Error during storage cleanup:', error);
    }
  }

  /**
   * Emergency cleanup when storage is full
   */
  public async emergencyStorageCleanup(): Promise<void> {
    try {
      await emergencyCleanup();
    } catch (error) {
      console.error('ChatService: Error during emergency storage cleanup:', error);
    }
  }

  /**
   * Get total unread message count for a user
   */
  public async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const conversationsRef = ref(rtdb, `users/${userId}/conversations`);
      const snapshot = await get(conversationsRef);
      
      if (!snapshot.exists()) {
        return 0;
      }

      const conversations = snapshot.val();
      let totalUnread = 0;

      for (const conversationId in conversations) {
        const conversation = conversations[conversationId];
        if (conversation.unreadCount && conversation.unreadCount > 0) {
          totalUnread += conversation.unreadCount;
        }
      }

      return totalUnread;
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return 0;
    }
  }

  /**
   * Check if user has any unread messages
   */
  public async hasUnreadMessages(userId: string): Promise<boolean> {
    const unreadCount = await this.getTotalUnreadCount(userId);
    return unreadCount > 0;
  }

  /**
   * Mark all messages in a conversation as read
   */
  public async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      // Update unread count to 0 for this conversation
      await set(ref(rtdb, `users/${userId}/conversations/${conversationId}/unreadCount`), 0);

      // Also update the last read timestamp to ensure proper sync
      await set(ref(rtdb, `users/${userId}/conversations/${conversationId}/lastReadAt`), new Date().toISOString());

      // Note: Individual messages are already marked as read by markMessagesAsRead()
      // This function only needs to update the conversation's unreadCount
      
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  public destroy() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    if (this.onlineUsersListener) {
      off(this.onlineUsersListener);
    }
  }
}

export default ChatService;