import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../../components/GradientBackground';
import { Header } from '../../../components/Header';
import { Icons } from '../../../../constants/icons';
import { StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get, onValue, off } from 'firebase/database';

const { width, height } = Dimensions.get('window');

interface Order {
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
  // Time information
  startTime?: string;
  endTime?: string;
  duration?: string;
  formattedDate?: string;
  // Renter information
  renterName?: string;
  renterEmail?: string;
  renterId?: string;
  fullName?: string;
  guests?: number;
  amount?: number;
  currency?: string;
  // Listing information
  listingId?: string;
}

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to format time display
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Fetch orders from Firebase using real-time listener
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for owner's bookings
    const ownerBookingsRef = ref(rtdb, `users/${uid}/ownerBookings`);
    const unsubscribe = onValue(ownerBookingsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          const ordersArray: Order[] = [];
          
          for (const orderId in ordersData) {
            const order = ordersData[orderId];
            const bookingDate = new Date(order.bookingDate || order.createdAt);
            
            // Only include orders that are paid and have successful payment status
            if (order.isPaid && order.paymentStatus === 'completed') {
              ordersArray.push({
                id: order.id || orderId,
                dates: order.dates || bookingDate.toLocaleDateString('en-US', { day: 'numeric' }),
                month: order.month || bookingDate.toLocaleDateString('en-US', { month: 'long' }),
                year: order.year || bookingDate.toLocaleDateString('en-US', { year: 'numeric' }),
                backyardName: order.backyardName || order.listingInfo?.title || 'Backyard',
                location: order.location || order.listingInfo?.location || 'Location',
                isPaid: order.isPaid || false,
                rating: order.rating || null,
                review: order.review || null,
                bookingDate: order.bookingDate || order.createdAt,
                status: order.status || 'confirmed',
                // Time information
                startTime: order.time?.startTime ? formatTimeDisplay(order.time.startTime) : '',
                endTime: order.time?.endTime ? formatTimeDisplay(order.time.endTime) : '',
                duration: order.time?.duration || '',
                formattedDate: order.date?.formattedDate || bookingDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                // Renter information
                renterName: order.fullName || order.renterName || 'Guest',
                renterEmail: order.renterEmail || '',
                renterId: order.renterId || '',
                fullName: order.fullName || order.renterName || 'Guest',
                guests: order.guests || 1,
                amount: order.amount || 0,
                currency: order.currency || 'USD',
                // Listing information
                listingId: order.listingId || ''
              });
            }
          }
          
          // Sort by booking date (newest first)
          ordersArray.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
          setOrders(ordersArray);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.log('Error processing orders data:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      off(ownerBookingsRef);
      unsubscribe();
    };
  }, []);

  // Refresh orders when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        // Force refresh by re-fetching data
        const ownerBookingsRef = ref(rtdb, `users/${uid}/ownerBookings`);
        get(ownerBookingsRef).then((snapshot) => {
          if (snapshot.exists()) {
            const ordersData = snapshot.val();
            const ordersArray: Order[] = [];
            
            for (const orderId in ordersData) {
              const order = ordersData[orderId];
              const bookingDate = new Date(order.bookingDate || order.createdAt);
              
              // Only include orders that are paid and have successful payment status
              if (order.isPaid && order.paymentStatus === 'completed') {
                ordersArray.push({
                  id: orderId,
                  dates: bookingDate.getDate().toString(),
                  month: bookingDate.toLocaleDateString('en-US', { month: 'short' }),
                  year: bookingDate.getFullYear().toString(),
                  backyardName: order.listingInfo?.title || 'Backyard',
                  location: order.listingInfo?.location || 'Location',
                  isPaid: order.isPaid || false,
                  rating: order.rating || null,
                  review: order.review || null,
                  bookingDate: order.bookingDate || order.createdAt,
                  status: order.status || 'confirmed',
                  // Time information
                  startTime: order.time?.startTime ? formatTimeDisplay(order.time.startTime) : '',
                  endTime: order.time?.endTime ? formatTimeDisplay(order.time.endTime) : '',
                  duration: order.time?.duration || '',
                  formattedDate: order.date?.formattedDate || bookingDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }),
                  // Renter information
                  renterName: order.fullName || order.renterName || 'Guest',
                  renterEmail: order.renterEmail || '',
                  renterId: order.renterId || '',
                  fullName: order.fullName || order.renterName || 'Guest',
                  guests: order.guests || 1,
                  amount: order.amount || 0,
                  currency: order.currency || 'USD',
                  // Listing information
                  listingId: order.listingId || ''
                });
              }
            }
            
            // Sort by booking date (newest first)
            ordersArray.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
            setOrders(ordersArray);
          }
        }).catch((error) => {
          console.log('Error refreshing orders:', error);
        });
      }
    }, [])
  );

  const handleOrderPress = (order: Order) => {
    console.log('Order pressed:', order.id);
    console.log('Navigating to chat with renter:', order.renterName, 'ID:', order.renterId);
    
    // Navigate to chat screen with the renter who made this booking
    router.push({
      pathname: '/(owner-app)/(main-app)/chat',
      params: {
        renterId: order.renterId || order.id, // Use renterId if available, fallback to order id
        contactName: order.renterName || 'Guest',
        listingId: order.listingId || '', // Add listingId if available
        contactAvatar: '', // Avatar can be added later if needed
      }
    });
  };

  const renderOrderItem = (order: Order) => (
    <View key={order.id} style={styles.orderItem}>
      <View style={styles.orderContent}>
        <View style={styles.orderInfo}>
          <View style={styles.orderHeader}>
            <Text style={styles.backyardName}>Back Yard : {order.backyardName}</Text>
            <View style={styles.statusContainer}>
              {order.isPaid ? (
                <View style={styles.paidButton}>
                  <Text style={styles.paidText}>Paid</Text>
                </View>
              ) : (
                <View style={styles.pendingButton}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.locationContainer}>
            <Text style={styles.location}>{order.location}</Text>
          </View>

          {/* Renter Information */}
          <View style={styles.renterInfo}>
            <Text style={styles.renterLabel}>Rented by:</Text>
            <Text style={styles.renterName}>{order.renterName}</Text>
            {order.guests && order.guests > 1 && (
              <Text style={styles.guestsInfo}>({order.guests} guests)</Text>
            )}
          </View>

          {/* Date and Time information */}
          <View style={styles.dateTimeContainer}>
            {/* Formatted Date */}
            {order.formattedDate && (
              <View style={styles.dateRow}>
                <Image source={require('../../../../assets/icons/calendar.png')} style={styles.dateIcon} />
                <Text style={styles.dateText}>{order.formattedDate}</Text>
              </View>
            )}
            
            {/* Time information */}
            {(order.startTime || order.endTime) && (
              <View style={styles.timeRow}>
                <Image source={require('../../../../assets/icons/clock.png')} style={styles.timeIcon} />
                <Text style={styles.timeText}>
                  {order.startTime && order.endTime ? `${order.startTime} - ${order.endTime}` : order.startTime || order.endTime}
                  {order.duration && ` (${order.duration} hours)`}
                </Text>
              </View>
            )}
          </View>

          {/* Payment Information */}
          {order.amount && (
            <View style={styles.paymentInfo}>
              <Text style={styles.amountText}>
                ${order.amount.toFixed(2)} {order.currency}
              </Text>
            </View>
          )}

          {/* Chat indicator - Clickable section */}
          <TouchableOpacity 
            style={styles.chatIndicator}
            onPress={() => handleOrderPress(order)}
            activeOpacity={0.7}
          >
            <Image 
              source={require('../../../../assets/icons/icCHAT.png')} 
              style={styles.chatIcon} 
            />
            <Text style={styles.chatText}>Tap to chat with renter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
            />
          </TouchableOpacity>
        }
        customCenterComponent={
          <Text style={styles.headerTitle}>My Orders</Text>
        }
        customRightComponent={
          <TouchableOpacity onPress={() => router.push('/(owner-app)/(main-app)/notification-centre')}>
            <Image
              source={require('../../../../assets/icons/icBELL.png')}
              style={styles.headerBellIcon}
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.contentContainer}>
        {orders.length > 0 ? (
          <ScrollView
            style={styles.ordersList}
            showsVerticalScrollIndicator={false}
          >
            {orders.map(renderOrderItem)}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Image
              source={Icons.notification}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>
              You have no orders yet
            </Text>
            <Text style={styles.emptySubText}>
              When renters book your backyards, they will appear here
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
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
    marginTop: 16,
  },
  orderItem: {
    marginBottom: 20,
  },
  orderContent: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#00000033',
    overflow: 'hidden',
  },
  orderInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  backyardName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  statusContainer: {
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
  locationContainer: {
    marginBottom: 10,
  },
  location: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  renterInfo: {
    marginBottom: 10,
  },
  renterLabel: {
    fontFamily: 'Urbanist',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  renterName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#A6E66E',
  },
  guestsInfo: {
    fontFamily: 'Urbanist',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  dateTimeContainer: {
    marginTop: 8,
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
  paymentInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  amountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: 'rgb(26, 250, 48)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: 'Urbanist',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(166, 230, 110, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(166, 230, 110, 0.3)',
  },
  chatIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#FFFFFF',
  },
  chatText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
