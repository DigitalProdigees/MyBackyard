import { Feature } from '../types';

// Predefined feature sets for different types of backyards
export const featureSets = {
  // Basic backyard features
  basic: [
    {
      icon: '🪑',
      title: 'Outdoor Seating',
      description: 'Comfortable chairs and tables',
    },
    {
      icon: '🌳',
      title: 'Garden Space',
      description: 'Beautiful outdoor garden area',
    },
    {
      icon: '💡',
      title: 'Lighting',
      description: 'Ambient outdoor lighting',
    },
  ],

  // Party/Event focused features
  party: [
    {
      iconSource: require('../../../../../assets/icons/fork.png'),
      title: 'Free Food & Beverage',
      description: 'Professional event planning',
    },
    {
      iconSource: require('../../../../../assets/icons/icWifi.png'),
      title: 'Free Wifi',
      description: 'High-quality audio equipment',
    },
  ],

  // Luxury backyard features
};

// Predefined additional services
export const serviceSets = {
  // Basic services
  basic: [
    {
      iconSource: require('../../../../../assets/icons/fork.png'),
      title: 'Party Furniture',
      description: 'Food and beverage service',
    },
    {
      iconSource: require('../../../../../assets/icons/icWifi.png'),
      title: 'Event Organizer',
      description: 'Event decoration setup',
    },
  ],

  // Premium services
  premium: [
    {
      iconSource: require('../../../../../assets/icons/fork.png'),
      title: 'Party Furniture',
      description: 'Gourmet food and beverage service',
    },
    {
      iconSource: require('../../../../../assets/icons/icWifi.png'),
      title: 'Event Organizer',
      description: 'Personalized theme decorations',
    },
  ],

  // Wedding services
  wedding: [
    {
      icon: '💒',
      title: 'Wedding Planning',
      description: 'Complete wedding coordination',
    },
    {
      icon: '📸',
      title: 'Wedding Photography',
      description: 'Professional wedding photos',
    },
    {
      icon: '🎵',
      title: 'Wedding Music',
      description: 'Live band or DJ service',
    },
    {
      icon: '🍰',
      title: 'Wedding Cake',
      description: 'Custom wedding cake design',
    },
  ],
};

// Helper function to get features by type
export const getFeaturesByType = (type: keyof typeof featureSets): Feature[] => {
  return featureSets[type] || featureSets.basic;
};

// Helper function to get services by type
export const getServicesByType = (type: keyof typeof serviceSets): Feature[] => {
  return serviceSets[type] || serviceSets.basic;
};
