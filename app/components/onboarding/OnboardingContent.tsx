import React from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Text, PixelRatio, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { OnboardingContentProps } from '../../types/onboarding';
import GradientButton from '../buttons/GradientButton';

const { width, height } = Dimensions.get('window');

// Calculate responsive values
const IMAGE_HEIGHT = height * 0.65;
const CONTENT_HEIGHT = height - IMAGE_HEIGHT;
const BOTTOM_SPACING = 16;

// Calculate responsive font sizes
const scale = Math.min(width, height) / 375;
const normalizeFont = (size: number) => Math.round(PixelRatio.roundToNearestPixel(size * scale));

// Calculate blur box height
const BLUR_BOX_HEIGHT = 120;
const TEXT_OVERFLOW = 40;

export default function OnboardingContent({ 
  slide, 
  currentIndex, 
  totalSlides, 
  onNext, 
  onSkip 
}: OnboardingContentProps) {
  // Add safety check for slide data
  if (!slide) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={slide.statusBarStyle} />
      <View style={styles.imageContainer}>
        <Image 
          source={slide.image}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.textContainer}>
          <BlurView intensity={26} style={styles.imageOverlay}>
            <View style={styles.overlayBackground} />
          </BlurView>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>{slide.title}</Text>
            <Text style={styles.overlayText}>{slide.description}</Text>
          </View>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.innerContent}>
          <View style={styles.dots}>
            {Array.from({ length: totalSlides }).map((_, index) => (
              <View 
                key={index}
                style={[styles.dot, currentIndex === index && styles.activeDot]} 
              />
            ))}
          </View>
          <GradientButton
            text={currentIndex === totalSlides - 1 ? 'Get Started' : 'Next'}
            onPress={() => {
              console.log('Next/Get Started button pressed');
              onNext();
            }}
            containerStyle={styles.nextButtonContainer}
          />
          <TouchableOpacity 
            onPress={() => {
              console.log('Skip button pressed');
              onSkip();
            }}
            style={[
              styles.skipButton,
              currentIndex !== totalSlides - 1 && styles.skipButtonVisible
            ]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1B69',
  },
  imageContainer: {
    position: 'relative',
    height: IMAGE_HEIGHT,
  },
  image: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  textContainer: {
    position: 'absolute',
    bottom: -TEXT_OVERFLOW,
    left: 0,
    right: 0,
    height: BLUR_BOX_HEIGHT + TEXT_OVERFLOW,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BLUR_BOX_HEIGHT,
    backgroundColor: 'transparent',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#232C60',
    opacity: 0.65, // Reduced opacity to match design
  },
  overlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BLUR_BOX_HEIGHT + TEXT_OVERFLOW,
    paddingHorizontal: width * 0.06,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15, // Reduced padding top
  },
  overlayTitle: {
    fontFamily: 'Urbanist',
    fontSize: normalizeFont(32),
    fontWeight: '700',
    lineHeight: normalizeFont(45),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    width: '100%',
  },
  overlayText: {
    fontFamily: 'Urbanist',
    fontSize: normalizeFont(13.5),
    fontWeight: '400',
    lineHeight: normalizeFont(20), // Increased line height for better spacing
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '90%', // Constrain width to ensure 3 lines
  },
  contentContainer: {
    height: CONTENT_HEIGHT,
    paddingHorizontal: 22,
    paddingBottom: BOTTOM_SPACING,
  },
  innerContent: {
    height: CONTENT_HEIGHT - BOTTOM_SPACING,
    alignItems: 'center',
    justifyContent: 'center', // Center the content vertically
    paddingTop: BOTTOM_SPACING, // Add some top padding
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: BOTTOM_SPACING,
    width: '100%',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  nextButtonContainer: {
    width: '100%',
    height: 56,
    marginBottom: BOTTOM_SPACING,
  },
  nextButton: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: BOTTOM_SPACING,
    alignSelf: 'center',
    minHeight: 40, // Add fixed height for consistency
    opacity: 0, // Hide but maintain space
  },
  skipButtonVisible: {
    opacity: 1, // Show when visible
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
  },
}); 