import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { BackyardDetails as BackyardDetailsType } from './types';
import { useAppSelector } from '@/app/store/hooks';
import { FeatureItem, ReviewCard } from './components';
import { getFeaturesByType, getServicesByType } from './data/featureSets';
import { GradientBackground, GradientButton, Header } from '@/app/components';
import { Icons } from '@/constants/icons';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get, onValue, off, update } from 'firebase/database';
import { getUserProfileImage } from '@/app/lib/utils/profileImageUtils';
const { width, height } = Dimensions.get('window');

export default function BackyardDetails() {
  const { items: listings, selectedId } = useAppSelector((state) => state.listings);
  const selected = listings.find((l) => l.id === selectedId) ?? null;
  const [reviews, setReviews] = useState<any[]>([]);

  // Fetch reviews from Firebase
  useEffect(() => {
    if (!selected?.id) return;

    const fetchReviews = async () => {
      try {
        const reviewsRef = ref(rtdb, `listings/${selected.id}/reviews`);
        const snapshot = await get(reviewsRef);
        
        if (snapshot.exists()) {
          const reviewsData = snapshot.val();
          const reviewsArray = [];
          
          // Fetch user names for all reviews
          const reviewPromises = Object.keys(reviewsData).map(async (reviewId) => {
            const review = reviewsData[reviewId];
            let userName = review.userName || 'Anonymous';
            
            // If we have a userId, fetch the actual user's full name and profile image
            let avatar = require('../../../../assets/icons/profile.png');
            if (review.userId) {
              try {
                const userRef = ref(rtdb, `users/${review.userId}/fullName`);
                const userSnapshot = await get(userRef);
                if (userSnapshot.exists()) {
                  const fullName = userSnapshot.val();
                  userName = fullName || review.userName || 'Anonymous';
                  
                  // If the stored userName is "Guest" but we found a real fullName, update the review
                  if (review.userName === 'Guest' && fullName && fullName !== 'Guest') {
                    console.log('🔄 Owner App: Updating review with correct userName from Guest to:', fullName);
                    try {
                      const reviewRef = ref(rtdb, `listings/${selected.id}/reviews/${reviewId}`);
                      await update(reviewRef, { userName: fullName });
                      console.log('✅ Owner App: Successfully updated review userName in Firebase');
                    } catch (updateError) {
                      console.log('❌ Owner App: Error updating review userName:', updateError);
                    }
                  }
                }
                
                // Fetch user profile image
                const profileImageData = await getUserProfileImage(review.userId);
                if (profileImageData) {
                  avatar = { uri: profileImageData.uri };
                }
              } catch (error) {
                console.log('Error fetching user data:', error);
                // Keep the fallback userName and avatar
              }
            }
            
            return {
              id: reviewId,
              name: userName,
              rating: review.rating || 0,
              review: review.review || '',
              avatar: avatar,
              createdAt: review.createdAt
            };
          });
          
          const resolvedReviews = await Promise.all(reviewPromises);
          reviewsArray.push(...resolvedReviews);
          
          // Sort by creation date (newest first)
          reviewsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReviews(reviewsArray);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.log('Error fetching reviews:', error);
        setReviews([]);
      }
    };

    fetchReviews();

    // Set up real-time listener for reviews
    const reviewsRef = ref(rtdb, `listings/${selected.id}/reviews`);
    const unsubscribe = onValue(reviewsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const reviewsData = snapshot.val();
        const reviewsArray = [];
        
        // Fetch user names for all reviews
        const reviewPromises = Object.keys(reviewsData).map(async (reviewId) => {
          const review = reviewsData[reviewId];
          let userName = review.userName || 'Anonymous';
          
          // If we have a userId, fetch the actual user's full name and profile image
          let avatar = require('../../../../assets/icons/profile.png');
          if (review.userId) {
            try {
              const userRef = ref(rtdb, `users/${review.userId}/fullName`);
              const userSnapshot = await get(userRef);
              if (userSnapshot.exists()) {
                userName = userSnapshot.val() || review.userName || 'Anonymous';
              }
              
              // Fetch user profile image
              const profileImageData = await getUserProfileImage(review.userId);
              if (profileImageData) {
                avatar = { uri: profileImageData.uri };
              }
            } catch (error) {
              console.log('Error fetching user data:', error);
              // Keep the fallback userName and avatar
            }
          }
          
          return {
            id: reviewId,
            name: userName,
            rating: review.rating || 0,
            review: review.review || '',
            avatar: avatar,
            createdAt: review.createdAt
          };
        });
        
        const resolvedReviews = await Promise.all(reviewPromises);
        reviewsArray.push(...resolvedReviews);
        
        // Sort by creation date (newest first)
        reviewsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(reviewsArray);
      } else {
        setReviews([]);
      }
    });

    return () => {
      off(reviewsRef);
      unsubscribe();
    };
  }, [selected?.id]);

  const normalizeImage = (img: any) => {
    console.log('🔍 Owner normalizeImage input:', img, 'type:', typeof img);
    
    // Handle string URLs (new format)
    if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('data:'))) {
      console.log('✅ Owner normalizeImage: returning string URL as uri');
      return { uri: img };
    }
    
    // Handle objects with uri property (legacy format)
    if (img && typeof img === 'object' && img.uri && typeof img.uri === 'string' && (img.uri.startsWith('http') || img.uri.startsWith('data:'))) {
      console.log('✅ Owner normalizeImage: returning img.uri from object');
      return { uri: img.uri };
    }
    
    // Handle Firebase Storage URLs that might not start with http (fallback)
    if (typeof img === 'string' && img.length > 0) {
      console.log('✅ Owner normalizeImage: treating as Firebase Storage URL');
      return { uri: img };
    }
    
    console.log('⚠️ Owner normalizeImage: returning original img (fallback)');
    return img;
  };

  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const backyard: BackyardDetailsType = {
    name: selected?.title || "Backyard Name",
    location: selected?.location || `${selected?.city ?? ''}${selected?.city && selected?.country ? ', ' : ''}${selected?.country ?? ''}` || 'Washington DC, USA',
    price: selected?.pricePerHour ? `$${selected.pricePerHour}/hour` : "$100/hour",
    distance: selected?.distance || "1.5 KM",
    dimensions: selected?.dimensions || "100m - 200m",
    mainImage: selected?.mainImage ? normalizeImage(selected.mainImage) : require('../../../../assets/icons/renter_home_1.png'),
    thumbnails: selected?.thumbnails && selected.thumbnails.length > 0
      ? selected.thumbnails.map((t: any) => normalizeImage(t))
      : selected?.mainImage 
        ? [normalizeImage(selected.mainImage)] // Use main image as thumbnail if no thumbnails
        : [
          require('../../../../assets/icons/renter_home_1.png'),
          require('../../../../assets/icons/renter_home_2.png'),
          require('../../../../assets/icons/renter_home_1.png'),
          require('../../../../assets/icons/renter_home_2.png'),
        ],
    features: (selected?.features ?? []).map((f) => ({ title: f })) || getFeaturesByType('party'),
    additionalServices: (selected?.additionalServices ?? []).map((s) => ({ title: s })) || getServicesByType('premium'),
    description: selected?.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ",
    aboutOwner: selected?.aboutOwner || "",
    houseRules: selected?.houseRules || [],
    cancellationPolicy: selected?.cancellationPolicy || "",
    reviews: reviews
  };

  const handleBookmarkPress = () => {
    console.log('Bookmark pressed');
  };

  const handleBookingPress = () => {
    console.log('Booking pressed');
    // Navigate to booking screen
    router.push('/(main-app)/booking-details');
  };


  // Local state for swapping main image and thumbnails
  const [activeMain, setActiveMain] = React.useState(backyard.mainImage);
  const [thumbs, setThumbs] = React.useState<any[]>(backyard.thumbnails);

  const handleThumbPress = (index: number) => {
    const clicked = thumbs[index];
    const nextThumbs = [...thumbs];
    nextThumbs[index] = activeMain;
    setActiveMain(clicked);
    setThumbs(nextThumbs);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      <View style={{ backgroundColor: '#00000033', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 26 }}>
        <View style={{ marginBottom: height * 0.05 }}>
          <Header
            customLeftComponent={
              <TouchableOpacity onPress={() => router.back()}>
                <Image
                  source={Icons.back}
                  style={{
                    height: 50,
                    width: 50,

                  }}
                /></TouchableOpacity>
            }
            customCenterComponent={
              <Text style={styles.headerTitle}>Backyard Details</Text>
            }
            customRightComponent={
              <TouchableOpacity style={styles.bookmarkButtonContainer}>
                <Image
                  source={require('../../../../assets/icons/icBookmark.png')}
                  style={styles.bookmarkIcon}
                />
              </TouchableOpacity>
            }
          />
          {/* Main Image with Price Tag */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.imageContainer}>
              <Image source={activeMain} style={styles.mainImage} />
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>{backyard.price}</Text>
              </View>

              {/* Thumbnails */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailScroll}
                contentContainerStyle={styles.thumbnailContainer}
              >
                {thumbs.map((thumb, index) => (
                  <TouchableOpacity key={index} style={styles.thumbnailWrapper} onPress={() => handleThumbPress(index)}>
                    <Image source={thumb} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View></View></View></View>

      {/* Backyard Info */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <View style={styles.cardContent}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.cardTitle}>{backyard.name}</Text>
              <View style={styles.distanceContainer}>
                <Image source={require('../../../../assets/icons/loc.png')} style={styles.distanceIcon} />
                <Text style={styles.distanceText}>{backyard.distance}</Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.locationRow}>
                <Image source={Icons.pin} style={styles.locationIcon} />
                <Text style={styles.locationText}>{backyard.location}</Text>
              </View>

              <View style={styles.dimensionsContainer}>
                <Image source={require('../../../../assets/icons/icDis.png')} style={styles.dimensionsIcon} />
                <Text style={styles.dimensionsText}>{backyard.dimensions}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Line Separator */}
        <View style={styles.separator} />

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresContainer}>
            {backyard.features.map((feature, index) => (
              <FeatureItem
                key={index}
                icon={feature.icon}
                iconSource={feature.iconSource}
                feature={feature.title}
                description={feature.description}
              />
            ))}
          </View>
        </View>

        {/* Additional Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Services</Text>
          <View style={styles.featuresContainer}>
            {backyard.additionalServices.map((service, index) => (
              <FeatureItem
                key={index}
                icon={service.icon}
                iconSource={service.iconSource}
                feature={service.title}
                description={service.description}
              />
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{backyard.description}</Text>
        </View>

        {/* Available Days & Times */}
        {((selected?.availableWeekdays && selected.availableWeekdays.length > 0) || selected?.availableTimes?.startTime) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            
            {/* Available Days */}
            {selected?.availableWeekdays && selected.availableWeekdays.length > 0 && (
              <View style={styles.availabilityItem}>
                <View style={styles.availabilityHeader}>
                  <Image source={require('../../../../assets/icons/calendar.png')} style={styles.availabilityIcon} />
                  <Text style={styles.availabilityLabel}>Available Days</Text>
                </View>
                <View style={styles.weekdaysContainer}>
                  {selected.availableWeekdays.map((day, index) => (
                    <View key={index} style={styles.weekdayPill}>
                      <Text style={styles.weekdayText}>{day}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Available Times */}
            {selected?.availableTimes?.startTime && selected?.availableTimes?.endTime && (
              <View style={styles.availabilityItem}>
                <View style={styles.availabilityHeader}>
                  <Image source={require('../../../../assets/icons/clock.png')} style={styles.availabilityIcon} />
                  <Text style={styles.availabilityLabel}>Available Times</Text>
                </View>
                <Text style={styles.timeText}>
                  {formatTimeDisplay(selected.availableTimes.startTime)} - {formatTimeDisplay(selected.availableTimes.endTime)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* About the Owner */}
        {backyard.aboutOwner && backyard.aboutOwner.trim() !== "" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Owner</Text>
            <Text style={styles.descriptionText}>{backyard.aboutOwner}</Text>
          </View>
        )}

        {/* House Rules */}
        {backyard.houseRules && backyard.houseRules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>House Rules</Text>
            <Text style={styles.descriptionText}>{backyard.houseRules.join(' ')}</Text>
          </View>
        )}

        {/* Safety & Cancellations Policy */}
        {backyard.cancellationPolicy && backyard.cancellationPolicy.trim() !== "" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety & Cancellations Policy</Text>
            <Text style={styles.descriptionText}>{backyard.cancellationPolicy}</Text>
          </View>
        )}

        {/* Reviews & Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
          {reviews.length > 0 ? (
            reviews.map((review, index) => (
              <ReviewCard key={index} review={review} />
            ))
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>

        {/* Spacer for action buttons */}
        <View style={styles.buttonSpacer} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  distanceIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode:'contain',
  },
  dimensionsIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: 'contain'
  },
  dimensionsText: {
    color: 'white',
    fontSize: 14,
  },
  dimensionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distanceText: {
    color: '#929292',
    fontSize: 12,
    opacity: 0.8,
  },
  distanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 40,
    backgroundColor: 'white'
  },
  cardContent: {
    paddingHorizontal: 20,
    marginTop: 10
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  container: {
    flex: 1,
    paddingVertical: height * 0.001, // Responsive vertical padding

  },
  headerBellIcon: {
    width: 53,
    height: 53,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkIcon: {
    height: 50,
    width: 50,
    resizeMode: 'contain',
  },
  bookmarkButtonOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButtonContainer: {
    backgroundColor: '#222952',
    borderRadius: 100,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 20
  },
  imageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  priceTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  thumbnailScroll: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  thumbnailContainer: {
    paddingHorizontal: 10,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    padding: 20,
  },
  backyardName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    width: 16,
    height: 16,
    tintColor: 'white',
    marginRight: 5,
  },
  locationText: {
    color: 'white',
    fontSize: 14,
  },
  detailsRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailIcon: {
    color: 'white',
    fontSize: 16,
    marginRight: 5,
  },
  detailText: {
    color: 'white',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
    marginHorizontal: 20
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 10
  },
  sectionTitle: {
    marginTop: 2,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  descriptionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.8,
  },
  ruleItem: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 8
  },
  bulletPoint: {
    color: 'white',
    fontSize: 18,
    marginRight: 10,
  },
  ruleText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    opacity: 0.8,
  },
  buttonSpacer: {
    height: 20, // Space for the action buttons
  },
  bookingButton: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  bookingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  noReviewsText: {
    color: 'white',
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  // Availability styles
  availabilityItem: {
    marginBottom: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
    tintColor: '#A6E66E',
  },
  availabilityLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayPill: {
    backgroundColor: '#A6E66E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  weekdayText: {
    color: '#1D234B',
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 26,
  },
}); 