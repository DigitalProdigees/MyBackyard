import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Dimensions, Keyboard, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Icons } from '@/constants/icons';
import { GradientBackground } from '@/app/components';
import ChatService, { ChatMessage, ChatContact } from '@/app/lib/services/chatService';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase';
import { EmojiPicker } from '@/app/components/EmojiPicker';
import { FileMessage } from '@/app/components/FileMessage';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getUserProfileImage, getProfileImageWithFallback } from '@/app/lib/utils/profileImageUtils';
import { capitalizeFirstLetter } from '@/app/lib/utils/textUtils';

const { width, height } = Dimensions.get('window');

// Function to prepare file for sharing (convert to base64)
const prepareFileForSharing = async (fileData: any) => {
  try {
    if (!fileData.localUri) {
      return fileData; // Return original if no local URI
    }

    // Read the file as base64
    const base64Data = await FileSystem.readAsStringAsync(fileData.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create a permanent filename with timestamp
    const timestamp = Date.now();
    const fileExtension = fileData.fileName.split('.').pop() || 'jpg';
    const permanentFileName = `chat_image_${timestamp}.${fileExtension}`;

    // Return file data with base64 content for sharing
    return {
      ...fileData,
      fileName: permanentFileName,
      base64Data: base64Data, // Store base64 data for sharing
      mimeType: fileData.fileType || 'image/jpeg'
    };
  } catch (error) {
    console.error('Error preparing file for sharing:', error);
    return fileData; // Return original if preparation fails
  }
};

export default function Chat() {
	const { contactName, contactAvatar, renterId, listingId } = useLocalSearchParams();
	const [messageText, setMessageText] = useState('');
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [contact, setContact] = useState<ChatContact | null>(null);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [selectedFile, setSelectedFile] = useState<any>(null);
	const [conversationId, setConversationId] = useState<string>('');
	const [currentUserId, setCurrentUserId] = useState<string>('');
	const [contactProfileImage, setContactProfileImage] = useState<string | null>(null);
	const [contactInitials, setContactInitials] = useState<string>('');
	const [isLoadingMessages, setIsLoadingMessages] = useState(true);
	const chatService = ChatService.getInstance();
	const lastStatusRef = useRef<string>('');
	const lastMessageCountRef = useRef<number>(0);

	useEffect(() => {
		initializeChat();
		
		const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
			setKeyboardHeight(e.endCoordinates.height + 10);
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		});
		const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardHeight(0);
		});

		return () => {
			keyboardDidShowListener?.remove();
			keyboardDidHideListener?.remove();
			// Clean up real-time listener
			if ((window as any).chatUnsubscribe) {
				(window as any).chatUnsubscribe();
			}
			
			// Reset unread count when leaving chat screen (regardless of destination)
			const resetUnreadOnExit = async () => {
				if (conversationId && currentUserId) {
					try {
						console.log('Owner chat: Screen unmounting, resetting unread count');
						await chatService.markConversationAsRead(conversationId, currentUserId);
						console.log('Owner chat: Unread count reset on exit');
					} catch (error) {
						console.error('Owner chat: Error resetting unread count on exit:', error);
					}
				}
			};
			resetUnreadOnExit();
		};
	}, []);

	// Ensure messages are marked as read when chat screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			const markAsRead = async () => {
				if (conversationId && currentUserId) {
					console.log('Owner chat: Screen focused, marking messages as read');
					try {
						// Mark all messages as read
						await chatService.markMessagesAsRead(conversationId);
						// Reset unread count to zero for this conversation
						await chatService.markConversationAsRead(conversationId, currentUserId);
						console.log('Owner chat: Messages marked as read and unread count reset to zero on focus');
					} catch (error) {
						console.error('Owner chat: Error marking messages as read on focus:', error);
					}
				}
			};
			markAsRead();

			// Cleanup function that runs when screen loses focus
			return () => {
				const resetUnreadOnBlur = async () => {
					if (conversationId && currentUserId) {
						try {
							console.log('Owner chat: Screen losing focus, resetting unread count');
							await chatService.markConversationAsRead(conversationId, currentUserId);
							console.log('Owner chat: Unread count reset on blur');
						} catch (error) {
							console.error('Owner chat: Error resetting unread count on blur:', error);
						}
					}
				};
				resetUnreadOnBlur();
			};
		}, [conversationId, currentUserId])
	);

	// Separate effect for status monitoring
	useEffect(() => {
		if (!contact) return;

		// Initialize the ref with current status
		lastStatusRef.current = contact.status;
		
		// Set up periodic status checking
		const statusCheckInterval = setInterval(async () => {
			const newStatus = await chatService.getUserStatus(contact.id);
			if (newStatus !== lastStatusRef.current) {
				lastStatusRef.current = newStatus;
				setContact(prev => {
					if (prev) {
						return { ...prev, status: newStatus };
					}
					return null;
				});
			}
		}, 3000); // Check every 3 seconds

		return () => {
			clearInterval(statusCheckInterval);
		};
	}, [contact?.id]); // Only depend on contact ID, not the entire contact object

	// Load contact profile image when contact is set
	useEffect(() => {
		if (contact?.id) {
			loadContactProfileImage(contact.id);
		}
	}, [contact?.id]);

	// Auto-scroll when messages change (for initial load and new messages)
	useEffect(() => {
		if (messages.length > 0) {
			// Use requestAnimationFrame to ensure DOM is updated
			requestAnimationFrame(() => {
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 50);
			});
		}
	}, [messages.length]);

	// Auto-scroll when loading is complete
	useEffect(() => {
		if (!isLoadingMessages && messages.length > 0) {
			// Auto-scroll to bottom after messages are loaded from database
			requestAnimationFrame(() => {
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 100);
			});
		}
	}, [isLoadingMessages, messages.length]);

	const initializeChat = async () => {
		try {
			setIsLoadingMessages(true);
			// Set current user as online
			await chatService.setUserOnline();
			
			// Get current user ID
			const userId = await chatService.getCurrentUserId();
			if (userId) {
				setCurrentUserId(userId);
			} else {
				console.error('No current user ID found');
				return;
			}
			
			// Create contact object
			const contactData: ChatContact = {
				id: renterId as string || 'unknown',
				name: contactName as string || 'Potential Renter',
				avatar: contactAvatar,
				status: 'offline', // Will be updated by getUserStatus
				ownerId: renterId as string,
				listingId: listingId as string
			};

			// Get actual online status
			contactData.status = await chatService.getUserStatus(contactData.id);
			setContact(contactData);

			// Create or get conversation
			const conversation = await chatService.createOrUpdateConversation(contactData);
			setConversationId(conversation.id);

			// Immediately reset unread count when entering chat
			if (userId) {
				try {
					await chatService.markConversationAsRead(conversation.id, userId);
					console.log('Owner chat: Unread count immediately reset to zero on chat entry');
				} catch (error) {
					console.error('Owner chat: Error immediately resetting unread count:', error);
				}
			}

			// Load messages
			console.log('Owner chat: Current user ID:', userId);
			console.log('Owner chat: Loading messages for conversation:', conversation.id);
			const conversationMessages = await chatService.getMessages(conversation.id);
			console.log(`Owner chat: Loaded ${conversationMessages.length} messages`);
			setMessages(conversationMessages);
			
			// Initialize message count reference
			lastMessageCountRef.current = conversationMessages.length;

			// Set up real-time message listening from shared conversation
			const messagesRef = ref(rtdb, `conversations/${conversation.id}/messages`);
			const unsubscribe = onValue(messagesRef, async (snapshot) => {
				console.log('Owner chat: Real-time listener triggered');
				if (snapshot.exists()) {
					const messagesData = snapshot.val();
					console.log(`Owner chat: Real-time update - ${Object.keys(messagesData || {}).length} messages`);
					const messages: ChatMessage[] = Object.values(messagesData || {});
					// Sort by sequential ID for proper message order
					messages.sort((a, b) => a.sequentialId - b.sequentialId);
					console.log(`Owner chat: Sorted ${messages.length} messages`);
					
					// Check if there are new messages (more than before)
					const hasNewMessages = messages.length > lastMessageCountRef.current;
					lastMessageCountRef.current = messages.length;
					
					setMessages(messages);
					
					// Mark messages as read when user is actively in chat and there are new messages
					if (userId && hasNewMessages) {
						console.log('Owner chat: New messages detected, marking as read immediately');
						try {
							// Mark as read immediately since user is actively viewing the chat
							await chatService.markMessagesAsRead(conversation.id);
							await chatService.markConversationAsRead(conversation.id, userId);
							console.log('Owner chat: Messages marked as read and unread count reset to zero immediately');
							
							// Also immediately update the conversation card to ensure messaging screen shows correct unread count
							if (contact) {
								await chatService.createSimpleConversationCard(userId, contact.id, messages[messages.length - 1], contact.listingId);
								console.log('Owner chat: Conversation card updated to reflect read status');
							}
						} catch (error) {
							console.error('Owner chat: Error marking new messages as read:', error);
						}
					}
					
					// Auto-scroll to bottom when new message arrives
					if (hasNewMessages) {
						requestAnimationFrame(() => {
							setTimeout(() => {
								scrollViewRef.current?.scrollToEnd({ animated: true });
							}, 50);
						});
					}
				} else {
					console.log('Owner chat: No messages in real-time listener');
				}
			});

			// Store unsubscribe function for cleanup
			(window as any).chatUnsubscribe = unsubscribe;

			// Mark messages as read and reset unread count
			try {
				console.log('Owner chat: About to mark messages as read');
				await chatService.markMessagesAsRead(conversation.id);
				console.log('Owner chat: Finished marking messages as read');
				
				if (userId) {
					console.log('Owner chat: About to mark conversation as read');
					await chatService.markConversationAsRead(conversation.id, userId);
					console.log('Owner chat: Finished marking conversation as read and unread count reset to zero');
				} else {
					console.log('Owner chat: No userId, skipping markConversationAsRead');
				}
			} catch (error) {
				console.error('Owner chat: Error marking initial messages as read:', error);
			}

		} catch (error) {
			console.error('Error initializing chat:', error);
		} finally {
			setIsLoadingMessages(false);
		}
	};

	// Load contact's profile image
	const loadContactProfileImage = async (contactId: string) => {
		try {
			const profileImageData = await getUserProfileImage(contactId);
			if (profileImageData) {
				setContactProfileImage(profileImageData.uri);
				setContactInitials(profileImageData.initials);
			} else {
				// Fallback to initials from contact name
				const contactName = contact?.name || '';
				setContactInitials(contactName.split(' ').map(n => n[0]).join('').toUpperCase());
			}
		} catch (error) {
			console.error('Error loading contact profile image:', error);
		}
	};

	const handleEmojiSelect = (emoji: string) => {
		setMessageText(prev => prev + emoji);
	};

	const handleFileAttachment = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: 'image/*',
				copyToCacheDirectory: true,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				const file = result.assets[0];
				setSelectedFile({
					fileName: file.name,
					fileSize: file.size || 0,
					fileType: file.mimeType || 'image/jpeg',
					localUri: file.uri,
				});
			}
		} catch (error) {
			console.error('Error picking image:', error);
			Alert.alert('Error', 'Failed to select image');
		}
	};

	const handleSendMessage = async () => {
		if ((messageText.trim() || selectedFile) && conversationId && contact && currentUserId) {
			try {
				// Determine message type first
				let messageType: 'text' | 'emoji' | 'file' = 'text';
				if (selectedFile && messageText.trim()) {
					messageType = 'file';
				} else if (selectedFile) {
					messageType = 'file';
				} else if (messageText.trim()) {
					// Check if message is just emoji
					const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;
					if (emojiRegex.test(messageText.trim())) {
						messageType = 'emoji';
					} else {
						messageType = 'text';
					}
				}

				// Create optimistic message for immediate display
				const optimisticMessage: ChatMessage = {
					id: `temp_${Date.now()}`, // Temporary ID
					sequentialId: messages.length + 1,
					senderId: currentUserId,
					receiverId: contact.id,
					senderType: 'owner',
					messageType: messageType,
					text: messageText.trim(),
					emoji: '',
					fileData: selectedFile,
					timestamp: new Date().toISOString(),
					status: 'sending', // Mark as sending
					isRead: false,
					listingId: contact.listingId
				};

				// Add message to local state immediately (optimistic UI)
				setMessages(prev => [...prev, optimisticMessage]);

				// Clear input fields immediately
				setMessageText('');
				setSelectedFile(null);

				// Auto-scroll to bottom immediately
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 100);

				// Send to database in background (prepare data asynchronously)
				const sendToDatabase = async () => {
					// Prepare message data for database
					let messageData: any = {
						senderId: currentUserId,
						receiverId: contact.id,
						listingId: contact.listingId
					};

					// Prepare message data based on type
					if (messageType === 'file') {
						if (selectedFile) {
							// Prepare file for sharing (convert to base64)
							const sharedFileData = await prepareFileForSharing(selectedFile);
							messageData.fileData = sharedFileData;
							if (messageText.trim()) {
								messageData.text = messageText.trim(); // Include text with file
							}
						}
					} else if (messageType === 'emoji') {
						messageData.emoji = messageText.trim();
					} else if (messageType === 'text') {
						messageData.text = messageText.trim();
					}

					// Send to database
					return chatService.sendMessage(conversationId, messageData, 'owner', messageType);
				};

				sendToDatabase()
					.then(() => {
						// Update message status to sent
						setMessages(prev => prev.map(msg => 
							msg.id === optimisticMessage.id 
								? { ...msg, status: 'sent' }
								: msg
						));
					})
					.catch((error) => {
						console.error('Error sending message:', error);
						// Update message status to failed
						setMessages(prev => prev.map(msg => 
							msg.id === optimisticMessage.id 
								? { ...msg, status: 'failed' }
								: msg
						));
					});
			} catch (error) {
				console.error('Error preparing message:', error);
			}
		}
	};

	const renderMessage = (message: ChatMessage) => {
		// In owner-app, owner messages go on right, rental messages go on left
		const isFromOwner = message.senderType === 'owner';
		const messageTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		
		return (
			<View style={styles.messageContainer}>
				<Text style={styles.timestamp}>{messageTime}</Text>
				<View style={[
					styles.messageBubble,
					isFromOwner ? styles.userMessage : styles.contactMessage
				]}>
					{message.messageType === 'file' ? (
						<FileMessage message={message} isFromUser={isFromOwner} />
					) : message.messageType === 'emoji' ? (
						<Text style={[styles.messageText, styles.emojiText]}>{message.emoji}</Text>
					) : (
						<Text style={styles.messageText}>{message.text}</Text>
					)}
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />
			<GradientBackground />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Image source={Icons.back} style={styles.backIcon} />
				</TouchableOpacity>

				<View style={styles.headerCenter}>
					{contactProfileImage ? (
						<Image
							source={{ uri: contactProfileImage }}
							style={styles.headerAvatar}
						/>
					) : (
						<View style={styles.avatarPlaceholder}>
							<Text style={styles.avatarInitials}>{contactInitials}</Text>
						</View>
					)}
					<View style={styles.headerInfo}>
						<Text style={styles.contactName}>{capitalizeFirstLetter(contact?.name || (Array.isArray(contactName) ? contactName[0] : contactName) || 'Contact')}</Text>
						<View style={styles.statusContainer}>
							<View style={[
								styles.statusIndicator,
								{ backgroundColor: contact?.status === 'online' ? '#4CAF50' : '#9E9E9E' }
							]} />
							<Text style={styles.statusText}>
								{contact?.status === 'online' ? 'Online' : 'Offline'}
							</Text>
						</View>
					</View>
				</View>

			
			</View>

			{/* Chat Messages */}
			<ScrollView
				ref={scrollViewRef}
				style={styles.chatContainer}
				contentContainerStyle={styles.chatContent}
				showsVerticalScrollIndicator={false}
			>
				{isLoadingMessages ? (
					<LoadingSpinner 
						visible={true} 
						text="Loading messages..." 
						overlay={false}
					/>
				) : (
					<>
						{messages.map((message) => (
							<View key={message.id}>
								{renderMessage(message)}
							</View>
						))}
					</>
				)}
			</ScrollView>

			{/* Input Area */}
			{/* Selected Image Preview */}
			{selectedFile && (
				<View style={[styles.filePreview, keyboardHeight > 0 && { marginBottom: keyboardHeight*0.9}]}>
					<Text style={styles.filePreviewText}>📷 {selectedFile.fileName}</Text>
					<TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileButton}>
						<Text style={styles.removeFileText}>✕</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Input Bar */}
			<View style={[styles.inputContainer, keyboardHeight > 0 && { marginBottom: keyboardHeight*0.9}]}>
				<TouchableOpacity style={styles.attachmentButton} onPress={handleFileAttachment}>
					<Image source={require('../../../../assets/icons/Afile.png')} style={styles.inputIcon} />
				</TouchableOpacity>

				<TouchableOpacity style={styles.emojiButton} onPress={() => setShowEmojiPicker(true)}>
					<Image source={require('../../../../assets/icons/emoji.png')} style={styles.inputIcon} />
				</TouchableOpacity>

				<TextInput
					style={styles.textInput}
					value={messageText}
					onChangeText={setMessageText}
					placeholder="Type a message..."
					placeholderTextColor="rgba(255, 255, 255, 0.5)"
					multiline
				/>

				<TouchableOpacity
					onPress={handleSendMessage}
					style={styles.sendButton}
				>
					<Image source={require('../../../../assets/icons/send.png')} style={styles.sendIcon} />
				</TouchableOpacity>
			</View>

			{/* Emoji Picker */}
			<EmojiPicker
				visible={showEmojiPicker}
				onEmojiSelect={handleEmojiSelect}
				onClose={() => setShowEmojiPicker(false)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		alignItems: 'center',
	},
	backButton: {
	},
	backIcon: {
		width: 54,
		height: 54,
		resizeMode: 'contain',
	},
	dotsIcon: {

		width: 30,
		height: 20,
		resizeMode: 'contain',
	},
	headerCenter: {
		position: 'absolute',
		left: '60%',
		top: '50%',
		transform: [{ translateX: -80 }, { translateY: -20 }],
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	headerAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.3)',
	},
	avatarInitials: {
		color: 'white',
		fontSize: 14,
		fontWeight: 'bold',
	},
	headerInfo: {
		flex: 1,
	},
	menuButton: {
	},

	contactName: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},

	menuIcon: {
		width: 24,
		height: 24,
		tintColor: 'white',
	},
	chatContainer: {
		flex: 1,
		paddingHorizontal: 16,
	},
	chatContent: {
		paddingVertical: 16,
	},
	dateMarker: {
		textAlign: 'center',
		color: 'rgba(255, 255, 255, 0.7)',
		fontSize: 12,
		marginBottom: 16,
	},
	messageContainer: {
		marginBottom: 16,
	},
	messageBubble: {
		maxWidth: '80%',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 11,
		marginBottom: 4,
	},
	userMessage: {
		backgroundColor: '#00000033',
		alignSelf: 'flex-end',
	},
	contactMessage: {
		backgroundColor: '#00000033',
		alignSelf: 'flex-start',
	},
	messageText: {
		color: 'white',
		fontSize: 14,
		lineHeight: 20,
	},
	timestamp: {
		textAlign: 'center',
		color: 'rgba(255, 255, 255, 0.5)',
		fontSize: 10,
		marginBottom: 4,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.1)',
	},
	attachmentButton: {
		padding: 8,
		marginRight: 8,
	},
	emojiButton: {
		padding: 8,
		marginRight: 8,
	},
	inputIcon: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
	textInput: {
		flex: 1,
		backgroundColor: '#202857',
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 15,
		color: 'white',
		fontSize: 14,
		maxHeight: 100,
	},
	sendButton: {
		padding: 8,
		marginLeft: 8,
	},
	sendIcon: {
		width: 20,
		height: 20,
	},
	emojiText: {
		fontSize: 24,
		lineHeight: 32,
		paddingVertical: 4,
	},
	filePreview: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	filePreviewText: {
		color: 'white',
		fontSize: 14,
		flex: 1,
		fontWeight: '500',
	},
	removeFileButton: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 8,
	},
	removeFileText: {
		color: 'white',
		fontSize: 14,
		fontWeight: 'bold',
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	statusIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		color: 'rgba(255, 255, 255, 0.7)',
		fontSize: 12,
	},
});
