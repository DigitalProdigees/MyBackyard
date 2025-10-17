import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { BookingItem } from './components/BookingItem';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground, Header } from '@/app/components';
import { Icons } from '@/constants/icons';



type FilterType = 'all' | 'upcoming' | 'past';
const { width, height } = Dimensions.get('window');

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
              source={require('../../../../assets/icons/icBELL.png')}
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