import { storage } from '../firebase';
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
    console.error('Error converting image to WebP:', error);
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
    // Convert to WebP format if requested
    let processedImageUri = imageUri;
    if (convertToWebP) {
      console.log('Converting image to WebP format...');
      processedImageUri = await convertImageToWebP(imageUri, 0.8);
    }
    
    // Create a reference to the file location
    const imageRef = ref(storage, `${path}/${fileName || Date.now().toString()}`);
    
    // Convert URI to blob for upload
    const response = await fetch(processedImageUri);
    const blob = await response.blob();
    
    // Upload the file
    const snapshot = await uploadBytes(imageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath
    };
  } catch (error) {
    console.error('Error uploading image to storage:', error);
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
    console.error('Error uploading multiple images to storage:', error);
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
    console.error('Error deleting image from storage:', error);
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
    console.error('Error deleting multiple images from storage:', error);
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
      const mainImagePath = generateListingImagePath(listingId, 'main');
      const mainImageResult = await uploadImageToStorage(mainImageUri, mainImagePath, undefined, convertToWebP);
      results.mainImageUrl = mainImageResult.url;
    }

    // Upload thumbnails
    if (thumbnailUris && thumbnailUris.length > 0) {
      const thumbnailPromises = thumbnailUris.map((uri, index) => {
        const thumbnailPath = generateListingImagePath(listingId, 'thumbnail', index);
        return uploadImageToStorage(uri, thumbnailPath, undefined, convertToWebP);
      });
      
      const thumbnailResults = await Promise.all(thumbnailPromises);
      results.thumbnailUrls = thumbnailResults.map(result => result.url);
    }

    return results;
  } catch (error) {
    console.error('Error uploading listing images:', error);
    throw error;
  }
};
