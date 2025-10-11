import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Contact } from '../types';
import { UnreadBanner } from '../../../../components/UnreadBanner';
import { capitalizeFirstLetter } from '../../../../lib/utils/textUtils';

interface ConversationItemProps {
  contact: Contact;
  lastMessage?: string;
  time?: string;
  unreadCount?: number;
  onPress: (contact: Contact) => void;
}

export function ConversationItem({ contact, lastMessage, time, unreadCount = 0, onPress }: ConversationItemProps) {
  // Debug: Log unread count
  console.log(`Owner ConversationItem: ${contact.name} unread count:`, unreadCount);
  
  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onPress(contact)}
    >
      <View style={styles.avatarContainer}>
        {contact.avatar ? (
          <Image
            source={typeof contact.avatar === 'string' ? { uri: contact.avatar } : contact.avatar}
            style={styles.avatar}
            onError={() => {
              // Fallback to default profile image if loading fails
              console.log('Profile image failed to load, using fallback');
            }}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {contact.name ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{capitalizeFirstLetter(contact.name)}</Text>
        </View>

        <View style={styles.messageRow}>
          {lastMessage && (
            <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
              {lastMessage}
            </Text>
          )}
          {time && <Text style={styles.time}>{time}</Text>}
        </View>
      </View>
      {unreadCount > 0 && (
        <UnreadBanner count={unreadCount} size="small" position="top-right" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#00000033',
    borderRadius: 15,
    position: 'relative',
    marginTop: 10
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  time: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
}); 