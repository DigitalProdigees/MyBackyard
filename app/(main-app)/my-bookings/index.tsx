import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../components/GradientBackground';
import { Header } from '../../components/Header';
import { Icons } from '../../../constants/icons';
import { BookingItem } from './components/BookingItem';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get, onValue, off } from 'firebase/database';

type FilterType = 'all' | 'upcoming' | 'past';
const { width, height } = Dimensions.get('window');

interface Booking {
  id: string;
  dates: string;
  month: string;
  year: string;
  backyardName: string;
  location: string;
  isPaid: boolean;
  rating?: number;
  review?: string;
  bookingDate: string;
  status: string;
  listingId?: string;
  mainImage?: string;
  // Time information
  startTime?: string;
  endTime?: string;
  duration?: string;
  formattedDate?: string;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [listingImages, setListingImages] = useState<{[key: string]: string}>({});

  // Helper function to format time display
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Function to fetch listing images
  const fetchListingImages = async (listingIds: string[]) => {
    const images: {[key: string]: string} = {};
    
    for (const listingId of listingIds) {
      try {
        const listingRef = ref(rtdb, `listings/${listingId}`);
        const listingSnapshot = await get(listingRef);
        
        if (listingSnapshot.exists()) {
          const listingData = listingSnapshot.val();
          console.log('Listing data for', listingId, ':', {
            mainImage: listingData.mainImage,
            images: listingData.images,
            title: listingData.title
          });
          
          // Try different possible image field names
          const imageUrl = listingData.mainImage || listingData.images?.[0] || listingData.image;
          if (imageUrl) {
            images[listingId] = imageUrl;
            console.log('Found image for listing', listingId, ':', imageUrl);
          } else {
            console.log('No image found for listing', listingId);
          }
        }
      } catch (error) {
        console.log('Error fetching listing image for', listingId, ':', error);
      }
    }
    
    return images;
  };

