import React from 'react';
import { Text, TouchableOpacity, View, Modal, FlatList, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface ProfileDropdownProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedItem: string;
  onClose: () => void;
  onSelectItem: (item: string) => void;
}

export function ProfileDropdown({
  visible,
  title,
  items,
  selectedItem,
  onClose,
  onSelectItem
}: ProfileDropdownProps) {
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
        <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <FlatList
              data={items}
              keyExtractor={(item) => item}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    index === items.length - 1 && styles.lastDropdownItem
                  ]}
                  onPress={() => onSelectItem(item)}
                >
                  <Text style={styles.dropdownItemText}>{item}</Text>
                  {selectedItem === item && (
                    <View style={styles.checkCircle}>
                      <View style={styles.checkmark} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: width - 60,
    backgroundColor: 'rgba(35, 44, 96, 0.95)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    maxHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#46B649',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 12,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
  },
}); 