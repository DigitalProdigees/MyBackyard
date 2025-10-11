import React from 'react';
import { Text, TouchableOpacity, View, Modal, FlatList, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icons } from '../../../../constants/icons';

interface LocationDropdownProps {
  visible: boolean;
  locations: string[];
  selectedLocation: string;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
  styles: any;
}

export function LocationDropdown({
  visible,
  locations,
  selectedLocation,
  onClose,
  onSelectLocation,
  styles
}: LocationDropdownProps) {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={40} tint="dark" style={styles.locationDropdownContainer}>
          <Text style={styles.dropdownTitle}>Select Location</Text>
          <FlatList
            data={locations}
            keyExtractor={(item) => item}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.locationItem,
                  index === locations.length - 1 && styles.lastLocationItem
                ]}
                onPress={() => onSelectLocation(item)}
              >
                <Image source={Icons.pin} style={styles.dropdownLocationIcon} />
                <Text style={styles.locationItemText}>{item}</Text>
                {selectedLocation === item && (
                  <View style={styles.checkCircle}>
                    <View style={styles.checkmark} />
                  </View>
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
} 