import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Pressable, Platform, KeyboardAvoidingView, InteractionManager, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GradientButton from '../buttons/GradientButton';
import CircleButton from '../buttons/CircleButton';
import { colors } from '../../../theme/colors';
import { Icons } from '../../../constants/icons';

interface FeedbackDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
  isAlreadyReviewed?: boolean;
  existingRating?: number;
  existingReview?: string;
}

export default function FeedbackDialog({
  visible,
  onClose,
  onSubmit,
  isAlreadyReviewed = false,
  existingRating = 0,
  existingReview = '',
}: FeedbackDialogProps) {
  const [rating, setRating] = useState(existingRating);
  const [feedback, setFeedback] = useState(existingReview);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      console.log('FeedbackDialog is now visible');
      // Reset state with existing data when dialog opens
      setRating(existingRating);
      setFeedback(existingReview);
      // Animate in for Android
      if (Platform.OS === 'android') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        InteractionManager.runAfterInteractions(() => {
          // Modal is ready for interactions
        });
      }
    } else {
      // Animate out for Android
      if (Platform.OS === 'android') {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, existingRating, existingReview, fadeAnim]);

  const handleSubmit = () => {
    console.log('Submitting feedback:', { rating, feedback });
    onSubmit(rating, feedback);
    setRating(0);
    setFeedback('');
    onClose();
  };

  const handleStarPress = (starIndex: number) => {
    console.log('Star pressed:', starIndex);
    setRating(starIndex);
  };

  const handleDeleteListing = () => {
    // Implementation of handleDeleteListing
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'android' ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.overlay, Platform.OS === 'android' ? { opacity: fadeAnim } : { opacity: visible ? 1 : 0 }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContainer}>
          {/* Close Button positioned to overlay the top of the modal */}
          <View style={styles.closeButtonWrapper}>
            <CircleButton
              icon={Icons.union}
              onPress={onClose}
              style={styles.circleButtonStyle}
            />
          </View>

          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <View style={styles.dialogContainer}>
              <LinearGradient
                colors={[
                  '#202857',
                  '#202857',
                  '#46B649',
                  '#34A853',
                  '#202857',
                  '#202857'
                ]}
                style={StyleSheet.absoluteFill}
                start={{ x: -0.9, y: -0.9 }}
                end={{ x: 1.1, y: 0.3 }}
                locations={[0, 0.1, 0.1, 0.45, 0.9, 0.1]}
              />
              <View style={styles.content}>
                {/* Title */}
                <Text style={styles.title}>How was your activity?</Text>

                {/* Star Rating */}
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={isAlreadyReviewed ? () => {} : () => handleStarPress(star)}
                      style={[styles.starButton, isAlreadyReviewed && styles.disabledStarButton]}
                      activeOpacity={isAlreadyReviewed ? 1 : 0.7}
                      disabled={isAlreadyReviewed}
                    >
                      <Text style={[
                        styles.star,
                        star <= rating ? styles.starFilled : styles.starEmpty,
                        isAlreadyReviewed && styles.disabledStar
                      ]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Feedback section */}
                <Text style={styles.feedbackLabel}>Feedback</Text>
                <TextInput
                  style={[styles.feedbackInput, isAlreadyReviewed && styles.disabledInput]}
                  placeholder={isAlreadyReviewed ? "" : "Add here..."}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  multiline
                  value={feedback}
                  onChangeText={isAlreadyReviewed ? () => {} : setFeedback}
                  editable={!isAlreadyReviewed}
                  blurOnSubmit={false}
                  returnKeyType="default"
                  // Ensure TextInput can receive focus on Android
                  onFocus={() => {
                    if (Platform.OS === 'android' && !isAlreadyReviewed) {
                      // Force keyboard to show on Android
                      setTimeout(() => {
                        // This helps ensure the keyboard appears
                      }, 100);
                    }
                  }}
                />

                {/* Submit Button */}
                <GradientButton
                  text={isAlreadyReviewed ? "Already Reviewed" : "Submit"}
                  onPress={isAlreadyReviewed ? () => {} : handleSubmit}
                  containerStyle={StyleSheet.flatten([styles.button, isAlreadyReviewed && styles.disabledButton])}
                  disabled={isAlreadyReviewed}
                />
              </View>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'relative',
    alignItems: 'center',
    width: '80%',
    maxWidth: 350,
  },
  closeButtonWrapper: {
    position: 'absolute',

    top: -10,
  },
  blurContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dialogContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 30,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 24,

  },
  starButton: {
    padding: 10,
  },
  star: {
    fontSize: 40,
  },
  starEmpty: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  starFilled: {
    color: '#FFA500',
  },
  feedbackLabel: {
    alignSelf: 'flex-start',
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  feedbackInput: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    color: colors.text.primary,
    marginBottom: 24,
    textAlignVertical: 'top',
    fontFamily: 'Urbanist',
  },
  button: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledStarButton: {
    opacity: 0.6,
  },
  disabledStar: {
    opacity: 0.7,
  },
  disabledInput: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleButtonStyle: {
    backgroundColor: '#34A85390', // Matches the top color of the gradient
  },
}); 