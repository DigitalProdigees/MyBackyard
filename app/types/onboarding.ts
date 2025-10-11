export interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  image: any; // Will be required from assets
  statusBarStyle: 'light-content' | 'dark-content';
}

export interface OnboardingContentProps {
  slide: OnboardingSlide;
  currentIndex: number;
  totalSlides: number;
  onNext: () => Promise<void>;
  onSkip: () => Promise<void>;
}

// Default export for routing purposes
export default {}; 