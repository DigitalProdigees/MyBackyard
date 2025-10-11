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
  listingId?: string;
  onPress?: () => void;
  onDelete?: () => void;
}
