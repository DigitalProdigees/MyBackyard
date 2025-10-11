// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB-riMybemYLOeW43KgOIIulwA0F4buSlQ",
  authDomain: "mybackyard-55716.firebaseapp.com",
  databaseURL: "https://mybackyard-55716-default-rtdb.firebaseio.com",
  projectId: "mybackyard-55716",
  storageBucket: "mybackyard-55716.firebasestorage.app",
  messagingSenderId: "635331916969",
  appId: "1:635331916969:web:a8db6d9e5b732bdb85a5b8",
  measurementId: "G-0DJ8ZWD16L"
};

// Initialize Firebase app
export const firebaseApp = initializeApp(firebaseConfig);

// Export Realtime Database instance
export const db = getDatabase(firebaseApp);

// For in-app password reset without Dynamic Links, host a small redirect page
// on your HTTPS domain (Firebase Hosting is fine) that forwards to the app scheme.
// Example: https://backyard-22ecb.web.app/reset-redirect
export const RESET_REDIRECT_URL = 'https://backyard-22ecb.web.app/reset-redirect';
