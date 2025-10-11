/**
 * Types for the Home screen
 */

export interface BackyardCardProps {
  imageSource: any;
  name: string;
  location: string;
  distance: string;
  dimensions: string;
  price: string;
  onDelete?: () => void;
  listingId?: string;
  onPress?: () => void;
  thumbnails?: any[];
}
