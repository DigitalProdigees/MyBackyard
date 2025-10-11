import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Dimensions, Modal, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Header } from '../../components/Header';
import GradientButton from '../../components/buttons/GradientButton';
import { Icons } from '../../../constants/icons';
import { StyleSheet } from 'react-native';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get, set, push } from 'firebase/database';
import { useAuth } from '@/app/lib/hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
const { width, height } = Dimensions.get('window');

interface TimePickerModalProps {
  visible: boolean;
  time: string;
  title: string;
  onClose: () => void;
  onSave: (time: string) => void;
  minTime?: string;
  maxTime?: string;
}

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSave: (date: Date) => void;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  time,
  title,
  onClose,
  onSave,
  minTime,
  maxTime,
}) => {
  const [tempTime, setTempTime] = useState(time);
  const [showPicker, setShowPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTempTime(time);
      // Small delay to prevent flash
      setTimeout(() => setShowPicker(true), 50);
    } else {
      setShowPicker(false);
    }
  }, [visible]);

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    if (selectedTime) {
      // Round to nearest hour (set minutes to 00)
      const hour = selectedTime.getHours();
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      
      // Only update if the time has actually changed
      if (timeString !== tempTime) {
        setTempTime(timeString);
      }
    }
  };

  const handleSave = () => {
    onSave(tempTime);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.timePickerModalOverlay}>
      <View style={styles.timePickerModalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.timePickerWrapper}>
          {showPicker && (
            <DateTimePicker
              value={tempTime ? new Date(`2000-01-01T${tempTime}`) : new Date()}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              onChange={handleTimeChange}
              textColor="#FFFFFF"
              accentColor="#A6E66E"
              themeVariant="dark"
              style={{ opacity: 1 }}
            />
          )}
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  date,
  onClose,
  onSave,
}) => {
  const [tempDate, setTempDate] = useState(date);

  React.useEffect(() => {
    if (visible) {
      setTempDate(date);
    }
  }, [visible]);

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (selectedDate && selectedDate.getTime() !== tempDate.getTime()) {
      setTempDate(selectedDate);
    }
  };

  const handleSave = () => {
    onSave(tempDate);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.datePickerModalOverlay}>
      <View style={styles.datePickerModalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Date</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.datePickerWrapper}>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
            textColor="#FFFFFF"
            accentColor="#A6E66E"
            themeVariant="dark"
          />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function BookingDetails() {
  const params = useLocalSearchParams();
  const listingId = params.listingId as string;
  const { user } = useAuth();
  
  console.log('Booking details - received params:', {
    listingId,
    allParams: params
  });
  
  // Sample booking data
  const [fullName, setFullName] = useState('');
  const [guests, setGuests] = useState('1');
  const [hours, setHours] = useState('5');
  const [listing, setListing] = useState<any>(null);
  
  // Date and time selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  
  // Time validation states
  const [timeError, setTimeError] = useState('');
  const [isTimeValid, setIsTimeValid] = useState(true);
  
  // Date validation states
  const [dateError, setDateError] = useState('');
  const [isDateValid, setIsDateValid] = useState(true);
  
  // Available slots states
  const [availableSlots, setAvailableSlots] = useState<Array<{start: string, end: string}>>([]);
  const [showAvailableSlots, setShowAvailableSlots] = useState(false);
  const [hasEncounteredConflict, setHasEncounteredConflict] = useState(false);
  
  // ScrollView ref for auto-scroll
  const scrollViewRef = React.useRef<ScrollView>(null);

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

  // Get listing details
  React.useEffect(() => {
    const fetchListing = async () => {
      if (listingId) {
        try {
          const listingRef = ref(rtdb, `listings/${listingId}`);
          const snapshot = await get(listingRef);
          if (snapshot.exists()) {
            const listingData = snapshot.val();
            console.log('📋 Listing data loaded:', listingData);
            console.log('📅 Available days from listing:', listingData?.availableWeekdays);
            setListing(listingData);
          }
        } catch (error) {
          console.error('Error fetching listing:', error);
        }
      }
    };
    fetchListing();
  }, [listingId]);

  // Function to fetch existing bookings for conflict checking
  const fetchExistingBookings = async () => {
    try {
      if (!listingId) return [];
      
      // Check the main bookings collection where actual bookings are stored
      const bookingsRef = ref(rtdb, 'bookings');
      const snapshot = await get(bookingsRef);
      
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        const allBookings = Object.values(bookingsData);
        
        // Filter bookings for this specific listing
        const listingBookings = allBookings.filter((booking: any) => 
          booking.listingId === listingId
        );
        
        console.log('📚 Existing bookings found for listing:', listingBookings);
        return listingBookings;
      }
      return [];
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      return [];
    }
  };

  // Function to calculate available time slots
  const calculateAvailableSlots = (ownerStartTime: string, ownerEndTime: string, existingBookings: any[], selectedDate: Date) => {
    if (!ownerStartTime || !ownerEndTime) return [];

    const ownerStart = parseInt(ownerStartTime.split(':')[0]);
    const ownerEnd = parseInt(ownerEndTime.split(':')[0]);
    const selectedDateString = selectedDate.toDateString();

    // Get all booked time slots for the selected date
    const bookedSlots: Array<{start: number, end: number}> = [];
    
    for (const booking of existingBookings) {
      const bookingDate = new Date(booking.date?.selectedDate);
      if (bookingDate.toDateString() !== selectedDateString) continue;
      
      if (booking.time?.startTime && booking.time?.endTime) {
        const bookingStart = parseInt(booking.time.startTime.split(':')[0]);
        const bookingEnd = parseInt(booking.time.endTime.split(':')[0]);
        bookedSlots.push({ start: bookingStart, end: bookingEnd });
      }
    }

    // Sort booked slots by start time
    bookedSlots.sort((a, b) => a.start - b.start);

    // Calculate available slots
    const availableSlots: Array<{start: number, end: number}> = [];
    let currentStart = ownerStart;

    for (const bookedSlot of bookedSlots) {
      // If there's a gap before the booked slot
      if (currentStart < bookedSlot.start) {
        availableSlots.push({ start: currentStart, end: bookedSlot.start });
      }
      // Move current start to after the booked slot
      currentStart = Math.max(currentStart, bookedSlot.end);
    }

    // If there's time left after all booked slots
    if (currentStart < ownerEnd) {
      availableSlots.push({ start: currentStart, end: ownerEnd });
    }

    // Convert to 12-hour format strings
    const formatTo12Hour = (hour: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:00 ${ampm}`;
    };

    return availableSlots.map(slot => ({
      start: formatTo12Hour(slot.start),
      end: formatTo12Hour(slot.end)
    }));
  };

  // Function to check for time conflicts
  const checkTimeConflict = (userStartTime: string, userEndTime: string, selectedDate: Date, existingBookings: any[]) => {
    if (!userStartTime || !userEndTime) return { hasConflict: false, conflictMessage: '' };

    const userStart = parseInt(userStartTime.split(':')[0]);
    const userEnd = parseInt(userEndTime.split(':')[0]);
    const selectedDateString = selectedDate.toDateString();

    console.log('🔍 Checking time conflicts:', {
      userStart,
      userEnd,
      selectedDateString,
      existingBookingsCount: existingBookings.length
    });

    for (const booking of existingBookings) {
      console.log('🔍 Checking booking:', {
        bookingId: booking.id,
        listingId: booking.listingId,
        date: booking.date,
        time: booking.time,
        fullBooking: booking
      });

      // Check if it's the same date - handle multiple date formats
      let bookingDate;
      if (booking.date?.selectedDate) {
        bookingDate = new Date(booking.date.selectedDate);
      } else if (booking.selectedDate) {
        bookingDate = new Date(booking.selectedDate);
      } else if (booking.bookingDate) {
        bookingDate = new Date(booking.bookingDate);
      } else {
        console.log('⏭️ No date info, skipping');
        continue;
      }

      console.log('📅 Date comparison:', {
        bookingDateString: bookingDate.toDateString(),
        selectedDateString,
        isSameDate: bookingDate.toDateString() === selectedDateString,
        bookingDateValue: bookingDate,
        isValidDate: !isNaN(bookingDate.getTime())
      });
      
      if (isNaN(bookingDate.getTime()) || bookingDate.toDateString() !== selectedDateString) {
        console.log('⏭️ Different date or invalid date, skipping');
        continue; // Different date, no conflict
      }

      // Check if booking has time information - handle multiple time formats
      let existingStart, existingEnd;
      if (booking.time?.startTime && booking.time?.endTime) {
        existingStart = parseInt(booking.time.startTime.split(':')[0]);
        existingEnd = parseInt(booking.time.endTime.split(':')[0]);
      } else if (booking.startTime && booking.endTime) {
        existingStart = parseInt(booking.startTime.split(':')[0]);
        existingEnd = parseInt(booking.endTime.split(':')[0]);
      } else {
        console.log('⏭️ No time info, skipping');
        continue; // No time info, skip
      }

      console.log('🕐 Comparing with existing booking:', {
        existingStart,
        existingEnd,
        userStart,
        userEnd,
        existingTimeString: `${booking.time.startTime} - ${booking.time.endTime}`,
        userTimeString: `${userStartTime} - ${userEndTime}`
      });

      // Check for overlap
      // Two time ranges overlap if: start1 < end2 AND start2 < end1
      const hasOverlap = userStart < existingEnd && existingStart < userEnd;
      console.log('🔍 Overlap check:', {
        condition1: `${userStart} < ${existingEnd} = ${userStart < existingEnd}`,
        condition2: `${existingStart} < ${userEnd} = ${existingStart < userEnd}`,
        hasOverlap
      });

      if (hasOverlap) {
        const conflictMessage = `Time slot not available. This slot conflicts with an existing booking`;
        console.log('❌ Time conflict detected:', conflictMessage);
        return { hasConflict: true, conflictMessage };
      }
    }

    console.log('✅ No time conflicts found');
    return { hasConflict: false, conflictMessage: '' };
  };

  // Helper functions
  const formatTimeDisplay = (time: string) => {
    if (!time) return 'Select Time';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startHour] = start.split(':').map(Number);
    const [endHour] = end.split(':').map(Number);
    return endHour - startHour;
  };

  const isTimeInRange = (time: string, minTime: string, maxTime: string) => {
    if (!time || !minTime || !maxTime) return true;
    const [timeHour] = time.split(':').map(Number);
    const [minHour] = minTime.split(':').map(Number);
    const [maxHour] = maxTime.split(':').map(Number);
    return timeHour >= minHour && timeHour <= maxHour;
  };

  // Time validation function with conflict checking
  const validateTimeSelection = async (userStartTime: string, userEndTime: string) => {
    // First check if both times are selected
    if (!userStartTime || !userEndTime) {
      return { isValid: false, error: 'Please select both start and end times.' };
    }

    // Check if end time is before start time (invalid time range)
    const userStart = parseInt(userStartTime.split(':')[0]);
    const userEnd = parseInt(userEndTime.split(':')[0]);
    
    if (userEnd <= userStart) {
      return { isValid: false, error: 'End time must be after start time.' };
    }

    if (!listing?.availableTimes?.startTime || !listing?.availableTimes?.endTime) {
      return { isValid: true, error: '' };
    }

    const ownerStartTime = listing.availableTimes.startTime;
    const ownerEndTime = listing.availableTimes.endTime;
    
    // Convert times to 24-hour format for comparison
    const ownerStart = parseInt(ownerStartTime.split(':')[0]);
    const ownerEnd = parseInt(ownerEndTime.split(':')[0]);

    // Check if user's time range is COMPLETELY within owner's available time
    // User start time must be >= owner start time AND user end time must be <= owner end time
    const isCompletelyWithin = userStart >= ownerStart && userEnd <= ownerEnd;

    if (!isCompletelyWithin) {
      const ownerStartFormatted = formatTimeDisplay(ownerStartTime);
      const ownerEndFormatted = formatTimeDisplay(ownerEndTime);
      return {
        isValid: false,
        error: `Time slot not available. Owner's available time is ${ownerStartFormatted} to ${ownerEndFormatted}.`
      };
    }

    // Check for conflicts with existing bookings
    const existingBookings = await fetchExistingBookings();
    const conflictCheck = checkTimeConflict(userStartTime, userEndTime, selectedDate, existingBookings);
    
    if (conflictCheck.hasConflict) {
      // User encountered a conflict - show available slots and keep them visible
      setHasEncounteredConflict(true);
      const slots = calculateAvailableSlots(ownerStartTime, ownerEndTime, existingBookings, selectedDate);
      setAvailableSlots(slots);
      // Only show available slots if the date is valid
      setShowAvailableSlots(isDateValid);
      
      // Auto-scroll to available slots card after a short delay
      if (isDateValid) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
      
      return { isValid: false, error: conflictCheck.conflictMessage };
    } else if (hasEncounteredConflict) {
      // User has encountered conflict before, keep showing available slots
      const slots = calculateAvailableSlots(ownerStartTime, ownerEndTime, existingBookings, selectedDate);
      setAvailableSlots(slots);
      // Only show available slots if the date is valid
      setShowAvailableSlots(isDateValid);
    }

    return { isValid: true, error: '' };
  };

  // Function to convert full day names to abbreviated format
  const formatWeekdaysToAbbrev = (weekdays: string[]) => {
    const dayMapping: { [key: string]: string } = {
      'Monday': 'Mon',
      'Tuesday': 'Tue', 
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    
    return weekdays.map(day => dayMapping[day] || day);
  };

  // Date validation function
  const validateDateSelection = (selectedDate: Date) => {
    console.log('🔍 Starting date validation for:', selectedDate.toDateString());
    
    if (!listing) {
      console.log('❌ No listing data available, returning invalid');
      return { isValid: false, error: 'Listing data not available. Please try again.' };
    }
    
    if (!listing.availableWeekdays || !Array.isArray(listing.availableWeekdays)) {
      console.log('❌ No availableWeekdays or not an array, returning invalid');
      return { isValid: false, error: 'Available days not configured for this listing.' };
    }

    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = selectedDate.getDay();
    // Array must match JavaScript getDay() indices: 0=Sunday, 1=Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[dayOfWeek];

    console.log('📅 Day validation:', {
      selectedDate: selectedDate.toDateString(),
      dayOfWeek,
      selectedDayName,
      availableWeekdays: listing.availableWeekdays,
      includes: listing.availableWeekdays.includes(selectedDayName)
    });

    // Check if the selected day is in owner's available days
    const isDayAvailable = listing.availableWeekdays.includes(selectedDayName);

    if (!isDayAvailable) {
      console.log('❌ Day not available, returning invalid');
      const abbreviatedDays = formatWeekdaysToAbbrev(listing.availableWeekdays);
      return {
        isValid: false,
        error: `Day slot not available. Owner's available days are: ${abbreviatedDays.join(', ')}.`
      };
    }

    console.log('✅ Day is available, returning valid');
    return { isValid: true, error: '' };
  };

  // Date picker handlers
  const handleDateSave = (date: Date) => {
    setSelectedDate(date);
    
    // Validate the selected date
    const validation = validateDateSelection(date);
    setIsDateValid(validation.isValid);
    setDateError(validation.error);
    
    setShowDatePicker(false);
  };

  // Time picker handlers
  const handleOpenTimePicker = (type: 'start' | 'end') => {
    setTimePickerType(type);
    setShowTimePicker(true);
  };

  const handleTimeSave = async (time: string) => {
    if (timePickerType === 'start') {
      setStartTime(time);
      // Clear end time if it's before start time
      if (endTime && time >= endTime) {
        setEndTime('');
      }
    } else {
      setEndTime(time);
    }
    
    // Validate time selection when both times are selected
    if (timePickerType === 'end' && time && startTime) {
      const validation = await validateTimeSelection(startTime, time);
      setIsTimeValid(validation.isValid);
      setTimeError(validation.error);
    } else if (timePickerType === 'start' && time && endTime) {
      const validation = await validateTimeSelection(time, endTime);
      setIsTimeValid(validation.isValid);
      setTimeError(validation.error);
    } else {
      // Clear error if only one time is selected
      setTimeError('');
      setIsTimeValid(true);
    }
    
    setShowTimePicker(false);
  };

  // Auto-calculate hours when times change
  React.useEffect(() => {
    if (startTime && endTime) {
      const calculatedHours = calculateHours(startTime, endTime);
      if (calculatedHours > 0) {
        setHours(calculatedHours.toString());
      }
    }
  }, [startTime, endTime]);

  // Validate time selection whenever times change
  React.useEffect(() => {
    const validateTime = async () => {
      if (startTime && endTime) {
        const validation = await validateTimeSelection(startTime, endTime);
        setIsTimeValid(validation.isValid);
        setTimeError(validation.error);
      } else {
        setTimeError('');
        setIsTimeValid(true);
      }
    };
    
    validateTime();
  }, [startTime, endTime, listing, selectedDate]);

  // Reset conflict state when date changes
  React.useEffect(() => {
    // Reset conflict tracking when date changes
    setHasEncounteredConflict(false);
    setShowAvailableSlots(false);
    setAvailableSlots([]);
  }, [selectedDate]);

  // Validate date selection whenever date or listing changes
  React.useEffect(() => {
    console.log('🔄 Date validation useEffect triggered:', {
      selectedDate: selectedDate.toDateString(),
      listing: listing,
      hasListing: !!listing
    });
    const validation = validateDateSelection(selectedDate);
    console.log('📊 Date validation result:', validation);
    setIsDateValid(validation.isValid);
    setDateError(validation.error);
    
    // Hide available slots card if date becomes invalid
    if (!validation.isValid) {
      setShowAvailableSlots(false);
      setHasEncounteredConflict(false);
    }
  }, [selectedDate, listing]);

  // Pricing details
  const hourlyRate = listing?.pricePerHour || 100;
  const totalHours = parseInt(hours) || 0;
  const subtotal = totalHours * hourlyRate;
  const appFee = 9.5;
  const taxes = 33.5;
  const total = subtotal + appFee + taxes;


  const handlePayNow = async () => {
    console.log('Processing payment...');
    
    // Navigate to payment processing screen with booking data
    // The booking will be saved in the payment processing screen after successful payment
    router.push({
      pathname: '/(main-app)/payment-processing',
      params: {
        listingId: listingId,
        fullName: fullName,
        guests: guests,
        hours: hours,
        total: total.toString(),
        // Pass date and time information to payment processing
        selectedDate: selectedDate.toISOString(),
        startTime: startTime,
        endTime: endTime,
        // Pass owner information for payment processing
        ownerId: listing?.ownerId || '',
        ownerName: listing?.ownerName || 'Property Owner'
      }
    });
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
              source={require('../../../assets/icons/icBELL.png')}
              style={styles.headerBellIcon}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
       

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
                  placeholder="1"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.halfContainer}>
              <Text style={styles.sectionLabel}>Total Hours</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <Image source={Icons.ictime} style={styles.inputIcon} />
                <Text style={styles.disabledInputText}>{hours} hours</Text>
              </View>
            </View>
          </View>

          {/* Date Selection */}
          <Text style={styles.sectionLabel}>Select Date</Text>
          <TouchableOpacity 
            style={styles.inputContainer} 
            onPress={() => setShowDatePicker(true)}
          >
            <Image source={require('../../../assets/icons/calendar.png')} style={styles.inputIcon} />
            <Text style={styles.inputText} numberOfLines={1}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Image source={require('../../../assets/icons/down.png')} style={styles.dropdownArrow} />
          </TouchableOpacity>

          {/* Time Selection */}
          <Text style={styles.sectionLabel}>Select Time</Text>
          <View style={[styles.rowContainer, { marginTop: 0 }]}>
            <View style={styles.halfContainer}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => handleOpenTimePicker('start')}
              >
                <Image source={require('../../../assets/icons/clock.png')} style={styles.inputIcon} />
                <Text style={styles.inputText} numberOfLines={1}>
                  {formatTimeDisplay(startTime)}
                </Text>
                <Image source={require('../../../assets/icons/down.png')} style={styles.dropdownArrow} />
              </TouchableOpacity>
            </View>

            <View style={styles.halfContainer}>
              <Text style={styles.timeLabel}>End Time</Text>
              <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => handleOpenTimePicker('end')}
                disabled={!startTime}
              >
                <Image source={require('../../../assets/icons/clock.png')} style={styles.inputIcon} />
                <Text style={styles.inputText} numberOfLines={1}>
                  {formatTimeDisplay(endTime)}
                </Text>
                <Image source={require('../../../assets/icons/down.png')} style={styles.dropdownArrow} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Available Slots Card */}
          {showAvailableSlots && (
            <View style={styles.availableSlotsCard}>
              <View style={styles.availableSlotsHeader}>
                <Image source={require('../../../assets/icons/clock.png')} style={styles.availableSlotsIcon} />
                <Text style={styles.availableSlotsTitle}>Available Time Slots</Text>
              </View>
              <View style={styles.slotsContainer}>
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot, index) => (
                    <View key={index} style={styles.slotItem}>
                      <Text style={styles.slotText}>{slot.start} - {slot.end}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noSlotsContainer}>
                    <Text style={styles.noSlotsText}>No slots available for this date</Text>
                    <Text style={styles.noSlotsSubText}>Please try selecting a different date</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          
        </View>
      </ScrollView>
      {/* Pricing Details Section */}
      <View style={{
      }}>
        <View style={styles.pricingSection}>
          <Text style={styles.pricingSectionTitle}>Booking Details</Text>

          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Price</Text>
            <Text style={styles.pricingValue}>${subtotal.toFixed(0)}</Text>
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
          </View>

          <View style={[styles.pricingRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(0)}</Text>
          </View>


            {/* Space for the booking button */}
            <View style={styles.buttonSpacer} />


            {/* Payment Button */}
            <View style={styles.buttonContainer}>
              <GradientButton
                text={
                  !isDateValid ? dateError || "Day slot not available" :
                  !isTimeValid ? timeError || "Time slot not available" :
                  !startTime || !endTime ? "Select Time" :
                  "Pay Now"
                }
                onPress={handlePayNow}
                containerStyle={{
                  ...styles.paymentButton,
                  ...((!isDateValid || !isTimeValid || !startTime || !endTime) ? styles.disabledButton : {})
                }}
                disabled={!isDateValid || !isTimeValid || !startTime || !endTime}
              />
            </View>
        </View>
      </View>

      {/* Date Picker Modal */}
        {showDatePicker && (
          <DatePickerModal
            visible={showDatePicker}
            date={selectedDate}
            onClose={() => setShowDatePicker(false)}
            onSave={handleDateSave}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <TimePickerModal
            visible={showTimePicker}
            time={timePickerType === 'start' ? startTime : endTime}
            title={timePickerType === 'start' ? 'Select Start Time' : 'Select End Time'}
            onClose={() => setShowTimePicker(false)}
            onSave={handleTimeSave}
            minTime={listing?.availableTimes?.startTime}
            maxTime={listing?.availableTimes?.endTime}
          />
        )}
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
    headerTitle: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
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
      height:56,
      marginBottom: 16,
    },
    inputIcon: {
      width: 20,
      height: 20,
      marginRight:8,
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
      
      justifyContent: 'space-between',
    },
    halfContainer: {
      width: '48%',
    },
    thirdContainer: {
      width: '31%',
    },
    pricingSection: {
      backgroundColor: '#00000033',
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 20,
      overflow: 'hidden',
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
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.2)',
      paddingTop: 12,
      marginTop: 8,
    },
    totalLabel: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
    },
    totalValue: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'right',
    },
    buttonSpacer: {
      height: 30,
    },
    buttonContainer: {
      marginBottom: 20
    },
    paymentButton: {
      width: '100%',
    },
    timeLabel: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    inputText: {
      flex: 1,
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    dropdownArrow: {
      width: 16,
      height: 16,
      tintColor: 'rgba(255, 255, 255, 0.5)',
    },
    disabledInput: {
    },
    disabledInputText: {
      color: 'rgba(255, 255, 255, 0.5)',
    },
    availabilityInfo: {
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: 'rgba(166, 230, 110, 0.3)',
    },
    availabilityInfoText: {
      color: '#A6E66E',
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    // Time Picker Modal Styles
    timePickerModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 99999,
      elevation: 99999,
      width: '100%',
      height: '100%',
    },
    timePickerModalContainer: {
      backgroundColor: '#1D234B',
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      zIndex: 10000,
      elevation: 10000,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
    },
    closeButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      color: 'white',
      fontSize: 24,
      fontWeight: 'bold',
    },
    timePickerWrapper: {
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#2A3062',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    saveButton: {
      flex: 1,
      backgroundColor: '#A6E66E',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#1D234B',
      fontSize: 16,
      fontWeight: '600',
    },
    // Date Picker Modal Styles
    datePickerModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 99999,
      elevation: 99999,
      width: '100%',
      height: '100%',
    },
    datePickerModalContainer: {
      backgroundColor: '#1D234B',
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      zIndex: 10000,
      elevation: 10000,
    },
    datePickerWrapper: {
      marginBottom: 20,
    },
    disabledButton: {
      opacity: 0.6,
    },
    // Available Slots Card Styles
    availableSlotsCard: {
      backgroundColor: 'rgba(31, 61, 5, 0.63)',
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: 'rgba(30, 63, 0, 0.3)',
    },
    availableSlotsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    availableSlotsIcon: {
      width: 20,
      height: 20,
      marginRight: 8,
      tintColor: '#A6E66E',
    },
    availableSlotsTitle: {
      color: '#A6E66E',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Urbanist-Bold',
    },
    slotsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    slotItem: {
      backgroundColor: 'rgb(121, 255, 3)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(166, 230, 110, 0.4)',
    },
    slotText: {
      color: 'rgb(17, 36, 0)',
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Urbanist-Medium',
    },
    noSlotsContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    noSlotsText: {
      color: '#FF6B6B',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Urbanist-Bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    noSlotsSubText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 14,
      fontWeight: '400',
      fontFamily: 'Urbanist',
      textAlign: 'center',
    },
    // Listing Timing Card Styles
    listingTimingCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    listingTimingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    listingTimingIcon: {
      width: 20,
      height: 20,
      marginRight: 8,
      tintColor: '#FFFFFF',
    },
    listingTimingTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Urbanist-Bold',
    },
    timingInfoContainer: {
      gap: 8,
    },
    timingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timingLabel: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Urbanist-Medium',
      flex: 1,
    },
    timingValue: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'Urbanist-Bold',
      textAlign: 'right',
      flex: 1,
    },
  }); 