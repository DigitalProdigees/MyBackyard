import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';

import { LocationButton } from './components/LocationButton';
import { LocationDropdown } from './components/LocationDropdown';
import { BackyardCard } from './components/BackyardCard';
import { GradientBackground, Header } from '@/app/components';
import { MoreIcon } from '@/app/components/icons';
import { capitalizeFirstLetter } from '@/app/lib/utils/textUtils';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { selectListing, removeListing, setListings } from '@/app/store/slices/listingsSlice';
import { useAuth } from '@/app/lib/hooks/useAuth';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, onValue, off, remove } from 'firebase/database';
import Success from '@/app/components/dialogs/Success';
import ChatService from '@/app/lib/services/chatService';
import { useImageLoadingState } from '@/app/lib/hooks/useImageLoadingState';
import { getFunctions, httpsCallable } from 'firebase/functions';
const { width, height } = Dimensions.get('window');

const LOCATIONS = [
  "Washington DC, USA",
  "New York, USA",
  "Los Angeles, USA",
  "Chicago, USA",
  "Miami, USA"
];

export default function RenterHome() {
  const { user } = useAuth();
  const { items: listings } = useAppSelector((state: any) => state.listings);
  const dispatch = useAppDispatch();
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(user?.name ?? null);


  const [cards, setCards] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [headerRefreshKey, setHeaderRefreshKey] = useState(0);
  const [screenRefreshKey, setScreenRefreshKey] = useState(0);

  const [showSuccess, setShowSuccess] = useState(false);

  // Stripe Connect status
  const [stripeStatus, setStripeStatus] = useState({
    status: 'not_created',
    accountId: null,
    needsOnboarding: false,
    isChecking: false,
    isSettingUp: false
  });

  // Track image loading state
  const { isLoading: isImagesLoading, onImageLoad, onImageError, loadedCount, totalCount } = useImageLoadingState(listings);
  
  // Debug image loading progress
  useEffect(() => {
    console.log(`📊 Owner app image loading progress: ${loadedCount}/${totalCount} images loaded`);
  }, [loadedCount, totalCount]);

  // Initialize chat service and set owner as online when app starts
  useEffect(() => {
    const initializeOwnerOnlineStatus = async () => {
      try {
        const chatService = ChatService.getInstance();
        // Clear any temporary data first
        await chatService.clearTemporaryData();
        // Clean up legacy storage to prevent SQLite full errors (if method exists)
        if (typeof chatService.cleanupStorage === 'function') {
          await chatService.cleanupStorage();
        } else {
          console.log('Owner app: cleanupStorage method not available, trying direct cleanup');
          // Fallback: try direct cleanup using the utility function
          try {
            const { cleanupLegacyChatData } = await import('@/app/lib/utils/storageCleanup');
            await cleanupLegacyChatData();
            console.log('Owner app: Direct cleanup completed');
          } catch (cleanupError) {
            console.log('Owner app: Direct cleanup failed:', cleanupError);
          }
        }
        
        // Get the current user ID that will be used
        const currentUserId = await chatService.getCurrentUserId();
        console.log('Owner app: Current user ID:', currentUserId);
        console.log('Owner app: Firebase auth UID:', auth.currentUser?.uid);
        
        // Set owner as online with real Firebase UID
        await chatService.setUserOnline();
        console.log('Owner app: Set owner as online with ID:', currentUserId);
      } catch (error: any) {
        console.log('Owner app: Error setting owner online:', error);
        // If there's a storage error, try emergency cleanup
        if (error.message && error.message.includes('SQLITE_FULL')) {
          console.log('Owner app: SQLite full error detected, performing emergency cleanup');
          try {
            const chatService = ChatService.getInstance();
            if (typeof chatService.emergencyStorageCleanup === 'function') {
              await chatService.emergencyStorageCleanup();
            } else {
              console.log('Owner app: emergencyStorageCleanup method not available, trying direct cleanup');
              // Fallback: try direct emergency cleanup
              try {
                const { emergencyCleanup } = await import('@/app/lib/utils/storageCleanup');
                await emergencyCleanup();
                console.log('Owner app: Direct emergency cleanup completed');
              } catch (directCleanupError) {
                console.log('Owner app: Direct emergency cleanup failed:', directCleanupError);
              }
            }
          } catch (cleanupError) {
            console.log('Owner app: Emergency cleanup failed:', cleanupError);
          }
        }
      }
    };

    initializeOwnerOnlineStatus();
  }, []);

  // 🔥 Auto close Success popup after 1 sec
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleRemoveCard = async (id: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await Promise.all([
        remove(ref(rtdb, `listings/${id}`)),
        remove(ref(rtdb, `users/${uid}/listings/${id}`)),
      ]);
      dispatch(removeListing(id));
      setShowSuccess(true);
    } catch { }
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const listingsRef = ref(rtdb, `users/${uid}/listings`);
    const unsubscribe = onValue(listingsRef, (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val || {});
      const asArray = keys.map((k) => ({ id: val[k]?.id ?? k, ...val[k] }));
      // newest first by createdAt if present, otherwise by id/key
      asArray.sort((a: any, b: any) => {
        const at = new Date(a.createdAt || 0).getTime();
        const bt = new Date(b.createdAt || 0).getTime();
        if (bt !== at) return bt - at;
        return String(b.id).localeCompare(String(a.id));
      });
      
      // Debug image data for each listing
      asArray.forEach((listing, index) => {
        const mainImageInfo = listing.mainImage 
          ? (typeof listing.mainImage === 'string' 
              ? `string URI (${listing.mainImage.substring(0, 50)}...)` 
              : `object with URI: ${listing.mainImage.uri?.substring(0, 50) || 'no URI'}...`)
          : 'no mainImage';
        console.log(`🏠 Owner Home: Listing ${index + 1} (${listing.id}): ${mainImageInfo}`);
      });
      
      dispatch(setListings(asArray as any));
      setIsLoadingListings(false); // Set loading to false when listings are loaded
    });
    return () => {
      try { off(listingsRef); } catch { }
      try { unsubscribe(); } catch { }
    };
  }, [dispatch]);

  // Handle combined loading state (listings + images)
  useEffect(() => {
    console.log(`🔄 Owner app loading states - Listings: ${isLoadingListings}, Images: ${isImagesLoading}`);
    if (!isLoadingListings && !isImagesLoading) {
      // Both listings and images are loaded
      console.log('✅ All listings and images loaded for owner app');
    }
  }, [isLoadingListings, isImagesLoading]);

  // Show loading while either listings or images are loading
  const isStillLoading = isLoadingListings || isImagesLoading;

  // Live name from DB
  useEffect(() => {
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
      console.log('Owner Home screen focused - refreshing header only');
      setHeaderRefreshKey(prev => prev + 1);
      // Don't refresh the entire screen to prevent image reloading
    }, [])
  );

  // Note: Header component has real-time listeners for unread count updates
  // No need for periodic refresh - the Header will update automatically when new messages arrive

  // Removed handleProfilePress - Header component now handles menu drawer

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    setStripeStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkConnectAccountStatus');
      
      const result = await checkStatus({});
      const data = result.data as any;
      
      if (data.success) {
        setStripeStatus({
          status: data.status,
          accountId: data.accountId,
          needsOnboarding: data.needsOnboarding,
          isChecking: false,
          isSettingUp: false
        });
      }
    } catch (error) {
      console.log('Error checking Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Refresh Stripe Connect status (manual refresh)
  const refreshStripeStatus = async () => {
    setStripeStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const functions = getFunctions();
      const refreshStatus = httpsCallable(functions, 'refreshConnectAccountStatus');
      
      const result = await refreshStatus({});
      const data = result.data as any;
      
      if (data.success) {
        setStripeStatus({
          status: data.status,
          accountId: data.accountId,
          needsOnboarding: data.needsOnboarding,
          isChecking: false,
          isSettingUp: false
        });
      }
    } catch (error) {
      console.log('Error refreshing Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Animated refresh icon for status
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (stripeStatus.isChecking) {
      try { rotateLoopRef.current?.stop(); } catch {}
      rotateAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateLoopRef.current = loop;
      loop.start();
    } else {
      // Gracefully finish the current rotation cycle before resetting
      rotateAnim.stopAnimation((val) => {
        const current = typeof val === 'number' ? val : 0;
        const progress = current % 1; // 0..1
        const remaining = (1 - progress);
        if (remaining > 0 && remaining < 1) {
          Animated.timing(rotateAnim, {
            toValue: current + remaining,
            duration: remaining * 800,
            easing: Easing.linear,
            useNativeDriver: true,
          }).start(() => {
            try { rotateLoopRef.current?.stop(); } catch {}
            rotateLoopRef.current = null;
            rotateAnim.setValue(0);
          });
        } else {
          try { rotateLoopRef.current?.stop(); } catch {}
          rotateLoopRef.current = null;
          rotateAnim.setValue(0);
        }
      });
    }
  }, [stripeStatus.isChecking]);
  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Reopen Stripe onboarding
  const reopenStripeOnboarding = async () => {
    setStripeStatus(prev => ({ ...prev, isSettingUp: true }));
    
    try {
      const functions = getFunctions();
      const createAccountLink = httpsCallable(functions, 'createAccountLink');
      
      const result = await createAccountLink({});
      const data = result.data as any;
      
      if (data.success && data.accountLink) {
        console.log('Reopening Stripe onboarding');
        
        // Open Stripe onboarding in browser
        const result = await WebBrowser.openBrowserAsync(data.accountLink, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        
        if (result.type === 'dismiss') {
          // User completed or cancelled onboarding - refresh status
          await refreshStripeStatus();
        }
      }
    } catch (error) {
      console.log('Error reopening Stripe onboarding:', error);
    } finally {
      setStripeStatus(prev => ({ ...prev, isSettingUp: false }));
    }
  };

  // Check Stripe status on component mount
  useEffect(() => {
    if (user?.type === 'owner') {
      checkStripeStatus();
    }
  }, [user?.type]);

  const getFirstName = () => {
    const fullName = displayName || (user as any)?.name || '';
    if (fullName) return capitalizeFirstLetter(String(fullName).split(' ')[0]);
    if (user?.email) return capitalizeFirstLetter(user.email.split('@')[0]);
    return 'John';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      {/* Header */}
      <Header
        leftComponent="menu"
        refreshTrigger={headerRefreshKey}
        customCenterComponent={
          <LocationButton
            locationText={selectedLocation}
            onPress={() => setShowLocationDropdown(true)}
          />
        }
        customRightComponent={
          <View style={styles.headerRightContainer}>
            <TouchableOpacity onPress={() => router.push('/(main-app)/notification-centre')}>
              <Image
                source={require('../../../../assets/icons/icBELL.png')}
                style={styles.headerBellIcon}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Location Dropdown */}
      <LocationDropdown
        visible={showLocationDropdown}
        locations={LOCATIONS}
        selectedLocation={selectedLocation}
        onClose={() => setShowLocationDropdown(false)}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          setShowLocationDropdown(false);
        }}
        styles={styles}
      />

      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>Morning {getFirstName()},</Text>
        <Text style={styles.welcomeSubtitle}>Welcome.</Text>
      </View>

      {/* Conditional UI based on Stripe verification status */}
      {stripeStatus.status === 'verified' ? (
        // Full access - verified owner
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Image source={require('../../../../assets/icons/icS.png')} style={styles.searchIcon} />
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
                <Image
                  source={require('../../../../assets/icons/icFilter.png')}
                  style={styles.filterButtonIcon}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Cards */}
          <ScrollView style={styles.cardList} showsVerticalScrollIndicator={false}>
            {isLoadingListings ? (
              <LoadingSpinner 
                visible={true} 
                text="Loading your listings..." 
                overlay={false}
              />
            ) : (!listings || listings.length === 0) ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>No active listings</Text>
              </View>
            ) : null}
            {/* Dynamic cards first */}
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
                      console.log('🏠 Owner Home: Using string URL for listing', l.id, ':', l.mainImage);
                      return { uri: l.mainImage };
                    }
                    
                    // Handle objects with uri property
                    if (l.mainImage && typeof l.mainImage === 'object' && l.mainImage.uri && typeof l.mainImage.uri === 'string' && l.mainImage.uri.length > 0) {
                      console.log('🏠 Owner Home: Using object URI for listing', l.id, ':', l.mainImage.uri);
                      return { uri: l.mainImage.uri };
                    }
                    
                    // Fallback to placeholder
                    console.log('🏠 Owner Home: Using placeholder for listing', l.id, 'mainImage:', l.mainImage);
                    return require('../../../../assets/icons/renter_home_1.png');
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
                    router.push('/(owner-app)/(main-app)/backyard-details');
                  }}
                  onDelete={() => handleRemoveCard(l.id)}
                />
              ));
            })()}

            {/* Static default cards removed; now showing only RTDB data */}
          </ScrollView>

          <TouchableOpacity style={{
            alignItems: 'flex-end', paddingHorizontal: 16,
            position: 'absolute',
            top: '92%',
            left: '72%'
          }} activeOpacity={0.5} onPress={() => router.push('../my-listings')}>
            <Image
              source={require('../../../../assets/icons/plus.png')}
              style={{
                width: 60,
                height: 60,
                resizeMode: 'stretch',
              }}
            />
          </TouchableOpacity>
        </>
      ) : (
        // Limited access - pending verification
        <View style={styles.pendingVerificationContainer}>
          <View style={styles.pendingIconContainer}>
            <Image
              source={require('../../../../assets/images/verify.png')}
              style={styles.pendingIcon}
            />
          </View>
          
          <Text style={styles.pendingTitle}>Account Under Review</Text>
          
          <Text style={styles.pendingSubtitle}>
            {stripeStatus.status === 'not_created' 
              ? 'Please complete your payment setup to start listing your backyard.'
              : stripeStatus.status === 'pending_onboarding'
              ? 'Please complete your payment processing setup to continue.'
              : 'Your account is being reviewed. You\'ll be notified once verification is complete.'
            }
          </Text>
          
          {stripeStatus.status === 'not_created' && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={reopenStripeOnboarding}
                disabled={stripeStatus.isSettingUp}
              >
                {stripeStatus.isSettingUp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>Complete Setup</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshStripeStatus}
                disabled={stripeStatus.isChecking}
              >
                {stripeStatus.isChecking ? (
                  <ActivityIndicator size="small" color="#1D234B" />
                ) : (
                  <Text style={styles.refreshButtonText}>Refresh Status</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {stripeStatus.status === 'pending_onboarding' && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={reopenStripeOnboarding}
                disabled={stripeStatus.isSettingUp}
              >
                {stripeStatus.isSettingUp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.setupButtonText}>Complete Payment Setup</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshIconButton}
                onPress={refreshStripeStatus}
                disabled={stripeStatus.isChecking}
                accessibilityLabel="Refresh verification status"
              >
                <Animated.Image
                  source={require('../../../../assets/images/refresh1.png')}
                  style={[styles.refreshIcon, { transform: [{ rotate: spin }] }]}
                />
              </TouchableOpacity>
            </View>
          )}
          
          {stripeStatus.status === 'pending_verification' && (
            <TouchableOpacity
              style={styles.refreshIconButton}
              onPress={refreshStripeStatus}
              disabled={stripeStatus.isChecking}
              accessibilityLabel="Refresh verification status"
            >
              <Animated.Image
                source={require('../../../../assets/images/refresh1.png')}
                style={[styles.refreshIcon, { transform: [{ rotate: spin }] }]}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* ✅ Success Dialog */}
      <Success
        visible={showSuccess}
        title={"Deleted Successfully!"}
        buttonText={"OK"}
        onButtonPress={() => setShowSuccess(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  // ⬇️ keeping all your original styles, no change
  filterButtonIcon: {
    width: 55,
    height: 50,
    resizeMode: 'contain'
  },
  container: {
    paddingVertical: height * 0.001,
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

    marginBottom: 20,
  },
  card: {
    marginBottom: 15,
  },
  cardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 12
  },
  priceTag: {
    position: 'absolute',
    backgroundColor: '#46B649',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    left: 25,
    top: 25,
  },
  priceTagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContent: {
    marginTop: 10,
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
    marginTop: 2,
  },
  dis: {
    height: 10,
    width: 10,
  },
  distanceIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    resizeMode: 'contain',
  },
  dimensionsIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    resizeMode: 'contain',
  },
  distanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 40,
    backgroundColor: 'white',
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
  deleteButton: {},
  adminButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Pending Verification Styles
  pendingVerificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  pendingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pendingIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  pendingTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  pendingSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  setupButton: {
    backgroundColor: '#A6E66E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 200,
  },
  setupButtonText: {
    color: '#1D234B',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 150,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  refreshIconButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  refreshIcon: {
    width: 32,
    height: 32,
    tintColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
});
