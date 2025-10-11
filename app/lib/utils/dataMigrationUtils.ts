import { rtdb, storage } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Convert base64 data to blob for Firebase Storage upload
 */
const base64ToBlob = (base64Data: string, mimeType: string = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Migrate profile images from Realtime DB to Firebase Storage
 */
export const migrateProfileImages = async (): Promise<void> => {
  try {
    console.log('Starting profile image migration...');
    
    // Get all users
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log('No users found for migration');
      return;
    }
    
    const users = snapshot.val();
    const migrationPromises = [];
    
    for (const userId in users) {
      const user = users[userId];
      
      // Check if user has base64 profile image
      if (user.profileImage && typeof user.profileImage === 'string' && user.profileImage.startsWith('/9j/')) {
        console.log(`Migrating profile image for user: ${userId}`);
        
        const migrationPromise = (async () => {
          try {
            // Convert base64 to blob
            const mimeType = user.profileImageMimeType || 'image/jpeg';
            const blob = base64ToBlob(user.profileImage, mimeType);
            
            // Upload to Firebase Storage
            const imageRef = storageRef(storage, `profile-images/${userId}/profile_${Date.now()}.jpg`);
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);
            
            // Update user record with Storage URL
            await update(ref(rtdb, `users/${userId}`), {
              profileImageUrl: downloadURL,
              profileImage: null, // Remove base64 data
              profileImageMimeType: null // Remove mime type
            });
            
            console.log(`✅ Migrated profile image for user: ${userId}`);
          } catch (error) {
            console.error(`❌ Failed to migrate profile image for user ${userId}:`, error);
          }
        })();
        
        migrationPromises.push(migrationPromise);
      }
    }
    
    await Promise.all(migrationPromises);
    console.log('Profile image migration completed');
  } catch (error) {
    console.error('Error during profile image migration:', error);
  }
};

/**
 * Migrate listing images from Realtime DB to Firebase Storage
 */
export const migrateListingImages = async (): Promise<void> => {
  try {
    console.log('Starting listing image migration...');
    
    // Get all listings
    const listingsRef = ref(rtdb, 'listings');
    const snapshot = await get(listingsRef);
    
    if (!snapshot.exists()) {
      console.log('No listings found for migration');
      return;
    }
    
    const listings = snapshot.val();
    const migrationPromises = [];
    
    for (const listingId in listings) {
      const listing = listings[listingId];
      
      // Check if listing has base64 images
      const hasBase64MainImage = listing.mainImage && 
        typeof listing.mainImage === 'object' && 
        listing.mainImage.uri && 
        listing.mainImage.uri.startsWith('data:');
        
      const hasBase64Thumbnails = listing.thumbnails && 
        Array.isArray(listing.thumbnails) && 
        listing.thumbnails.some((thumb: any) => 
          thumb.uri && thumb.uri.startsWith('data:')
        );
      
      if (hasBase64MainImage || hasBase64Thumbnails) {
        console.log(`Migrating images for listing: ${listingId}`);
        
        const migrationPromise = (async () => {
          try {
            const updates: any = {};
            
            // Migrate main image
            if (hasBase64MainImage) {
              const mainImageUri = listing.mainImage.uri;
              const base64Data = mainImageUri.split(',')[1]; // Remove data:image/jpeg;base64, prefix
              const blob = base64ToBlob(base64Data);
              
              const mainImageRef = storageRef(storage, `listings/${listingId}/main_${Date.now()}.jpg`);
              await uploadBytes(mainImageRef, blob);
              const mainImageURL = await getDownloadURL(mainImageRef);
              
              updates.mainImage = { uri: mainImageURL };
            }
            
            // Migrate thumbnails
            if (hasBase64Thumbnails) {
              const thumbnailPromises = listing.thumbnails.map(async (thumb: any, index: number) => {
                if (thumb.uri && thumb.uri.startsWith('data:')) {
                  const base64Data = thumb.uri.split(',')[1];
                  const blob = base64ToBlob(base64Data);
                  
                  const thumbRef = storageRef(storage, `listings/${listingId}/thumbnails/thumb_${index}_${Date.now()}.jpg`);
                  await uploadBytes(thumbRef, blob);
                  const thumbURL = await getDownloadURL(thumbRef);
                  
                  return { uri: thumbURL };
                }
                return thumb; // Keep non-base64 thumbnails as is
              });
              
              const migratedThumbnails = await Promise.all(thumbnailPromises);
              updates.thumbnails = migratedThumbnails;
            }
            
            // Update listing with Storage URLs
            await update(ref(rtdb, `listings/${listingId}`), updates);
            
            // Also update user's listing
            if (listing.ownerId) {
              await update(ref(rtdb, `users/${listing.ownerId}/listings/${listingId}`), updates);
            }
            
            console.log(`✅ Migrated images for listing: ${listingId}`);
          } catch (error) {
            console.error(`❌ Failed to migrate images for listing ${listingId}:`, error);
          }
        })();
        
        migrationPromises.push(migrationPromise);
      }
    }
    
    await Promise.all(migrationPromises);
    console.log('Listing image migration completed');
  } catch (error) {
    console.error('Error during listing image migration:', error);
  }
};

/**
 * Run all migrations
 */
export const runAllMigrations = async (): Promise<void> => {
  console.log('🚀 Starting data migration to Firebase Storage...');
  
  try {
    await migrateProfileImages();
    await migrateListingImages();
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};
