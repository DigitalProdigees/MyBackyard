import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ImageUploadResult {
  url: string;
  path: string;
}

/**
 * Convert image to WebP format
 */
export const convertImageToWebP = async (imageUri: string, quality: number = 0.8): Promise<string> => {
  try {
    const result = await manipulateAsync(
      imageUri,
      [], // No transformations needed, just format conversion
      {
        compress: quality,
        format: SaveFormat.WEBP,
      }
    );
    return result.uri;
  } catch (error) {
    console.log('Error converting image to WebP:', error);
    throw error;
  }
};

/**
 * Upload a single image to Firebase Storage
 */
export const uploadImageToStorage = async (
  imageUri: string,
  path: string,
  fileName?: string,
  convertToWebP: boolean = true
): Promise<ImageUploadResult> => {
  try {
    // Check authentication before upload
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.uid) {
      throw new Error('User must be authenticated to upload images');
    }
    
    console.log('🔐 Uploading with authenticated user:', currentUser.uid);
    
    // Convert to WebP format if requested
    let processedImageUri = imageUri;
    if (convertToWebP) {
      console.log('Converting image to WebP format...');
      processedImageUri = await convertImageToWebP(imageUri, 0.8);
    }
    
    // Create a reference to the file location
    const imageRef = ref(storage, `${path}/${fileName || Date.now().toString()}`);
    
    console.log('📤 Uploading to path:', imageRef.fullPath);
    
    // Convert URI to blob for upload
    const response = await fetch(processedImageUri);
    const blob = await response.blob();
    
    // Upload the file
    const snapshot = await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Image uploaded successfully:', downloadURL);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.log('Error uploading image to storage:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Firebase Storage
 */
export const uploadMultipleImagesToStorage = async (
  imageUris: string[],
  basePath: string,
  convertToWebP: boolean = true
): Promise<ImageUploadResult[]> => {
  try {
    const uploadPromises = imageUris.map((uri, index) => 
      uploadImageToStorage(uri, basePath, `image_${index}_${Date.now()}`, convertToWebP)
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.log('Error uploading multiple images to storage:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 */
export const deleteImageFromStorage = async (imagePath: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.log('Error deleting image from storage:', error);
    throw error;
  }
};

/**
 * Delete multiple images from Firebase Storage
 */
export const deleteMultipleImagesFromStorage = async (imagePaths: string[]): Promise<void> => {
  try {
    const deletePromises = imagePaths.map(path => deleteImageFromStorage(path));
    await Promise.all(deletePromises);
  } catch (error) {
    console.log('Error deleting multiple images from storage:', error);
    throw error;
  }
};

/**
 * Generate a unique filename for listing images
 */
export const generateListingImagePath = (listingId: string, imageType: 'main' | 'thumbnail', index?: number): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  
  if (imageType === 'main') {
    return `listings/${listingId}/main_${timestamp}_${randomId}.webp`;
  } else {
    return `listings/${listingId}/thumbnails/thumb_${index || 0}_${timestamp}_${randomId}.webp`;
  }
};

/**
 * Upload listing images (main image and thumbnails)
 */
export const uploadListingImages = async (
  listingId: string,
  mainImageUri?: string,
  thumbnailUris?: string[],
  convertToWebP: boolean = true
): Promise<{
  mainImageUrl?: string;
  thumbnailUrls?: string[];
}> => {
  try {
    const results: {
      mainImageUrl?: string;
      thumbnailUrls?: string[];
    } = {};

    // Upload main image
    if (mainImageUri) {
      // Generate the full path with filename
      const fullMainImagePath = generateListingImagePath(listingId, 'main');
      // Extract directory and filename
      const pathParts = fullMainImagePath.split('/');
      const fileName = pathParts.pop() || `main_${Date.now()}.webp`;
      const directoryPath = pathParts.join('/');
      
      const mainImageResult = await uploadImageToStorage(mainImageUri, directoryPath, fileName, convertToWebP);
      results.mainImageUrl = mainImageResult.url;
    }

    // Upload thumbnails
    if (thumbnailUris && thumbnailUris.length > 0) {
      const thumbnailPromises = thumbnailUris.map(async (uri, index) => {
        // Generate the full path with filename
        const fullThumbnailPath = generateListingImagePath(listingId, 'thumbnail', index);
        // Extract directory and filename
        const pathParts = fullThumbnailPath.split('/');
        const fileName = pathParts.pop() || `thumb_${index}_${Date.now()}.webp`;
        const directoryPath = pathParts.join('/');
        
        return uploadImageToStorage(uri, directoryPath, fileName, convertToWebP);
      });
      
      const thumbnailResults = await Promise.all(thumbnailPromises);
      results.thumbnailUrls = thumbnailResults.map(result => result.url);
    }

    return results;
  } catch (error) {
    console.log('Error uploading listing images:', error);
    throw error;
  }
};
