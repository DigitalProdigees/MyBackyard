import { Icons } from '@/constants/icons';
import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';

interface LocationButtonProps {
  locationText: string;
  onPress?: () => void;
  styles?: any;
}

export function LocationButton({ locationText, onPress }: LocationButtonProps) {
  return (
    <TouchableOpacity style={styles.locationContainer} onPress={onPress}>
      <Image source={Icons.pin} style={styles.locationPinIcon} />
      <Text style={styles.locationLabel}>{locationText}</Text>
      <Text style={styles.locationArrow}>▼</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationPinIcon: {
    tintColor: 'white',
    height: 20,
    width: 20,
    resizeMode: 'contain',
    marginRight: 6,
  },
  locationLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  locationArrow: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
}); 