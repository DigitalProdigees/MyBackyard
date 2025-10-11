import 'dotenv/config';

// Frontend-only configuration - no backend connections, no OAuth
export default {
  expo: {
    name: 'MyBackyard',
    slug: 'mybackyard',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'mybackyard',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.mybackyard.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.mybackyard.app',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-web-browser'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'c107ab6a-e78b-4116-b461-61e5d3223362',
      },
    },
  },
};
