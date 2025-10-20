import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';


import { ProfileDropdown } from './components';
// ProfileContext removed - using Redux instead
import { BackButton, GradientBackground, GradientButton, SuccessDialog } from '@/app/components';
import Success from '@/app/components/dialogs/Success';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/app/lib/hooks/useAuth';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get, update } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// Sample data for dropdowns - matching the design
const COUNTRIES = ['US', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'Brazil'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle', 'Boston', 'Denver', 'Phoenix'];
const STATES = ['Wyoming', 'California', 'New York', 'Texas', 'Florida', 'Colorado', 'Washington', 'Arizona'];

export default function Profile() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState<'country' | 'city' | 'state' | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  

  // Check if we're in edit mode from navigation params
  const isEditModeFromParams = params.mode === 'edit';
  const profileDataFromParams = (() => {
    try {
      return params.profileData ? JSON.parse(params.profileData as string) : null;
    } catch (error) {
      console.log('Error parsing profile data from params:', error);
      return null;
    }
  })();

  // Initialize profile data based on user data from auth context
  const getInitialProfileData = () => {
    // Get display name, or fallback to extracting name from email
    let displayName = user?.name || auth.currentUser?.displayName;

    if (!displayName && (user?.email || auth.currentUser?.email)) {
      const email = user?.email || auth.currentUser?.email;
      // Extract name from email (everything before @)
      const emailName = email!.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces
      displayName = emailName
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Final fallback
    displayName = displayName || 'User';

    return {
      fullName: displayName,
      email: user?.email || auth.currentUser?.email || '',
      country: 'US',
      city: 'NewYork',
      state: 'Wyoming',
      zipCode: '54000',
    };
  };

  const [profileData, setProfileData] = useState(getInitialProfileData);
  const [formData, setFormData] = useState(getInitialProfileData);

  // Update profile data when user data changes or when in edit mode
  useEffect(() => {
    console.log('Profile useEffect triggered:', { isEditModeFromParams, profileDataFromParams });

    if (isEditModeFromParams && profileDataFromParams) {
      // We're in edit mode, use the passed profile data
      console.log('Setting edit mode data:', profileDataFromParams);
      setProfileData(profileDataFromParams);
      setFormData(profileDataFromParams);
      setIsEditMode(true);
    } else {
      // Normal mode, use initial data
      const newProfileData = getInitialProfileData();
      console.log('Setting initial data:', newProfileData);
      setProfileData(newProfileData);
      setFormData(newProfileData);
    }
  }, [user, isEditModeFromParams]);

  // Fetch full name from RTDB and set as read-only display
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      try {
        console.log('Owner Profile: Fetching fullName for UID:', uid);
        const snap = await get(ref(rtdb, `users/${uid}/fullName`));
        if (snap.exists()) {
          const fullName = String(snap.val());
          console.log('Owner Profile: Found fullName:', fullName);
          setProfileData((prev: any) => ({ ...prev, fullName }));
          setFormData((prev: any) => ({ ...prev, fullName }));
        } else {
          console.log('Owner Profile: No fullName found in Firebase for UID:', uid);
        }
      } catch (error) {
        console.log('Owner Profile: Error fetching fullName:', error);
      }
    })();
  }, [user?.id, auth.currentUser?.uid]);

  // Auto-navigate back to notifications after 2 seconds when success dialog shows in edit mode
  useEffect(() => {
    if (showSuccessDialog && isEditModeFromParams) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
        router.back();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog, isEditModeFromParams]);

  const toggleEditMode = () => {
    if (isEditMode) {
      // Save changes
      setProfileData(formData);
      setIsEditMode(false);
      // Navigate back when Save is clicked
      router.back();
    } else {
      // Enter edit mode with current data
      setFormData(profileData);
      setIsEditMode(true);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log('handleInputChange called:', { field, value, currentFormData: formData });
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('New form data:', newData);
      return newData;
    });
  };

  const handleOpenDropdown = (type: 'country' | 'city' | 'state') => {
    setShowDropdown(type);
  };

  const handleCloseDropdown = () => {
    setShowDropdown(null);
  };

  const handleSelectItem = (item: string) => {
    if (showDropdown) {
      handleInputChange(showDropdown, item);
      setShowDropdown(null);
    }
  };

  // Get dropdown data based on type
  const getDropdownItems = () => {
    switch (showDropdown) {
      case 'country':
        return COUNTRIES;
      case 'city':
        return CITIES;
      case 'state':
        return STATES;
      default:
        return [];
    }
  };

  // Get dropdown title based on type
  const getDropdownTitle = () => {
    switch (showDropdown) {
      case 'country':
        return 'Select Country';
      case 'city':
        return 'Select City';
      case 'state':
        return 'Select State';
      default:
        return '';
    }
  };

  // Get user's initials for avatar
  const getUserInitials = () => {
    // Use the same logic as profile data to get the display name
    let displayName = user?.name;

    if (!displayName && user?.email) {
      // Extract name from email (everything before @)
      const emailName = user.email.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces
      displayName = emailName
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Final fallback
    const name = displayName || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  // Image picker functions
  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Profile Image',
      'Choose how you want to set your profile image',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImageLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1, // Very low quality for instant upload
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Log image size after compression
        if (asset.fileSize) {
          const sizeInKB = (asset.fileSize / 1024).toFixed(2);
          const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(2);
          console.log(`📸 Owner profile image captured: ${asset.uri}`);
          console.log(`📏 Image size after compression: ${sizeInKB} KB (${sizeInMB} MB)`);
          console.log(`⚡ Quality setting: 10% (instant upload)`);
        } else {
          console.log(`📸 Owner profile image captured: ${asset.uri} (compressed for instant upload)`);
        }
        
        await handleImageSelection(asset.uri);
      }
    } catch (error) {
      console.log('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Photo library permission is required to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1, // Very low quality for instant upload
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Log image size after compression
        if (asset.fileSize) {
          const sizeInKB = (asset.fileSize / 1024).toFixed(2);
          const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(2);
          console.log(`📸 Owner profile image selected: ${asset.uri}`);
          console.log(`📏 Image size after compression: ${sizeInKB} KB (${sizeInMB} MB)`);
          console.log(`⚡ Quality setting: 10% (instant upload)`);
        } else {
          console.log(`📸 Owner profile image selected: ${asset.uri} (compressed for instant upload)`);
        }
        
        await handleImageSelection(asset.uri);
      }
    } catch (error) {
      console.log('Image library error:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const handleImageSelection = async (imageUri: string) => {
    try {
      setIsImageLoading(true);
      
      // Upload image to Firebase Storage
      const uid = auth.currentUser?.uid;
      if (uid) {
        // Convert URI to blob for upload
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Upload to Firebase Storage
        const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('@/app/lib/firebase');
        
        const imageRef = storageRef(storage, `profile-images/${uid}/profile_${Date.now()}.jpg`);
        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);

        // Save URL to Firebase Realtime Database
        await update(ref(rtdb, `users/${uid}`), {
          profileImageUrl: downloadURL
        });
      }

      // Update local state
      setProfileImage(imageUri);
      
      // Save to AsyncStorage for offline access
      await AsyncStorage.setItem('userProfileImage', imageUri);
      
      Alert.alert('Success', 'Profile image updated successfully!');
    } catch (error) {
      console.log('Error saving profile image:', error);
      Alert.alert('Error', 'Failed to save profile image');
    } finally {
      setIsImageLoading(false);
    }
  };

  // Load profile image on component mount
  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          // Try to load from new Storage URL format first
          const profileImageUrlRef = ref(rtdb, `users/${uid}/profileImageUrl`);
          const urlSnapshot = await get(profileImageUrlRef);
          
          if (urlSnapshot.exists()) {
            const imageUrl = urlSnapshot.val();
            setProfileImage(imageUrl);
          } else {
            // Fallback to old base64 format for backward compatibility
            const profileImageRef = ref(rtdb, `users/${uid}/profileImage`);
            const snapshot = await get(profileImageRef);
            
            if (snapshot.exists()) {
              const base64Data = snapshot.val();
              const mimeType = await get(ref(rtdb, `users/${uid}/profileImageMimeType`));
              const imageUri = `data:${mimeType.val() || 'image/jpeg'};base64,${base64Data}`;
              setProfileImage(imageUri);
            } else {
              // Clear any existing profile image and show placeholder
              setProfileImage(null);
              // Clear AsyncStorage to prevent showing previous user's image
              await AsyncStorage.removeItem('userProfileImage');
            }
          }
        }
      } catch (error) {
        console.log('Error loading profile image:', error);
        // Clear profile image on error to show placeholder
        setProfileImage(null);
      }
    };

    loadProfileImage();
  }, [user?.id]);

  // Clear profile image when component unmounts or user changes
  useEffect(() => {
    return () => {
      setProfileImage(null);
    };
  }, [user?.id]);


  return (
    <View style={styles.container}>
      <StatusBar style="light"
        translucent />
      <GradientBackground />

      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() => router.back()}
        >
          <Image
            source={require('../../../../assets/icons/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellIconContainer}
          onPress={async () => {
            // Validate that name is not empty
            if (!formData.fullName || formData.fullName.trim() === '') {
              alert('Please enter your full name before proceeding');
              return;
            }

            // Ensure all required fields are present
            const profileDataToSave = {
              fullName: formData.fullName || '',
              email: formData.email || '',
              country: formData.country || 'US',
              city: formData.city || 'New York',
              state: formData.state || 'Wyoming',
              zipCode: formData.zipCode || '54000',
            };

            // Save profile location/name to RTDB
            try {
              const uid = auth.currentUser?.uid;
              if (uid) {
                await update(ref(rtdb, `users/${uid}`), {
                  fullName: profileDataToSave.fullName,
                  country: profileDataToSave.country,
                  city: profileDataToSave.city,
                  state: profileDataToSave.state,
                  zipCode: profileDataToSave.zipCode,
                });
              }
            } catch { }
            console.log('Profile data saved, navigating to notification center...');
            // Navigate to notification center screen
            router.push('/(main-app)/notification-centre');
          }}
        >
          <Image
            source={require('../../../../assets/icons/icBELL.png')}
            style={styles.bellIcon}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerTitle}>
        {isEditModeFromParams ? 'Edit Profile Info' : 'Profile Info'}
      </Text>
      {/* Profile Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={profileImage ? { uri: profileImage } : require('../../../../assets/icons/profile.png')}
            style={styles.avatarImage}
          />
          <TouchableOpacity 
            style={styles.editIconContainer}
            onPress={showImagePickerOptions}
            disabled={isImageLoading}
          >
            <Image
              source={require('../../../../assets/icons/icEdit.png')}
              style={[styles.editIcon, isImageLoading && { opacity: 0.5 }]}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Form */}
        <View style={styles.formContainer}>
          {/* Full Name (read-only from database) */}
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Image
                source={require('../../../../assets/icons/user.png')}
                style={styles.inputIcon}
              />
              <Text style={styles.inputText}>{formData.fullName || 'Owner'}</Text>
            </View>
          </View>

          {/* Country and City Row */}
          <View style={styles.formRow}>
            <TouchableOpacity
              style={styles.dropdownField}
              onPress={() => handleOpenDropdown('country')}
            >
              <Text style={styles.dropdownLabel}>Country</Text>
              <View style={styles.dropdownButton}>
                <Text style={styles.dropdownText}>{formData.country}</Text>
                <Image
                  source={require('../../../../assets/icons/down.png')}
                  style={styles.dropdownArrow}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdownField}
              onPress={() => handleOpenDropdown('city')}
            >
              <Text style={styles.dropdownLabel}>City</Text>
              <View style={styles.dropdownButton}>
                <Text style={styles.dropdownText}>{formData.city}</Text>
                <Image
                  source={require('../../../../assets/icons/down.png')}
                  style={styles.dropdownArrow}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* State and Zip Code Row */}
          <View style={styles.formRow}>
            <TouchableOpacity
              style={styles.dropdownField}
              onPress={() => handleOpenDropdown('state')}
            >
              <Text style={styles.dropdownLabel}>State</Text>
              <View style={styles.dropdownButton}>
                <Text style={styles.dropdownText}>{formData.state}</Text>
                <Image
                  source={require('../../../../assets/icons/down.png')}
                  style={styles.dropdownArrow}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.dropdownField}>
              <Text style={styles.dropdownLabel}>Zip Code</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputText}
                  placeholder="Enter zip code"
                  placeholderTextColor="#FFFFFF70"
                  value={formData.zipCode}
                  onChangeText={(text) => handleInputChange('zipCode', text)}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
          </View>
        </View>


      </ScrollView>
      <View style={{
        paddingHorizontal: 24, marginBottom: Math.min(height * 0.09, 43), // Responsive margin
      }}>
        <GradientButton
          text={isEditModeFromParams ? "Save" : "Next"}
          containerStyle={styles.loginButton}
          onPress={async () => {
            // Validate that name is not empty
            if (!formData.fullName || formData.fullName.trim() === '') {
              alert('Please enter your full name before proceeding');
              return;
            }

            // Ensure all required fields are present
            const profileDataToSave = {
              fullName: formData.fullName || '',
              email: formData.email || '',
              country: formData.country || 'US',
              city: formData.city || 'New York',
              state: formData.state || 'Wyoming',
              zipCode: formData.zipCode || '54000',
            };

            // Persist profile data (location and fullName) to RTDB
            try {
              const uid = auth.currentUser?.uid;
              if (uid) {
                await update(ref(rtdb, `users/${uid}`), {
                  fullName: profileDataToSave.fullName,
                  country: profileDataToSave.country,
                  city: profileDataToSave.city,
                  state: profileDataToSave.state,
                  zipCode: profileDataToSave.zipCode,
                });
              }
            } catch { }

            // Profile data saved
            console.log('Profile data saved');

            if (isEditModeFromParams) {
              // In edit mode, show success dialog first
              console.log('Showing success dialog in edit mode');
              setShowSuccessDialog(true);
            } else {
              // In create mode, clear signup flow flag and navigate to home screen
              console.log('Profile completed - clearing signup flow flag and navigating to home screen');
              try {
                await AsyncStorage.removeItem('signup_flow_active');
                await AsyncStorage.removeItem('signup_user_type');
              } catch (error) {
                console.warn('Failed to clear signup flow flags:', error);
              }
              router.replace('/(owner-app)/(main-app)/home');
            }
          }}
        /></View>
      {/* Dropdown Modal */}
      <ProfileDropdown
        visible={showDropdown !== null}
        title={getDropdownTitle()}
        items={getDropdownItems()}
        selectedItem={showDropdown ? formData[showDropdown] : ''}
        onClose={handleCloseDropdown}
        onSelectItem={handleSelectItem}
      />

      {/* Success Dialog for Edit Mode */}
      <Success
        visible={showSuccessDialog}
        title="Changes Saved!"
        buttonText="OK"
        onButtonPress={() => setShowSuccessDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    width: '100%',
    height: Math.min(height * 0.07, 56), // Responsive button height
  },
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
  },
  backButtonContainer: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',

    textAlign: 'center',
  },
  bellIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: Math.min(width * 0.17, 80), // Responsive icon width
    height: Math.min(width * 0.17, 80), // Responsive icon height
    resizeMode: 'contain',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    marginTop: 34,
    marginBottom: 32,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputField: {
    marginBottom: 24,
    width: '100%',
  },
  inputLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    marginLeft: 20
  },
  inputContainer: {
    height: 70,
    backgroundColor: '#202857', borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,

  },
  inputIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    marginRight: 12,
    tintColor: 'rgba(255, 255, 255, 0.7)',
  },
  inputText: {
    color: 'white',
    fontSize: 20,

    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dropdownField: {
    width: '48%',
  },
  dropdownLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    marginLeft: 20
  },
  dropdownButton: {
    height: 70,
    backgroundColor: '#202857', borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  dropdownText: {
    color: "#FFFFFF70",
    fontSize: 20,
  },
  dropdownArrow: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    tintColor: 'white',
  },
  infoField: {
    marginBottom: 16,
    width: '48%',
  },
  infoLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  infoValueContainer: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 19,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
  nextButton: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#46B649',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 10,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
  },
}); 