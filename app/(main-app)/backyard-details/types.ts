/**
 * Types for the Backyard Details screen
 */

export interface Review {
  name: string;
  rating: number;
  review: string;
  avatar: any;
}

export interface Feature {
  icon?: string; // Emoji icon
  iconSource?: any; // Image icon from assets
  title: string;
  description?: string;
}

export interface BackyardDetails {
  name: string;
  location: string;
  price: string;
  distance: string;
  dimensions: string;
  mainImage: any;
  thumbnails: any[];
  features: Feature[];
  additionalServices: Feature[];
  description: string;
  aboutOwner: string;
  houseRules: string[];
  cancellationPolicy: string;
  reviews: Review[];
}
