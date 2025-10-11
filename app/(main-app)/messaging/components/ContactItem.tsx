import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Contact } from '../types';

interface ContactItemProps {
  contact: Contact;
  onPress: (contact: Contact) => void;
}

export function ContactItem({ contact, onPress }: ContactItemProps) {
  return (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => onPress(contact)}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={contact.avatar || require('../../../../assets/icons/profile.png')}
          style={styles.avatar}
        />
        {contact.status === 'online' && <View style={styles.statusIndicator} />}
      </View>
      <Text style={styles.name}>{contact.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  contactItem: {
    alignItems: 'center',
    marginRight: 24,
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
  statusIndicator: {
    width: 19,
    height: 19,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#2E225C',
  },
  name: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}); 