  // Fetch bookings from Firebase using real-time listener
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    // Set up real-time listener (this handles both initial load and updates)
    const userBookingsRef = ref(rtdb, `users/${uid}/bookings`);
    const unsubscribe = onValue(userBookingsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const bookingsData = snapshot.val();
          const bookingsArray: Booking[] = [];
          
          for (const bookingId in bookingsData) {
            const booking = bookingsData[bookingId];
            const bookingDate = new Date(booking.bookingDate || booking.createdAt);
            

            // Only include bookings that are paid and have successful payment status
            if (booking.isPaid && booking.paymentStatus === 'completed') {
              console.log('Raw booking data for', booking.backyardName || booking.listingInfo?.title, ':', {
                bookingId: bookingId,
                listingId: booking.listingId,
                mainImage: booking.mainImage,
                mainImageType: typeof booking.mainImage,
                listingInfo: booking.listingInfo,
                listingInfoMainImage: booking.listingInfo?.mainImage
              });
              
              bookingsArray.push({
                id: booking.id || bookingId,
                dates: booking.dates || bookingDate.toLocaleDateString('en-US', { day: 'numeric' }),
                month: booking.month || bookingDate.toLocaleDateString('en-US', { month: 'long' }),
                year: booking.year || bookingDate.toLocaleDateString('en-US', { year: 'numeric' }),
                backyardName: booking.backyardName || booking.listingInfo?.title || 'Backyard',
                location: booking.location || booking.listingInfo?.location || 'Location',
                isPaid: booking.isPaid || false,
                rating: booking.rating || null,
                review: booking.review || null,
                bookingDate: booking.bookingDate || booking.createdAt,
                status: booking.status || 'confirmed',
                listingId: booking.listingId,
                mainImage: (() => {
                  const image = booking.mainImage || booking.listingInfo?.mainImage;
                  // Extract URI if it's an object, otherwise use as string
                  if (image && typeof image === 'object' && image.uri) {
                    return image.uri;
                  }
                  return image;
                })(),
                // Time information
                startTime: booking.time?.startTime ? formatTimeDisplay(booking.time.startTime) : '',
                endTime: booking.time?.endTime ? formatTimeDisplay(booking.time.endTime) : '',
                duration: booking.time?.duration || '',
                formattedDate: booking.date?.formattedDate || bookingDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              });
            }
          }
          
          // Sort by booking date (newest first)
          bookingsArray.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
          
          // Extract unique listing IDs and fetch their images
          const uniqueListingIds = [...new Set(bookingsArray.map(b => b.listingId).filter(Boolean))] as string[];
          if (uniqueListingIds.length > 0) {
            console.log('Fetching images for listing IDs:', uniqueListingIds);
            fetchListingImages(uniqueListingIds).then(images => {
              console.log('Fetched listing images:', images);
              setListingImages(images);
            });
          }
          
          setBookings(bookingsArray);
        } else {
          setBookings([]);
        }
      } catch (error) {
        console.log('Error processing bookings data:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      off(userBookingsRef);
      unsubscribe();
    };
  }, []);

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        // Force refresh by re-fetching data
        const userBookingsRef = ref(rtdb, `users/${uid}/bookings`);
        get(userBookingsRef).then((snapshot) => {
          if (snapshot.exists()) {
            const bookingsData = snapshot.val();
            const bookingsArray: Booking[] = [];
            
            for (const bookingId in bookingsData) {
              const booking = bookingsData[bookingId];
              const bookingDate = new Date(booking.bookingDate || booking.createdAt);
              
              // Only include bookings that are paid and have successful payment status
              if (booking.isPaid && booking.paymentStatus === 'completed') {
                bookingsArray.push({
                  id: bookingId,
                  dates: bookingDate.getDate().toString(),
                  month: bookingDate.toLocaleDateString('en-US', { month: 'short' }),
                  year: bookingDate.getFullYear().toString(),
                  backyardName: booking.listingInfo?.title || 'Backyard',
                  location: booking.listingInfo?.location || 'Location',
                  isPaid: booking.isPaid || false,
                  rating: booking.rating || null,
                  review: booking.review || null,
                  bookingDate: booking.bookingDate || booking.createdAt,
                  status: booking.status || 'confirmed',
                  listingId: booking.listingId,
                  mainImage: (() => {
                    const image = booking.mainImage || booking.listingInfo?.mainImage;
                    // Extract URI if it's an object, otherwise use as string
                    if (image && typeof image === 'object' && image.uri) {
                      return image.uri;
                    }
                    return image;
                  })(),
                  // Time information
                  startTime: booking.time?.startTime ? formatTimeDisplay(booking.time.startTime) : '',
                  endTime: booking.time?.endTime ? formatTimeDisplay(booking.time.endTime) : '',
                  duration: booking.time?.duration || '',
                  formattedDate: booking.date?.formattedDate || bookingDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                });
              }
            }
            
            // Sort by booking date (newest first)
            bookingsArray.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
            setBookings(bookingsArray);
          }
        }).catch((error) => {
          console.log('Error refreshing bookings:', error);
        });
      }
    }, [])
  );

  const handleFilterPress = (filter: FilterType) => {
    setActiveFilter(filter);
    // Here you would typically filter the bookings based on the selected filter
    // For now, we'll just keep all bookings displayed
  };

  const handleBookingPress = (id: string) => {
    console.log('Booking pressed from parent component:', id);
    // This is just a passthrough handler to verify the click is registered
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      <View style={{ paddingTop: 26 }} />
      <Header
        customLeftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Image
              source={Icons.back}
              style={{
                height: 50,
                width: 50,
                zIndex: 999,
              }}
            /></TouchableOpacity>
        }
        customCenterComponent={
          <Text style={styles.headerTitle}>My Bookings</Text>
        }
        customRightComponent={
          <TouchableOpacity onPress={() => router.push('/(main-app)/notification-centre')}>
            <Image
              source={require('../../../assets/icons/icBELL.png')}
              style={styles.headerBellIcon}
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.contentContainer}>

        {/* Filter buttons */}


        {bookings.length > 0 ? (
          <ScrollView
            style={styles.bookingList}
            showsVerticalScrollIndicator={false}
          >
            {bookings.map(booking => (
              <BookingItem
                key={booking.id}
                id={booking.id}
                dates={booking.dates}
                month={booking.month}
                year={booking.year}
                backyardName={booking.backyardName}
                location={booking.location}
                isPaid={booking.isPaid}
                rating={booking.rating}
                review={booking.review}
                startTime={booking.startTime}
                endTime={booking.endTime}
                duration={booking.duration}
                formattedDate={booking.formattedDate}
                listingId={booking.listingId}
                mainImage={
                  (() => {
                    const image = booking.mainImage || (booking.listingId ? listingImages[booking.listingId] : undefined);
                    // Ensure we return a string URL, not an object
                    if (typeof image === 'string') {
                      return image;
                    } else if (image && typeof image === 'object' && (image as any).uri) {
                      return (image as any).uri;
                    }
                    return undefined;
                  })()
                }
                onPress={() => handleBookingPress(booking.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={60}
              color="rgba(255, 255, 255, 0.5)"
            />
            <Text style={styles.emptyText}>
              You have no bookings yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({


  headerBellIcon: {
    width: 53,
    height: 53,
    resizeMode: 'contain',
  },
  container: {

    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  bookingList: {
    flex: 1,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontFamily: 'Urbanist',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterButtonText: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: '#FFFFFF',
  },
  activeFilterButton: {
    backgroundColor: '#00C853',
  },
}); 