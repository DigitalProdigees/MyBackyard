import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { runAllMigrations } from '@/app/lib/utils/dataMigrationUtils';

export function DataMigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    Alert.alert(
      'Data Migration',
      'This will migrate all existing images from Realtime Database to Firebase Storage. This may take a few minutes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          style: 'destructive',
          onPress: async () => {
            setIsMigrating(true);
            try {
              await runAllMigrations();
              Alert.alert('Success', 'Data migration completed successfully!');
            } catch (error) {
              console.error('Migration error:', error);
              Alert.alert('Error', 'Migration failed. Check console for details.');
            } finally {
              setIsMigrating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isMigrating && styles.disabledButton]}
        onPress={handleMigration}
        disabled={isMigrating}
      >
        <Text style={styles.buttonText}>
          {isMigrating ? 'Migrating...' : 'Migrate Images to Storage'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
