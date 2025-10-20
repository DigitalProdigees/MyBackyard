import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface ProfileSectionProps {
  name: string;
  location: string;
  avatar?: any;
  onEditPress: () => void;
}

export function ProfileSection({ name, location, avatar, onEditPress }: ProfileSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {avatar ? (
          <Image source={avatar} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.location}>{location}</Text>
          
          <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2E2A5E',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomRightRadius: 30,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 20,
    borderWidth: 2,
    borderColor: '#42B6E3',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 2,
    borderColor: '#42B6E3',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'column',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  location: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#00C566',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
