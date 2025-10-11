import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';

import { LocationButton } from './components/LocationButton';
import { LocationDropdown } from './components/LocationDropdown';
import { BackyardCard } from './components/BackyardCard';

import { Icons } from '../../../constants/icons';
import { capitalizeFirstLetter } from '../../lib/utils/textUtils';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectListing, setListings } from '../../store/slices/listingsSlice';
import { useAuth } from '../../lib/hooks/useAuth';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import ChatService from '@/app/lib/services/chatService';

// Predefined locations
const LOCATIONS = [
  "Washington DC, USA",
  "New York, USA",
  "Los Angeles, USA",
  "Chicago, USA",
  "Miami, USA"
];
import { Dimensions } from 'react-native';
import { Header } from '@/app/components';
import { MoreIcon } from '@/app/components/icons';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { router } from 'expo-router';
import { useImageLoadingState } from '@/app/lib/hooks/useImageLoadingState';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // 24px padding on each side

export default function RenterHome() {
  const { user } = useAuth();
  const { items: listings } = useAppSelector((state: any) => state.listings);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(user?.name ?? null);

  // Handle payment success message
  useEffect(() => {
    if (params.paymentSuccess === 'true') {
      setShowSuccessMessage(true);
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [params.paymentSuccess]);

  const [search, setSearch] = useState('');
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [headerRefreshKey, setHeaderRefreshKey] = useState(0);
  const [screenRefreshKey, setScreenRefreshKey] = useState(0);

  // Track image loading state
  const { isLoading: isImagesLoading, onImageLoad, onImageError, loadedCount, totalCount } = useImageLoadingState(listings);
  
  // Debug image loading progress
  useEffect(() => {
    console.log(`📊 Main app image loading progress: ${loadedCount}/${totalCount} images loaded`);
  }, [loadedCount, totalCount]);

  // Handle combined loading state (listings + images)
  useEffect(() => {
    console.log(`🔄 Main app loading states - Listings: ${isLoadingListings}, Images: ${isImagesLoading}`);
    if (!isLoadingListings && !isImagesLoading) {
      // Both listings and images are loaded
      console.log('✅ All listings and images loaded for main app');
    }
  }, [isLoadingListings, isImagesLoading]);

  // Show loading while either listings or images are loading
  const isStillLoading = isLoadingListings || isImagesLoading;

  // Initialize chat service and set renter as online when app starts
  useEffect(() => {
    const initializeRenterOnlineStatus = async () => {
      const chatService = ChatService.getInstance();
      try {
        // Clear any temporary data first
        await chatService.clearTemporaryData();
        // Clean up legacy storage to prevent SQLite full errors (if method exists)
        if (typeof chatService.cleanupStorage === 'function') {
          await chatService.cleanupStorage();
        } else {
          console.log('Main app: cleanupStorage method not available, trying direct cleanup');
          // Fallback: try direct cleanup using the utility function
          try {
            const { cleanupLegacyChatData } = await import('../../lib/utils/storageCleanup');
            await cleanupLegacyChatData();
            console.log('Main app: Direct cleanup completed');
          } catch (cleanupError) {
            console.error('Main app: Direct cleanup failed:', cleanupError);
          }
        }
        // Set renter as online with real Firebase UID
        await chatService.setUserOnline();
        console.log('Main app: Set renter as online');
      } catch (error: any) {
        console.error('Main app: Error setting renter online:', error);
        // If there's a storage error, try emergency cleanup
        if (error?.message && error.message.includes('SQLITE_FULL')) {
          console.log('Main app: SQLite full error detected, performing emergency cleanup');
          try {
            if (typeof chatService.emergencyStorageCleanup === 'function') {
              await chatService.emergencyStorageCleanup();
            } else {
              console.log('Main app: emergencyStorageCleanup method not available, trying direct cleanup');
              // Fallback: try direct emergency cleanup
              try {
                const { emergencyCleanup } = await import('../../lib/utils/storageCleanup');
                await emergencyCleanup();
                console.log('Main app: Direct emergency cleanup completed');
              } catch (directCleanupError) {
                console.error('Main app: Direct emergency cleanup failed:', directCleanupError);
              }
            }
          } catch (cleanupError) {
            console.error('Main app: Emergency cleanup failed:', cleanupError);
          }
        }
      }
    };

    initializeRenterOnlineStatus();
  }, []);

  // Subscribe to global listings for all renters
  React.useEffect(() => {
    const listingsRef = ref(rtdb, 'listings');
    const unsub = onValue(listingsRef, (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val || {});
      const asArray = keys.map((k) => ({ id: val[k]?.id ?? k, ...val[k] }));
      asArray.sort((a: any, b: any) => {
        const at = new Date(a.createdAt || 0).getTime();
        const bt = new Date(b.createdAt || 0).getTime();
        if (bt !== at) return bt - at;
        return String(b.id).localeCompare(String(a.id));
      });
     
      asArray.forEach((listing, index) => {
        const mainImageInfo = listing.mainImage 
          ? (typeof listing.mainImage === 'string' 
              ? `string URI (${listing.mainImage.substring(0, 50)}...)` 
              : `object with URI: ${listing.mainImage.uri?.substring(0, 50) || 'no URI'}...`)
          : 'no mainImage';
        console.log(`Listing ${index + 1}: ID=${listing.id}, Title=${listing.title}, MainImage=${mainImageInfo}`);
      });
      console.log('=====================================');
      
      dispatch(setListings(asArray as any));
      setIsLoadingListings(false);
    });
    return () => {
      try { off(listingsRef); } catch { }
      try { unsub(); } catch { }
    };
  }, [dispatch]);

  // Live name from DB
  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const nameRef = ref(rtdb, `users/${uid}/fullName`);
    const unsub = onValue(nameRef, (snap) => {
      const v = snap.val();
      if (v) setDisplayName(String(v));
    });
    return () => {
      try { off(nameRef); } catch { }
      try { unsub(); } catch { }
    };
  }, [user?.id]);

  // Refresh only header when user returns to home screen (not the entire screen)
  useFocusEffect(
    React.useCallback(() => {
      console.log('Home screen focused - refreshing header only');
      setHeaderRefreshKey(prev => prev + 1);
      // Don't refresh the entire screen to prevent image reloading
    }, [])
  );

  // Note: Header component has real-time listeners for unread count updates
  // No need for periodic refresh - the Header will update automatically when new messages arrive

  const handleLocationPress = () => {
    setShowLocationDropdown(true);
  };

  const handleCloseDropdown = () => {
    setShowLocationDropdown(false);
  };

  const selectLocation = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);
  };

  // Handle profile navigation
  const handleProfilePress = () => {
    router.push('/(main-app)/notifications');
  };

  // Get user's first name for greeting
  const getFirstName = () => {
    const fullName = displayName || (user as any)?.name || '';
    if (fullName) return capitalizeFirstLetter(String(fullName).split(' ')[0]);
    if (user?.email) return capitalizeFirstLetter(user.email.split('@')[0]);
    return 'John';
  };

  // Check if user is admin
  const isAdmin = user?.type === 'owner' || false;

  // Handle add new backyard
  const handleAddBackyard = () => {
    Alert.alert('Add Backyard', 'Add new backyard functionality', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add', onPress: () => console.log('Add new backyard') }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      
      {/* Payment Success Message */}
      {showSuccessMessage && (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>🎉 Payment Successful! Your booking has been confirmed.</Text>
        </View>
      )}

      {/* Header Component */}
      <Header
        leftComponent="menu"
        onMenuPress={handleProfilePress}
        refreshTrigger={headerRefreshKey}
        customCenterComponent={
          <LocationButton
            locationText={selectedLocation}
            onPress={handleLocationPress}
          />
        }
        customRightComponent={
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={() => router.push('/(main-app)/notification-centre')}>
              <Image
                source={require('../../../assets/icons/icBELL.png')}
                style={styles.headerBellIcon}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Location Selection Modal */}
      <LocationDropdown
        visible={showLocationDropdown}
        locations={LOCATIONS}
        selectedLocation={selectedLocation}
        onClose={handleCloseDropdown}
        onSelectLocation={selectLocation}
        styles={styles}
      />

      {/* Welcome message */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>Morning {getFirstName()},</Text>
        <Text style={styles.welcomeSubtitle}>Welcome.</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Image source={require('../../../assets/icons/icS.png')} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={search}
            onChangeText={(t) => setSearch(t)}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <View style={styles.filterButtonInner}>
            <Image source={require('../../../assets/icons/icFilter.png')} style={styles.filterButtonIcon} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Backyard cards from global listings */}
      <ScrollView style={styles.cardList} showsVerticalScrollIndicator={false}>
        {isLoadingListings ? (
          <LoadingSpinner 
            visible={true} 
            text="Loading backyard listings..." 
            overlay={false}
          />
        ) : (!listings || listings.length === 0) ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>No active listings</Text>
          </View>
        ) : null}
        {/* Dynamic listings - newest first */}
        {!isLoadingListings && (() => {
          const filtered = listings.filter((l: any) => {
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            const tokens = q.split(/\s+/g).filter(Boolean);
            const title = String(l.title || '').toLowerCase();
            return tokens.every((w) => title.includes(w));
          });

          if (listings.length > 0 && search.trim() && filtered.length === 0) {
            return (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>No listings for this name</Text>
              </View>
            );
          }

          return filtered.map((l: any) => (
            <BackyardCard
              key={l.id}
              imageSource={(() => {
                // Handle string URLs (Firebase Storage URLs)
                if (typeof l.mainImage === 'string' && l.mainImage.length > 0) {
                  console.log('🏠 Home: Using string URL for listing', l.id, ':', l.mainImage);
                  return { uri: l.mainImage };
                }
                
                // Handle objects with uri property
                if (l.mainImage && typeof l.mainImage === 'object' && l.mainImage.uri && typeof l.mainImage.uri === 'string' && l.mainImage.uri.length > 0) {
                  console.log('🏠 Home: Using object URI for listing', l.id, ':', l.mainImage.uri);
                  return { uri: l.mainImage.uri };
                }
                
                // Fallback to placeholder
                console.log('🏠 Home: Using placeholder for listing', l.id, 'mainImage:', l.mainImage);
                return require('../../../assets/icons/renter_home_1.png');
              })()}
              name={l.title || 'Backyard Name'}
              location={l.location || `${l.city ?? 'City'}, ${l.country ?? 'Country'}`}
              distance={l.distance || '1.0 km'}
              dimensions={l.dimensions || '100m - 200m'}
              price={l.pricePerHour ? `$${l.pricePerHour}/hour` : '$100/hour'}
              styles={styles}
              listingId={l.id}
              onPress={() => {
                dispatch(selectListing(l.id));
                router.push('/(main-app)/backyard-details');
              }}
            />
          ));
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButtonIcon: {
    width: 55,
    height: 50,
    resizeMode: 'contain'
  },
  container: {
    paddingVertical: height * 0.001, // Responsive vertical padding
    paddingTop: 26,

    flex: 1,
  },
  welcome: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  welcomeTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  welcomeSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
  dimensionsText: {
    color: 'white',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    height: 48,
    backgroundColor: '#222952',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    width: 35,
    height: 35,
    marginRight: 8,
    resizeMode: 'contain',

  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: 'white',
    fontSize: 14,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardList: {
    marginBottom: 20
  },
  card: {
    marginBottom: 15,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  priceTag: {
    position: 'absolute',
    backgroundColor: '#46B649',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    left: 25,
    top: 25
  },
  priceTagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContent: {

    marginTop: 10
  },

  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    width: 18,
    height: 18,
    tintColor: 'white',
    resizeMode: 'contain',
    marginRight: 4,
  },
  locationText: {
    color: 'white',
    fontSize: 15,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  dis: {
    height: 10,
    width: 10
  },
  distanceIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain'
  },
  dimensionsIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: 'contain'
  },
  distanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 40,
    backgroundColor: 'white'
  },
  dimensionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#929292',
    fontSize: 12,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDropdownContainer: {
    width: width - 60,
    backgroundColor: 'rgba(35, 44, 96, 0.9)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    maxHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dropdownTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastLocationItem: {
    borderBottomWidth: 0,
  },
  dropdownLocationIcon: {
    width: 18,
    height: 18,
    marginRight: 12,
    tintColor: '#A6E66E',
  },
  locationItemText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A6E66E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 12,
    height: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  headerBellIcon: {
    width: 53,
    height: 53,
    resizeMode: 'contain',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Admin Controls Styles
  adminControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  adminSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 16,
    marginHorizontal: 4,
  },
  buttonSeparator: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  adminButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButton: {
  },
  adminButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
  },
  // Success Message Styles
  successMessage: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#A6E66E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successText: {
    color: '#1D234B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Header Add Button Styles
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

}); 