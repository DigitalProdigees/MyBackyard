import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Storage cleanup utility to prevent SQLite database full errors
export class StorageCleanup {
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
  private static readonly CLEANUP_THRESHOLD = 0.8; // Clean when 80% full
  private static readonly OLD_DATA_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Check storage usage and cleanup if needed
  static async checkAndCleanup(): Promise<void> {
    try {
      console.log('StorageCleanup: Checking storage usage...');
      
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log(`StorageCleanup: Found ${allKeys.length} storage keys`);
      
      // Estimate storage usage (rough calculation)
      let totalSize = 0;
      const keySizes: { [key: string]: number } = {};
      
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            keySizes[key] = size;
            totalSize += size;
          }
        } catch (error) {
          console.warn(`StorageCleanup: Error reading key ${key}:`, error);
        }
      }
      
      console.log(`StorageCleanup: Total estimated storage: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
      
      // If storage is getting full, perform cleanup
      if (totalSize > this.MAX_STORAGE_SIZE * this.CLEANUP_THRESHOLD) {
        console.log('StorageCleanup: Storage usage high, performing cleanup...');
        await this.performCleanup([...allKeys], keySizes);
      }
      
    } catch (error) {
      console.error('StorageCleanup: Error during storage check:', error);
    }
  }

  // Perform cleanup of old and unnecessary data
  private static async performCleanup(allKeys: string[], keySizes: { [key: string]: number }): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      
      // Clean up old temporary data
      for (const key of allKeys) {
        // Remove old temporary flags and data
        if (this.shouldRemoveKey(key)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove identified keys
      if (keysToRemove.length > 0) {
        console.log(`StorageCleanup: Removing ${keysToRemove.length} old keys`);
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // Clean up file system cache if available
      await this.cleanupFileSystemCache();
      
      console.log('StorageCleanup: Cleanup completed');
      
    } catch (error) {
      console.error('StorageCleanup: Error during cleanup:', error);
    }
  }

  // Determine if a key should be removed
  private static shouldRemoveKey(key: string): boolean {
    // Keep essential keys
    const essentialKeys = [
      'persist:root', // Redux persist data
      'auth_token', // Auth token
      'user_data', // User data
      'firebase:authUser', // Firebase auth
    ];
    
    // Don't remove essential keys
    if (essentialKeys.some(essential => key.includes(essential))) {
      return false;
    }
    
    // Remove old temporary keys
    const tempKeyPatterns = [
      'temp_',
      'cache_',
      'signup_',
      'onboarding_',
      'session_',
      'logout_flag',
    ];
    
    return tempKeyPatterns.some(pattern => key.includes(pattern));
  }

  // Clean up file system cache
  private static async cleanupFileSystemCache(): Promise<void> {
    try {
      if (FileSystem.cacheDirectory) {
        const cacheInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
        if (cacheInfo.exists && cacheInfo.isDirectory) {
          // Get cache directory contents
          const cacheContents = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
          
          // Remove old cache files (older than 3 days)
          const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
          
          for (const file of cacheContents) {
            try {
              const filePath = `${FileSystem.cacheDirectory}${file}`;
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              
              if (fileInfo.exists && fileInfo.modificationTime) {
                const fileAge = Date.now() - fileInfo.modificationTime;
                if (fileAge > threeDaysAgo) {
                  await FileSystem.deleteAsync(filePath);
                  console.log(`StorageCleanup: Removed old cache file: ${file}`);
                }
              }
            } catch (error) {
              console.warn(`StorageCleanup: Error cleaning cache file ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('StorageCleanup: Error cleaning file system cache:', error);
    }
  }

  // Force cleanup (can be called manually)
  static async forceCleanup(): Promise<void> {
    try {
      console.log('StorageCleanup: Performing force cleanup...');
      
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => this.shouldRemoveKey(key));
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`StorageCleanup: Force cleanup removed ${keysToRemove.length} keys`);
      }
      
      await this.cleanupFileSystemCache();
      
    } catch (error) {
      console.error('StorageCleanup: Error during force cleanup:', error);
    }
  }

  // Get storage statistics
  static async getStorageStats(): Promise<{ totalKeys: number; estimatedSize: string }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
          }
        } catch (error) {
          // Ignore errors for individual keys
        }
      }
      
      return {
        totalKeys: allKeys.length,
        estimatedSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`
      };
    } catch (error) {
      console.error('StorageCleanup: Error getting storage stats:', error);
      return { totalKeys: 0, estimatedSize: '0MB' };
    }
  }
}

// Export individual functions for backward compatibility
export const cleanupLegacyChatData = async (): Promise<void> => {
  console.log('cleanupLegacyChatData: Legacy function called, using StorageCleanup instead');
  await StorageCleanup.forceCleanup();
};

export const emergencyCleanup = async (): Promise<void> => {
  console.log('emergencyCleanup: Emergency cleanup called');
  await StorageCleanup.forceCleanup();
};