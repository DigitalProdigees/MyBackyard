import { useState, useEffect, useCallback } from 'react';

interface ImageLoadingState {
  isLoading: boolean;
  loadedImages: Set<string>;
  totalImages: number;
  allImagesLoaded: boolean;
}

/**
 * Custom hook to track image loading state
 * Returns loading state that only becomes false when all images are loaded
 */
export const useImageLoadingState = (listings: any[]) => {
  const [imageState, setImageState] = useState<ImageLoadingState>({
    isLoading: true,
    loadedImages: new Set(),
    totalImages: 0,
    allImagesLoaded: false
  });

  // Count total images that need to be loaded
  useEffect(() => {
    let totalImages = 0;
    
    listings.forEach(listing => {
      // Count main image (both remote and local)
      if (listing.mainImage) {
        if (listing.mainImage.uri || typeof listing.mainImage === 'string') {
          totalImages++;
        } else if (typeof listing.mainImage === 'number') {
          // Local image (require() result)
          totalImages++;
        }
      } else {
        // Fallback image will be used
        totalImages++;
      }
      // Count thumbnails
      if (listing.thumbnails && Array.isArray(listing.thumbnails)) {
        totalImages += listing.thumbnails.filter((thumb: any) => thumb?.uri || typeof thumb === 'string' || typeof thumb === 'number').length;
      }
    });

    setImageState(prev => ({
      ...prev,
      totalImages,
      allImagesLoaded: totalImages === 0 || prev.loadedImages.size >= totalImages,
      isLoading: totalImages > 0 && prev.loadedImages.size < totalImages
    }));
  }, [listings]);

  // Only reset loading state when listings actually change (not just on re-render)
  useEffect(() => {
    // Check if listings have actually changed by comparing IDs
    const currentListingIds = listings.map(l => l.id).sort().join(',');
    
    setImageState(prev => {
      // Use a different approach to track previous listing IDs
      const prevListingIds = prev.loadedImages.has('__listing_ids__') ? 
        Array.from(prev.loadedImages).find(id => id.startsWith('__listing_ids__'))?.replace('__listing_ids__', '') || '' : '';
      
      // Only reset if listings actually changed
      if (currentListingIds !== prevListingIds && currentListingIds !== '') {
        console.log('🔄 Listings changed, resetting image loading state');
        return {
          ...prev,
          isLoading: true,
          loadedImages: new Set([`__listing_ids__${currentListingIds}`]),
          allImagesLoaded: false
        };
      }
      
      return prev;
    });
  }, [listings]);

  const onImageLoad = useCallback((imageUri: string) => {
    setImageState(prev => {
      const newLoadedImages = new Set(prev.loadedImages);
      newLoadedImages.add(imageUri);
      
      const allLoaded = newLoadedImages.size >= prev.totalImages;
      
      console.log(`🖼️ Image loaded: ${imageUri.substring(0, 50)}...`);
      console.log(`📊 Progress: ${newLoadedImages.size}/${prev.totalImages} images loaded`);
      console.log(`✅ All images loaded: ${allLoaded}`);
      
      return {
        ...prev,
        loadedImages: newLoadedImages,
        allImagesLoaded: allLoaded,
        isLoading: !allLoaded
      };
    });
  }, []);

  const onImageError = useCallback((imageUri: string) => {
    // Still count as "loaded" even if it failed, to prevent infinite loading
    onImageLoad(imageUri);
  }, [onImageLoad]);

  return {
    isLoading: imageState.isLoading,
    allImagesLoaded: imageState.allImagesLoaded,
    loadedCount: imageState.loadedImages.size,
    totalCount: imageState.totalImages,
    onImageLoad,
    onImageError
  };
};