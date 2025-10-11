import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Icons } from '../../../../constants/icons';
import FeedbackDialog from '../../../components/dialogs/FeedbackDialog';
import { Toast } from '../../../components/Toast';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, set, update, get, push } from 'firebase/database';

interface BookingItemProps {
  id: string;
  dates: string;
  month: string;
  year: string;
  backyardName: string;
  location: string;
  isPaid: boolean;
  rating?: number;
  review?: string;
  // Time information
  startTime?: string;
  endTime?: string;
  duration?: string;
  formattedDate?: string;
  listingId?: string;
  mainImage?: string;
  onPress?: () => void;
}

export function BookingItem({
  id,
  dates,
  month,
  year,
  backyardName,
  location,
  isPaid,
  rating,
  review,
  startTime,
  endTime,
  duration,
  formattedDate,
  listingId,
  mainImage,
}: BookingItemProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Check if this booking has already been reviewed
  const isAlreadyReviewed = rating !== null && rating !== undefined && rating > 0;
  
  // Debug image data
  console.log('BookingItem received data:', {
    backyardName,
    listingId,
    mainImage,
    imageType: typeof mainImage,
    isString: typeof mainImage === 'string',
    isObject: typeof mainImage === 'object' && mainImage !== null
  });

  const handlePress = () => {
    console.log('BookingItem pressed - navigating to backyard details');
    if (listingId) {
      // Navigate to backyard details
      router.push(`/(main-app)/backyard-details?listingId=${listingId}`);
    }
  };

  const handleReviewPress = (e: any) => {
    // Prevent the event from bubbling up to the parent
    e.stopPropagation();
    console.log('Review button pressed - opening feedback dialog');
    setShowFeedbackDialog(true);
  };

  const handleFeedbackSubmit = async (rating: number, feedback: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.error('User not authenticated');
        return;
      }

      console.log(`Submitting rating for booking ${id}: Rating: ${rating}, Feedback: ${feedback}`);

      // Update booking with rating and review
      const bookingRef = ref(rtdb, `users/${uid}/bookings/${id}`);
      await update(bookingRef, {
        rating: rating,
        review: feedback,
        ratedAt: new Date().toISOString()
      });

      // Also update the main bookings collection
      const mainBookingRef = ref(rtdb, `bookings/${id}`);
      await update(mainBookingRef, {
        rating: rating,
        review: feedback,
        ratedAt: new Date().toISOString()
      });

      // Update the listing's reviews
      const bookingSnapshot = await get(ref(rtdb, `bookings/${id}`));
      if (bookingSnapshot.exists()) {
        const bookingData = bookingSnapshot.val();
        const listingId = bookingData.listingId;
        
        if (listingId) {
          // Add review to listing
          const reviewsRef = ref(rtdb, `listings/${listingId}/reviews`);
          const newReviewRef = push(reviewsRef);
          
          // Fetch user's full name from Firebase
          let userName = 'Guest';
          try {
            const userRef = ref(rtdb, `users/${uid}/fullName`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              userName = userSnapshot.val() || bookingData.fullName || 'Guest';
              console.log('✅ Found user fullName for review:', userName);
            } else {
              console.log('❌ No fullName found in Firebase, using fallback');
              userName = bookingData.fullName || 'Guest';
            }
          } catch (error) {
            console.error('❌ Error fetching user fullName for review:', error);
            userName = bookingData.fullName || 'Guest';
          }

          await set(newReviewRef, {
            id: newReviewRef.key,
            bookingId: id,
            userId: uid,
            userName: userName,
            rating: rating,
            review: feedback,
            createdAt: new Date().toISOString()
          });

          // Update listing's average rating
          const listingReviewsRef = ref(rtdb, `listings/${listingId}/reviews`);
          const reviewsSnapshot = await get(listingReviewsRef);
          
          if (reviewsSnapshot.exists()) {
            const reviews = reviewsSnapshot.val();
            let totalRating = 0;
            let reviewCount = 0;
            
            for (const reviewId in reviews) {
              const review = reviews[reviewId];
              totalRating += review.rating;
              reviewCount++;
            }
            
            const averageRating = totalRating / reviewCount;
            
            // Update listing with new average rating
            const listingRef = ref(rtdb, `listings/${listingId}`);
            await update(listingRef, {
              averageRating: averageRating,
              reviewCount: reviewCount
            });
          }
        }
      }

      console.log('Rating submitted successfully');
      
      // Close the dialog
      setShowFeedbackDialog(false);
      
      // Show success toast
      setToastMessage('Review submitted successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error submitting rating:', error);
      
      // Show error toast
      setToastMessage('Failed to submit review');
      setToastType('error');
      setShowToast(true);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.cardContainer}>
          {/* Backyard Image - Top */}
          <View style={styles.imageWrapper}>
            <Image 
              source={
                mainImage 
                  ? (typeof mainImage === 'string' 
                      ? { uri: mainImage }
                      : mainImage)
                  : require('../../../../assets/icons/renter_home_1.png')
              } 
              style={styles.backyardImage}
              resizeMode="cover"
            />
          </View>

          {/* Content Container - Bottom */}
          <View style={styles.contentContainer}>
            <View style={styles.infoContainer}>
              <View style={styles.nameLocationContainer}>
                <Text style={styles.backyardName}>{backyardName}</Text>
                <Text style={styles.location}>{location}</Text>
              </View>
              
              {/* Date and Time information */}
              <View style={styles.dateTimeContainer}>
                {/* Formatted Date */}
                {formattedDate && (
                  <View style={styles.dateRow}>
                    <Image source={require('../../../../assets/icons/calendar.png')} style={styles.dateIcon} />
                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>
                )}
                
                {/* Time information */}
                {(startTime || endTime) && (
                  <View style={styles.timeRow}>
                    <Image source={require('../../../../assets/icons/clock.png')} style={styles.timeIcon} />
                    <Text style={styles.timeText}>
                      {startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime}
                      {duration && ` (${duration} hours)`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right Side - Status and Review Button */}
            <View style={styles.rightContainer}>
              {/* Status */}
              <View style={styles.statusContainer}>
                {isPaid ? (
                  <View style={styles.paidButton}>
                    <Text style={styles.paidText}>Paid</Text>
                  </View>
                ) : (
                  <View style={styles.pendingButton}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>

              {/* Review Button */}
              {isPaid && (
                <TouchableOpacity 
                  style={styles.reviewButton}
                  onPress={handleReviewPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewButtonText}>
                    {isAlreadyReviewed ?'Review' : 'Review'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {/* Feedback Dialog */}
      <FeedbackDialog
        visible={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        onSubmit={handleFeedbackSubmit}
        isAlreadyReviewed={isAlreadyReviewed}
        existingRating={rating || 0}
        existingReview={review || ''}
      />
      
      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  container: {
  },
  cardContainer: {
  },
  imageWrapper: {
    padding: 15,
    backgroundColor: '#00000033',    marginBottom: 0,
    borderTopLeftRadius:16,
    borderTopRightRadius:16,
  },
  backyardImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  contentContainer: {
    padding: 15,
    borderBottomLeftRadius:16,
    borderBottomRightRadius:16,
    backgroundColor: '#00000033',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoContainer: {
    flex: 1,
    paddingRight: 12,
  },
  nameLocationContainer: {
    marginBottom: 8,
  },
  backyardName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  location: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateTimeContainer: {
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#FFFFFF',
  },
  dateText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#A6E66E',
  },
  timeText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#A6E66E',
  },
  detailsButtonContainer: {
    paddingLeft: 56, // Same as icon + margin
    marginTop: 8,
    marginBottom: 4,
  },
  detailsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
  },
  detailsButtonText: {
    fontFamily: 'Urbanist',
    fontSize: 12,
    color: '#FFFFFF',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusContainer: {
    marginBottom: 8,
  },
  paidButton: {
    backgroundColor: '#00C853',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  paidText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  pendingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  pendingText: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: '#FFFFFF',
  },
  reviewButton: {
    backgroundColor: '#A6E66E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 4,
  },
  reviewButtonText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#1D234B',
  },
}); 