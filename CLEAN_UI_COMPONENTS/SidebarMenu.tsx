import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback, Text } from 'react-native';
import { MenuItem } from './MenuItem';
import { ProfileSection } from './ProfileSection';
import { GradientBackground } from './GradientBackground';

interface ProfileInfo {
  name: string;
  location: string;
  email: string;
  avatar?: any;
}

interface SidebarMenuProps {
  isVisible: boolean;
  onClose: () => void;
  profileInfo: ProfileInfo;
  onEditProfile: () => void;
}

const { height } = Dimensions.get('window');

export function SidebarMenu({ isVisible, onClose, profileInfo, onEditProfile }: SidebarMenuProps) {
  if (!isVisible) return null;

  const menuItems = [
    {
      id: 'orders',
      title: 'My Order',
      onPress: () => console.log('My Order pressed'),
    },
    {
      id: 'listings',
      title: 'My Listings',
      onPress: () => console.log('My Listings pressed'),
    },
    {
      id: 'messaging',
      title: 'Messaging',
      onPress: () => console.log('Messaging pressed'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      onPress: () => console.log('Notifications pressed'),
    },
  ];

  const settingsItems = [
    {
      id: 'changePassword',
      title: 'Change Password',
      onPress: () => console.log('Change Password pressed'),
    },
    {
      id: 'resetPassword',
      title: 'Reset Password',
      onPress: () => console.log('Reset Password pressed'),
    },
    {
      id: 'contactUs',
      title: 'Contact Us',
      onPress: () => console.log('Contact Us pressed'),
    },
    {
      id: 'terms',
      title: 'Terms of Services',
      onPress: () => console.log('Terms pressed'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      onPress: () => console.log('Privacy pressed'),
    },
  ];

  const handleLogoutPress = () => {
    console.log('Logout pressed');
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sidebar}>
        <GradientBackground />

        {/* Profile section */}
        <ProfileSection
          name={profileInfo.name}
          location={profileInfo.location}
          avatar={profileInfo.avatar}
          onEditPress={onEditProfile}
        />

        {/* Menu items section */}
        <View style={styles.menuContainer}>
          <View style={styles.mainMenuItems}>
            {menuItems.map((item) => (
              <MenuItem
                key={item.id}
                title={item.title}
                onPress={item.onPress}
              />
            ))}
          </View>

          <View style={styles.settingsItems}>
            {settingsItems.map((item) => (
              <MenuItem
                key={item.id}
                title={item.title}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* Logout button fixed at bottom */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: '80%',
    height: height,
    position: 'absolute',
    left: 0,
    top: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  menuContainer: {
    flex: 1,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  mainMenuItems: {
    marginBottom: 10,
  },
  settingsItems: {
    marginBottom: 20,
  },
  logoutButton: {
    paddingVertical: 15,
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
});
