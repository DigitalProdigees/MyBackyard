import { Icons } from '@/constants/icons';
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface NotificationItemProps {
  title: string;
  message: string;
  time: string;
  read: boolean;
  onPress?: () => void;
}

export function NotificationItem({ title, message, time, read, onPress }: NotificationItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, read ? styles.readContainer : styles.unreadContainer]}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.indicatorContainer}>
          {!read && <View style={styles.unreadIndicator} />}
        </View>
        <Image source={Icons.notification} style={styles.icon} />
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.timeSection}>
        <Text style={styles.time}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  unreadContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  readContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F67FF',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  contentSection: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  message: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeSection: {
    width: 80,
    alignItems: 'flex-end',
  },
  time: {
    fontFamily: 'Urbanist',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
}); 