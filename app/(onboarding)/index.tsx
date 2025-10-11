import React, { useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import OnboardingContent from '../components/onboarding/OnboardingContent';
import { ONBOARDING_SLIDES } from '../constants/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    console.log('handleNext called, currentIndex:', currentIndex);
    if (currentIndex === ONBOARDING_SLIDES.length - 1) {
      console.log('On last slide, completing onboarding and navigating to sign-in');
      try {
        // Mark onboarding as completed and app first launch as done
        await AsyncStorage.multiSet([
          ['onboarded', 'true'],
          ['app_first_launch', 'false']
        ]);
        router.replace('/(auth)/sign-in');
        console.log('Navigation called');
      } catch (error) {
        console.error('Error during navigation:', error);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = async () => {
    console.log('handleSkip called');
    try {
      // Mark onboarding as completed and app first launch as done
      await AsyncStorage.multiSet([
        ['onboarded', 'true'],
        ['app_first_launch', 'false']
      ]);
      router.replace('/(auth)/sign-in');
      console.log('Navigation called');
    } catch (error) {
      console.error('Error during navigation:', error);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingContent 
        onNext={handleNext} 
        onSkip={handleSkip}
        slide={ONBOARDING_SLIDES[currentIndex]}
        currentIndex={currentIndex} 
        totalSlides={ONBOARDING_SLIDES.length}
      />
    </>
  );
} 