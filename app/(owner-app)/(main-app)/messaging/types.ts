/**
 * Types for the Messaging screen
 */

export interface Contact {
  id: string;
  name: string;
  avatar?: any;
  status?: 'online' | 'offline';
  lastMessage?: string;
  time?: string;
  listingId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  contact: Contact;
  messages: Message[];
} 