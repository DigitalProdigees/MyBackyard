import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { FeedbackDialog } from '@/app/components';

interface BookingItemProps {
  id: string;
  dates: string;
  month: string;
  year: string;
  backyardName: string;
  location: string;
  isPaid: boolean;
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
}: BookingItemProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  const handlePress = () => {
    console.log('BookingItem pressed - opening feedback dialog');
    setShowFeedbackDialog(true);
  };

  const handleViewDetails = (e: any) => {
    // Prevent the event from bubbling up to the parent
    e.stopPropagation();
    // Navigate to booking details
    router.push(`/(main-app)/booking-details?id=${id}`);
  };

  const handleFeedbackSubmit = (rating: number, feedback: string) => {
    console.log(`Booking ID: ${id}, Rating: ${rating}, Feedback: ${feedback}`);
    // Here you would typically send the feedback to your backend
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Calendar icon */}
        <View style={{
          flexDirection: 'row', padding: 16,
          borderRadius: 20,
          backgroundColor: '#00000033',
          overflow: 'hidden',
        }}>
          <View style={styles.infoContainer}>
            <View style={styles.dateContainer}>
              <Text style={styles.dates}>{dates}</Text>
              <Text style={styles.monthYear}>{month} {year}</Text>
            </View>

            <View style={styles.locationContainer}>
              <Text style={styles.backyardName}>{backyardName}</Text>
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>

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
        </View>
      </TouchableOpacity>
      {/* Feedback Dialog */}
      <FeedbackDialog
        visible={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        onSubmit={handleFeedbackSubmit}
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
  calendarIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',


  },
  icon: {
    width: 24,
    height: 24,
  },
  infoContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  dateContainer: {
    marginBottom: 8,
    marginTop: 10
  },
  dates: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  monthYear: {
    fontFamily: 'Urbanist',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  locationContainer: {
    marginBottom: 10,
    marginTop: 10
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
  statusContainer: {
    paddingHorizontal: 16,
    marginTop: 10
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
}); 