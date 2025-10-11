import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { StyleSheet } from 'react-native';
import { GradientBackground, GradientButton, Header } from '@/app/components';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/app/lib/hooks/useAuth';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get } from 'firebase/database';
const { width, height } = Dimensions.get('window');

export default function BookingDetails() {
  const { user } = useAuth();
  
  // Sample booking data
  const [fullName, setFullName] = useState('');
  const [guests, setGuests] = useState('1');
  const [hours, setHours] = useState('5');

  // Fetch fullName from Firebase
  React.useEffect(() => {
    const fetchUserName = async () => {
      if (auth.currentUser?.uid) {
        try {
          const userRef = ref(rtdb, `users/${auth.currentUser.uid}/fullName`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userName = snapshot.val();
            console.log('✅ Got name from Firebase:', userName);
            setFullName(userName);
          } else {
            console.log('❌ No fullName found in Firebase for user:', auth.currentUser.uid);
          }
        } catch (error) {
          console.error('Error fetching user name from Firebase:', error);
        }
      }
    };
    
    fetchUserName();
  }, []);

  // Pricing details
  const hourlyRate = 100;
  const totalHours = parseInt(hours) || 0;
  const subtotal = totalHours * hourlyRate;
  const appFee = 9.5;
  const taxes = 33.5;
  const total = subtotal + appFee + taxes;

  const handlePayNow = () => {
    console.log('Payment processed');
    // Navigate to payment processing screen
    router.push('/(main-app)/payment-processing');
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
          <Text style={styles.headerTitle}>Booking Details</Text>
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

      <View style={styles.scrollView} >
        {/* Guest Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Image source={Icons.icU} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.rowContainer}>
            <View style={styles.halfContainer}>
              <Text style={styles.sectionLabel}>No. of Guests</Text>
              <View style={styles.inputContainer}>
                <Image source={Icons.icU} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={guests}
                  onChangeText={setGuests}
                  placeholder="Number of guests"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              </View>
            </View>

            <View style={styles.halfContainer}>
              <Text style={styles.sectionLabel}>Total Hours</Text>
              <View style={styles.inputContainer}>
                <Image source={Icons.ictime} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={hours}
                  onChangeText={setHours}
                  placeholder="5"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View></View>
      {/* Pricing Details Section */}
      <View style={{
        flex: 1, justifyContent: 'flex-end'
      }}>
        <View style={styles.pricingSection}>
          <Text style={styles.pricingSectionTitle}>Booking Details</Text>

          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Price</Text>
            <Text style={styles.pricingValue}>${total.toFixed(0)}</Text>
          </View>

          <View style={styles.pricingDetail}>
            <Text style={styles.pricingDetailText}>
              {totalHours} Hours - ${hourlyRate}/hour
            </Text>
          </View>

          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Fee</Text>
            <Text style={styles.pricingValue}>${appFee.toFixed(1)}</Text>
          </View>

          <View style={styles.pricingDetail}>
            <Text style={styles.pricingDetailText}>App Admin</Text>
          </View>

          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Taxes</Text>
            <Text style={styles.pricingValue}>${taxes.toFixed(1)}</Text>
          </View>

          <View style={styles.pricingDetail}>
            <Text style={styles.pricingDetailText}>USA Taxes</Text>


            {/* Space for the booking button */}
            <View style={styles.buttonSpacer} />


            {/* Payment Button */}
            <View style={styles.buttonContainer}>
              <GradientButton
                text="Pay Now"
                onPress={handlePayNow}
                containerStyle={styles.paymentButton}
              />
            </View></View>
        </View></View>
    </View>
  );
} const
  styles = StyleSheet.create({
    headerBellIcon: {
      width: 53,
      height: 53,
      resizeMode: 'contain',
    },
    container: {
      flex: 1,

    },
    headerTitle: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    section: {
      marginTop: 20,
    },
    sectionLabel: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2A3062',
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      marginBottom: 16,
    },
    inputIcon: {
      width: 20,
      height: 20,
      marginRight: 12,
      resizeMode: 'contain',
    },
    input: {
      flex: 1,
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    rowContainer: {
      flexDirection: 'row',
      marginTop: 30,
      justifyContent: 'space-between',
    },
    halfContainer: {
      width: '48%',
    },
    pricingSection: {

      marginTop: 30,
      backgroundColor: '#00000033',
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 20
    },
    pricingSectionTitle: {
      color: 'white',
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
    },
    pricingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    pricingLabel: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    pricingValue: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
    },
    pricingDetail: {
      marginBottom: 16,
    },
    pricingDetailText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '400',
      opacity: 0.8,
    },
    buttonSpacer: {
      height: 80,
    },
    buttonContainer: {
      marginBottom: 20
    },
    paymentButton: {
      width: '100%',
    }
  }); 