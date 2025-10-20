import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface MenuItemProps {
  title: string;
  icon?: any;
  onPress: () => void;
  rightComponent?: React.ReactNode;
}

export function MenuItem({ title, icon, onPress, rightComponent }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {icon && <Image source={icon} style={styles.icon} />}
      <Text style={styles.title}>{title}</Text>
      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: 0,
    height: 40,
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
  },
  rightComponent: {
    marginLeft: 'auto',
  },
});
