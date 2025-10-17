import React, { useEffect } from 'react';
import { StorageCleanup } from '../lib/utils/storageCleanup';

// Storage Manager component to handle storage cleanup
// This component runs storage cleanup operations without affecting existing logic
export function StorageManager() {
  useEffect(() => {
    // Run storage cleanup on component mount
    const runCleanup = async () => {
      try {
        await StorageCleanup.checkAndCleanup();
      } catch (error) {
        console.log('StorageManager: Cleanup failed:', error);
      }
    };

    runCleanup();

    // Set up periodic cleanup (every 5 minutes)
    const cleanupInterval = setInterval(runCleanup, 5 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  // This component doesn't render anything
  return null;
}