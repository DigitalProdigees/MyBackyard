import { OnboardingSlide } from '../types/onboarding';

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Lorem Ipsum Dolor',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip e',
    image: require('../../assets/onboarding-1.png'),
    statusBarStyle: 'light-content'
  },
  {
    id: 2,
    title: 'Discover Nature',
    description: 'Experience the beauty of nature through our curated collection of natural wonders. Connect with the environment and find your peace.',
    image: require('../../assets/onboarding-2.png'),
    statusBarStyle: 'dark-content'
  },
  {
    id: 3,
    title: 'Start Your Journey',
    description: 'Begin your adventure today. Explore unique locations, meet new people, and create lasting memories in the great outdoors.',
    image: require('../../assets/onboarding-3.png'),
    statusBarStyle: 'dark-content'
  }
];

export default { ONBOARDING_SLIDES }; 