import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, Modal, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground, Header, BackButton, GradientButton, FeaturesModal, AdditionalServicesModal, CalculateAreaModal, LoadingIndicator } from '@/app/components';
import { Icons } from '@/constants/icons';
import { useAppDispatch } from '@/app/store/hooks';
import { addListing, updateListing } from '@/app/store/slices/listingsSlice';
import { auth, rtdb } from '@/app/lib/firebase';
import { ref, push, set, update as rtdbUpdate, get } from 'firebase/database';
import { uploadListingImages } from '@/app/lib/utils/imageStorageUtils';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '@/app/store/hooks';
// Image compression no longer needed since we're using Firebase Storage

const { width } = Dimensions.get('window');

interface WeekdaysSelectionModalProps {
	visible: boolean;
	selectedWeekdays: string[];
	onClose: () => void;
	onSave: (weekdays: string[]) => void;
}

const WeekdaysSelectionModal: React.FC<WeekdaysSelectionModalProps> = ({
	visible,
	selectedWeekdays,
	onClose,
	onSave,
}) => {
	const [tempWeekdays, setTempWeekdays] = useState<string[]>(selectedWeekdays);
	const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	React.useEffect(() => {
		if (visible) {
			setTempWeekdays(selectedWeekdays);
		}
	}, [visible, selectedWeekdays]);

	const toggleWeekday = (day: string) => {
		setTempWeekdays(prev => 
			prev.includes(day) 
				? prev.filter(d => d !== day)
				: [...prev, day]
		);
	};

	const handleSave = () => {
		onSave(tempWeekdays);
	};

	if (!visible) return null;

	return (
		<View style={styles.modalOverlay} pointerEvents="box-none">
			<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Select Available Days</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Text style={styles.closeButtonText}>×</Text>
						</TouchableOpacity>
					</View>
					
					<View style={styles.weekdaysContainer}>
						{weekdays.slice(0, 6).map((day) => (
							<TouchableOpacity
								key={day}
								style={[
									styles.weekdayButton,
									tempWeekdays.includes(day) && styles.weekdayButtonSelected
								]}
								onPress={() => toggleWeekday(day)}
							>
								<Text style={[
									styles.weekdayButtonText,
									tempWeekdays.includes(day) && styles.weekdayButtonTextSelected
								]}>
									{day}
								</Text>
							</TouchableOpacity>
						))}
						{/* Sunday centered in the middle */}
						<View style={styles.sundayContainer}>
							<TouchableOpacity
								style={[
									styles.sundayButton,
									tempWeekdays.includes('Sunday') && styles.weekdayButtonSelected
								]}
								onPress={() => toggleWeekday('Sunday')}
							>
								<Text style={[
									styles.weekdayButtonText,
									tempWeekdays.includes('Sunday') && styles.weekdayButtonTextSelected
								]}>
									Sunday
								</Text>
							</TouchableOpacity>
						</View>
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

interface TimeSelectionModalProps {
	visible: boolean;
	startTime: string;
	endTime: string;
	onClose: () => void;
	onSave: (startTime: string, endTime: string) => void;
	onOpenTimePicker: (type: 'start' | 'end') => void;
}

interface TimePickerModalProps {
	visible: boolean;
	time: string;
	title: string;
	timePickerType: 'start' | 'end';
	onClose: () => void;
	onSave: (time: string) => void;
}

const TimeSelectionModal: React.FC<TimeSelectionModalProps> = ({
	visible,
	startTime,
	endTime,
	onClose,
	onSave,
	onOpenTimePicker,
}) => {
	const [tempStartTime, setTempStartTime] = useState(startTime);
	const [tempEndTime, setTempEndTime] = useState(endTime);

	React.useEffect(() => {
		if (visible) {
			setTempStartTime(startTime);
			setTempEndTime(endTime);
		}
	}, [visible, startTime, endTime]);

	const formatTime = (time: string) => {
		if (!time) return 'Select time';
		const [hours, minutes] = time.split(':');
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? 'PM' : 'AM';
		const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
		return `${displayHour}:00 ${ampm}`;
	};


	const handleSave = () => {
		// Validate that both times are selected and end time is after start time
		if (!tempStartTime || !tempEndTime) {
			alert('Please select both start and end times.');
			return;
		}
		
		if (tempEndTime <= tempStartTime) {
			alert('End time must be after start time. Please select a valid time range.');
			return;
		}
		
		onSave(tempStartTime, tempEndTime);
	};

	if (!visible) return null;

	return (
		<View style={styles.modalOverlay} pointerEvents="box-none">
			<View style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<Text style={styles.modalTitle}>Select Available Times</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Text style={styles.closeButtonText}>×</Text>
					</TouchableOpacity>
				</View>
					
					<View style={styles.timeContainer}>
						{/* Start Time */}
						<View style={styles.timeSection}>
							<Text style={styles.timeLabel}>From Time</Text>
							<TouchableOpacity 
								style={styles.timeButton}
								onPress={() => onOpenTimePicker('start')}
							>
								<Text style={styles.timeButtonText}>
									{formatTime(tempStartTime)}
								</Text>
								<Image
									source={require('../../../../assets/icons/down.png')}
									style={styles.dropdownArrow}
								/>
							</TouchableOpacity>
						</View>

						{/* End Time */}
						<View style={styles.timeSection}>
							<Text style={styles.timeLabel}>To Time</Text>
							<TouchableOpacity 
								style={[
									styles.timeButton,
									!tempStartTime && styles.disabledButton
								]}
								onPress={() => {
									if (!tempStartTime) {
										alert('Please select start time first.');
										return;
									}
									onOpenTimePicker('end');
								}}
								disabled={!tempStartTime}
							>
								<Text style={[
									styles.timeButtonText,
									!tempStartTime && styles.disabledText
								]}>
									{formatTime(tempEndTime)}
								</Text>
								<Image
									source={require('../../../../assets/icons/down.png')}
									style={[
										styles.dropdownArrow,
										!tempStartTime && styles.disabledArrow
									]}
								/>
							</TouchableOpacity>
						</View>
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

const TimePickerModal: React.FC<TimePickerModalProps> = ({
	visible,
	time,
	title,
	timePickerType,
	onClose,
	onSave,
}) => {
	const [tempTime, setTempTime] = useState(time);
	const [selectedHour, setSelectedHour] = useState(12);
	const [selectedPeriod, setSelectedPeriod] = useState('PM');

	React.useEffect(() => {
		if (visible && time) {
			setTempTime(time);
			// Parse existing time
			const [hourStr] = time.split(':');
			const hour = parseInt(hourStr);
			if (hour === 0) {
				setSelectedHour(12);
				setSelectedPeriod('AM');
			} else if (hour < 12) {
				setSelectedHour(hour);
				setSelectedPeriod('AM');
			} else if (hour === 12) {
				setSelectedHour(12);
				setSelectedPeriod('PM');
			} else {
				setSelectedHour(hour - 12);
				setSelectedPeriod('PM');
			}
		}
	}, [visible, time]);

	const handleSave = () => {
		// Convert 12-hour to 24-hour format
		let hour24 = selectedHour;
		if (selectedPeriod === 'AM' && selectedHour === 12) {
			hour24 = 0;
		} else if (selectedPeriod === 'PM' && selectedHour !== 12) {
			hour24 = selectedHour + 12;
		}
		const timeString = `${hour24.toString().padStart(2, '0')}:00`;
		onSave(timeString);
	};

	const handleClose = () => {
		onClose();
	};

	if (!visible) {
		console.log('TimePickerModal not visible, returning null');
		return null;
	}

	console.log('TimePickerModal rendering with:', { visible, time, title, timePickerType });

	const hours = Array.from({ length: 12 }, (_, i) => i + 1);
	const periods = ['AM', 'PM'];

	return (
		<View style={styles.timePickerModalOverlay} pointerEvents="box-none">
			<View style={styles.timePickerModalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>{title}</Text>
						<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
							<Text style={styles.closeButtonText}>×</Text>
						</TouchableOpacity>
					</View>
					
					<View style={styles.timePickerWrapper}>
						<View style={styles.customTimePicker}>
							<View style={styles.timeColumn}>
								<Text style={styles.timeColumnTitle}>Hour</Text>
								<ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
									{hours.map((hour) => (
										<TouchableOpacity
											key={hour}
											style={[
												styles.timeOption,
												selectedHour === hour && styles.selectedTimeOption
											]}
											onPress={() => setSelectedHour(hour)}
										>
											<Text style={[
												styles.timeOptionText,
												selectedHour === hour && styles.selectedTimeOptionText
											]}>
												{hour}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
							
							<View style={styles.timeColumn}>
								<Text style={styles.timeColumnTitle}>Period</Text>
								<ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
									{periods.map((period) => (
										<TouchableOpacity
											key={period}
											style={[
												styles.timeOption,
												selectedPeriod === period && styles.selectedTimeOption
											]}
											onPress={() => setSelectedPeriod(period)}
										>
											<Text style={[
												styles.timeOptionText,
												selectedPeriod === period && styles.selectedTimeOptionText
											]}>
												{period}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</View>
					</View>

					<View style={styles.modalButtons}>
						<TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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

export default function MyListingsScreen() {
	const { editId } = useLocalSearchParams<{ editId?: string }>();
	const dispatch = useAppDispatch();
	const { items: listings } = useAppSelector((s) => s.listings);
	const [features, setFeatures] = useState<string[]>(['', '']);
	const [showFeaturesModal, setShowFeaturesModal] = useState<boolean>(false);
	const [additionalServices, setAdditionalServices] = useState<string[]>([]);
	const [showAdditionalServicesModal, setShowAdditionalServicesModal] = useState<boolean>(false);
	const [showCalcAreaModal, setShowCalcAreaModal] = useState<boolean>(false);
	const [calcAreaData, setCalcAreaData] = useState<{ address: string; size: string } | null>(null);
	const [showWeekdaysModal, setShowWeekdaysModal] = useState<boolean>(false);
	const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
	const [showTimePickerModal, setShowTimePickerModal] = useState<boolean>(false);
	const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
	const [showDropdown, setShowDropdown] = useState<string | null>(null);
	const [coverImage, setCoverImage] = useState<string | null>(null);
	const [subImages, setSubImages] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [modalKey, setModalKey] = useState(0);
	const [modalStack, setModalStack] = useState<string[]>([]);
	const [formData, setFormData] = useState({
		title: '',
		price: '',
		country: 'Pakistan',
		city: 'Karachi',
		state: 'Sindh',
		zipCode: '',   // ✅ now consistent
		features: ['', ''],
		description: '',
		aboutOwner: '',
		houseRules: '',
		availableWeekdays: [] as string[],
		availableTimes: {
			startTime: '',
			endTime: '',
		},
	});
	const handleCloseDropdown = () => {
		setShowDropdown(null);
	};
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
	const getDropdownItems = () => {
		switch (showDropdown) {
			case 'country':
				return ['Pakistan', 'India', 'USA'];
			case 'city':
				return ['Karachi', 'Lahore', 'Islamabad'];
			case 'state':
				return ['Sindh', 'Punjab', 'KPK'];
			default:
				return [];
		}
	};
	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const formatTimeDisplay = (time: string) => {
		if (!time) return '';
		const [hours, minutes] = time.split(':');
		const hour = parseInt(hours);
		const ampm = hour >= 12 ? 'PM' : 'AM';
		const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
		return `${displayHour}:00 ${ampm}`;
	};

	const handleOpenDropdown = (type: 'country' | 'city' | 'state') => {
		setShowDropdown(type);
	};

	const pickCoverImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') return;
		
		// Use very low quality for instant upload (KB size)
		const result = await ImagePicker.launchImageLibraryAsync({ 
			mediaTypes: ImagePicker.MediaTypeOptions.Images, 
			quality: 0.1, // Very low quality for instant upload
			base64: false // No need for base64 since we're using Storage
		});
		
		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			
			// Log image size after compression
			if (asset.fileSize) {
				const sizeInKB = (asset.fileSize / 1024).toFixed(2);
				const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(2);
				console.log(`📸 Cover image selected: ${asset.uri}`);
				console.log(`📏 Image size after compression: ${sizeInKB} KB (${sizeInMB} MB)`);
				console.log(`⚡ Quality setting: 10% (instant upload)`);
			} else {
				console.log(`📸 Cover image selected: ${asset.uri} (compressed for instant upload)`);
			}
			
			setCoverImage(asset.uri);
		}
	};

	const pickSubImage = async (slot: number) => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') return;
		
		// Use very low quality for instant upload (KB size)
		const result = await ImagePicker.launchImageLibraryAsync({ 
			mediaTypes: ImagePicker.MediaTypeOptions.Images, 
			quality: 0.1, // Very low quality for instant upload
			base64: false // No need for base64 since we're using Storage
		});
		
		if (!result.canceled && result.assets && result.assets.length > 0) {
			const asset = result.assets[0];
			
			// Log image size after compression
			if (asset.fileSize) {
				const sizeInKB = (asset.fileSize / 1024).toFixed(2);
				const sizeInMB = (asset.fileSize / (1024 * 1024)).toFixed(2);
				console.log(`📸 Sub image ${slot} selected: ${asset.uri}`);
				console.log(`📏 Image size after compression: ${sizeInKB} KB (${sizeInMB} MB)`);
				console.log(`⚡ Quality setting: 10% (instant upload)`);
			} else {
				console.log(`📸 Sub image ${slot} selected: ${asset.uri} (compressed for instant upload)`);
			}
			
			setSubImages(prev => {
				const next = [...prev];
				next[slot] = asset.uri;
				return next;
			});
		}
	};

	const removeCoverImage = () => {
		setCoverImage(null);
	};

	const removeSubImage = (slot: number) => {
		setSubImages(prev => {
			const next = [...prev];
			next[slot] = '';
			return next;
		});
	};

	const handleSelectItem = (item: string) => {
		if (showDropdown) {
			handleInputChange(showDropdown, item);
			setShowDropdown(null);
		}
	};

	const handleOpenTimePicker = (type: 'start' | 'end') => {
		console.log('Opening time picker modal for:', type);
		// Close all other modals first to prevent conflicts
		closeAllModals();
		// Set the type and open the time picker modal after a longer delay
		setTimePickerType(type);
		setTimeout(() => {
			openModal('time-picker');
		}, 800);
		console.log('Time picker modal state set to true');
	};

	const handleTimePickerSave = (time: string) => {
		if (timePickerType === 'start') {
			setFormData(prev => ({
				...prev,
				availableTimes: { ...prev.availableTimes, startTime: time }
			}));
		} else {
			setFormData(prev => ({
				...prev,
				availableTimes: { ...prev.availableTimes, endTime: time }
			}));
		}
		// Close picker first, then reopen time modal
		closeAllModals();
		setTimeout(() => {
			openModal('time-selection');
		}, 800);
	};

	// Function to close all modals
	const closeAllModals = () => {
		setShowFeaturesModal(false);
		setShowAdditionalServicesModal(false);
		setShowCalcAreaModal(false);
		setShowWeekdaysModal(false);
		setShowTimeModal(false);
		setShowTimePickerModal(false);
		setShowDropdown(null);
		setModalStack([]);
		setModalKey(prev => prev + 1); // Force remount of all modals
	};

	// Function to safely open a modal
	const openModal = (modalName: string) => {
		closeAllModals();
		setTimeout(() => {
			setModalStack([modalName]);
			setModalKey(prev => prev + 1);
			
			// Set the specific modal state based on the modal name
			if (modalName === 'features') {
				setShowFeaturesModal(true);
			} else if (modalName === 'services') {
				setShowAdditionalServicesModal(true);
			} else if (modalName === 'calc-area') {
				setShowCalcAreaModal(true);
			} else if (modalName === 'weekdays') {
				setShowWeekdaysModal(true);
			} else if (modalName === 'time-selection') {
				setShowTimeModal(true);
			} else if (modalName === 'time-picker') {
				setShowTimePickerModal(true);
			}
		}, 100);
	};


	// Cleanup modals on unmount and when component loses focus
	React.useEffect(() => {
		return () => {
			// Cleanup all modal states on unmount
			closeAllModals();
		};
	}, []);

	// Additional cleanup when component loses focus
	React.useEffect(() => {
		// Cleanup modals when component becomes inactive
		const handleAppStateChange = (nextAppState: string) => {
			if (nextAppState === 'background' || nextAppState === 'inactive') {
				setShowFeaturesModal(false);
				setShowAdditionalServicesModal(false);
				setShowCalcAreaModal(false);
				setShowWeekdaysModal(false);
				setShowTimeModal(false);
				setShowTimePickerModal(false);
			}
		};

		// Add app state change listener
		const { AppState } = require('react-native');
		const subscription = AppState.addEventListener('change', handleAppStateChange);
		
		return () => {
			subscription?.remove();
		};
	}, []);

	// Prefill when editing
	React.useEffect(() => {
		if (!editId) return;
		const listing = listings.find((l) => l.id === String(editId));
		if (!listing) return;
		setFormData({
			title: listing.title || '',
			price: listing.pricePerHour ? String(listing.pricePerHour) : '',
			country: listing.country || 'Pakistan',
			city: listing.city || 'Karachi',
			state: listing.state || 'Sindh',
			zipCode: listing.zipCode || '',
			features: (listing.features && listing.features.length ? listing.features : ['', '']) as any,
			description: listing.description || '',
			aboutOwner: listing.aboutOwner || '',
			houseRules: (listing.houseRules || []).join('\n'),
			availableWeekdays: listing.availableWeekdays || [],
			availableTimes: listing.availableTimes || { startTime: '', endTime: '' },
		});
		// Prefill UI states as well
		setFeatures(listing.features && listing.features.length ? listing.features : ['', '']);
		setAdditionalServices(listing.additionalServices || []);
		setCoverImage(listing.mainImage && (listing.mainImage.uri || null));
		setSubImages((listing.thumbnails || []).map((t: any) => t.uri).filter(Boolean));
		setCalcAreaData(listing.calculateArea ?? null);
	}, [editId, listings]);

	const handleAddListing = () => {
		// Close all modals first to prevent conflicts
		closeAllModals();
		
		const title = formData.title?.trim();
		const priceVal = Number(formData.price);
		const pricePerHour = Number.isFinite(priceVal) && priceVal > 0 ? priceVal : undefined;
		const location = formData.city || formData.country ? `${formData.city || ''}${formData.city && formData.country ? ', ' : ''}${formData.country || ''}` : undefined;
		// Compute dimensions only if size provided
		const numericSize = Number(calcAreaData?.size || '');
		const dimensions = Number.isFinite(numericSize) && numericSize > 0
			? `${Math.max(0, Math.floor(numericSize - 50))}m - ${Math.floor(numericSize + 50)}m`
			: undefined;
		const prepared: any = {};
		if (title) prepared.title = title;
		if (pricePerHour) prepared.pricePerHour = pricePerHour;
		if (location) prepared.location = location;
		if (dimensions) prepared.dimensions = dimensions;
		if (formData.country) prepared.country = formData.country;
		if (formData.city) prepared.city = formData.city;
		if (formData.state) prepared.state = formData.state;
		if (formData.zipCode) prepared.zipCode = formData.zipCode;
		const nonEmptyFeatures = features.filter(f => f && f.trim().length > 0);
		if (nonEmptyFeatures.length) prepared.features = nonEmptyFeatures;
		if (additionalServices.length) prepared.additionalServices = additionalServices;
		if (formData.description?.trim()) prepared.description = formData.description.trim();
		if (formData.aboutOwner?.trim()) prepared.aboutOwner = formData.aboutOwner.trim();
		if (formData.houseRules) {
			const rules = formData.houseRules.split('\n').map(s => s.trim()).filter(Boolean);
			if (rules.length) prepared.houseRules = rules;
		}
		if (formData.availableWeekdays.length > 0) {
			prepared.availableWeekdays = formData.availableWeekdays;
		}
		if (formData.availableTimes.startTime && formData.availableTimes.endTime) {
			prepared.availableTimes = formData.availableTimes;
		}
		// Prepare image data for upload (don't include in payload yet)
		const mainImageUri = coverImage;
		const thumbnailUris = subImages.filter(Boolean);
		if (calcAreaData) prepared.calculateArea = calcAreaData;
		const payload = prepared;
		
		// Show loader and start saving
		setIsSaving(true);
		
		(async () => {
			try {
				const uid = auth.currentUser?.uid;
				if (!uid) throw new Error('Not authenticated');

				// Get owner name from Firebase
				const nameRef = ref(rtdb, `users/${uid}/fullName`);
				const nameSnapshot = await get(nameRef);
				const ownerName = nameSnapshot.val() || 'Property Owner';
				const ownerEmail = auth.currentUser?.email || '';
				
				console.log('Saving listing with owner info:', {
					uid,
					ownerName,
					ownerEmail,
					authCurrentUser: auth.currentUser?.uid
				});

				// Generate listing ID first (for image paths)
				let listingId = editId;
				if (!listingId) {
					const listRootRef = ref(rtdb, `listings`);
					const newRef = await push(listRootRef);
					listingId = newRef.key as string;
				}

				// Upload images to Firebase Storage
				let imageUrls: {
					mainImageUrl?: string;
					thumbnailUrls?: string[];
				} = {};

				if (mainImageUri || (thumbnailUris && thumbnailUris.length > 0)) {
					console.log('Uploading images to Firebase Storage...');
					imageUrls = await uploadListingImages(listingId, mainImageUri || undefined, thumbnailUris);
					console.log('Images uploaded successfully:', imageUrls);
				}

				// Add owner information and image URLs to payload
				const payloadWithOwnerInfo = {
					...payload,
					ownerId: uid,
					ownerName: ownerName,
					ownerEmail: ownerEmail,
					ownerAvatar: require('../../../../assets/icons/profile.png'), // Default avatar
					// Add image URLs from Firebase Storage (store as strings for reliability)
					...(imageUrls.mainImageUrl && { mainImage: imageUrls.mainImageUrl }),
					...(imageUrls.thumbnailUrls && { thumbnails: imageUrls.thumbnailUrls })
				};

				if (editId) {
					const listingRef = ref(rtdb, `listings/${editId}`);
					const userListingRef = ref(rtdb, `users/${uid}/listings/${editId}`);
					const payloadWithOwner = { id: String(editId), ownerUid: uid, ...payloadWithOwnerInfo } as any;
					await rtdbUpdate(listingRef, payloadWithOwner);
					await rtdbUpdate(userListingRef, payloadWithOwner);
				} else {
					const newRef = ref(rtdb, `listings/${listingId}`);
					const payloadWithOwner = { id: listingId, ownerUid: uid, createdAt: new Date().toISOString(), ...payloadWithOwnerInfo } as any;
					await set(newRef, payloadWithOwner);
					// Store full listing under user's node as well
					await set(ref(rtdb, `users/${uid}/listings/${listingId}`), payloadWithOwner);
				}
				
				// Success - navigate back to home screen
				router.replace('/(owner-app)/(main-app)/home');
			} catch (e) {
				console.error('Error saving listing:', e);
				// Don't show alert, just log the error
				console.log('Listing save failed, but continuing...');
			} finally {
				// Hide loader
				setIsSaving(false);
			}
		})();
	};

	// Validation: require cover image, at least 1 thumbnail, title, price (>0), at least 2 features, calculated area (address + size), description, at least 1 weekday, and time selection
	const hasCover = Boolean(coverImage);
	const hasThumb = subImages.some(Boolean);
	const hasTitle = formData.title.trim().length > 0;
	const hasPrice = Number(formData.price) > 0;
	const hasTwoFeatures = features.filter(f => f && f.trim().length > 0).length >= 2;
	const hasCalc = Boolean(calcAreaData?.address) && Boolean(calcAreaData?.size);
	const hasDescription = formData.description.trim().length > 0;
	const hasWeekdays = formData.availableWeekdays.length > 0;
	const hasTimes = formData.availableTimes.startTime && formData.availableTimes.endTime;
	const formValid = hasCover && hasThumb && hasTitle && hasPrice && hasTwoFeatures && hasCalc && hasDescription && hasWeekdays && hasTimes;

	// Debug validation
	console.log('Form Validation Debug:', {
		hasCover,
		hasThumb,
		hasTitle,
		hasPrice,
		hasTwoFeatures,
		hasCalc,
		hasDescription,
		hasWeekdays,
		hasTimes,
		formValid,
		coverImage: !!coverImage,
		subImages: subImages,
		title: formData.title,
		price: formData.price,
		features: features,
		calcAreaData: calcAreaData,
		description: formData.description,
		availableWeekdays: formData.availableWeekdays,
		availableTimes: formData.availableTimes
	});

	return (
		<View style={styles.container}>
			<GradientBackground />

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}
			>

				<View style={styles.headerSpacer} />
				<View style={{ paddingBottom: 40, backgroundColor: '#00000033', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
					<View style={{
						flexDirection: 'row', paddingHorizontal: 24,
						alignItems: 'center',
					}}>
						<TouchableOpacity onPress={() => router.back()}>
							<Image source={Icons.back} style={styles.uploadArrow} />
						</TouchableOpacity>
						<Text style={styles.title}>Add New Listing</Text>
					</View>
					{/* Upload Area */}
					<View style={styles.uploadContainer}>
						<TouchableOpacity style={styles.uploadDashed} onPress={pickCoverImage}>
							{coverImage ? (
								<View style={{ position: 'relative', width: '100%', height: '100%' }}>
									<Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
									<TouchableOpacity 
										style={styles.removeButton} 
										onPress={removeCoverImage}
									>
										<Text style={styles.removeButtonText}>×</Text>
									</TouchableOpacity>
								</View>
							) : (
								<>
									<Image source={require('@/assets/icons/upload1.png')} style={styles.uploadArrow} />
									<Text style={styles.browseFiles}>Browse Files <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
									<Text style={styles.uploadHint}>(should not be more than 12mb)</Text>
								</>
							)}
						</TouchableOpacity>
						{/* Sub images required hint */}
						<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 6, paddingHorizontal: 2 }}>
							<Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12 }}>Add at least one sub image</Text>
							<Text style={{ color: '#FF6B6B', marginLeft: 4 }}>*</Text>
						</View>
						<View style={styles.uploadThumbRow}>
							{[0, 1, 2, 3].map((i) => (
								<TouchableOpacity key={i} style={styles.thumbBox} onPress={() => pickSubImage(i)}>
									{Boolean(subImages[i]) ? (
										<View style={{ position: 'relative', width: '100%', height: '100%' }}>
											<Image source={{ uri: subImages[i] }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
											<TouchableOpacity 
												style={styles.removeButtonSmall} 
												onPress={() => removeSubImage(i)}
											>
												<Text style={styles.removeButtonTextSmall}>×</Text>
											</TouchableOpacity>
										</View>
									) : (
										<Text style={styles.plus}>+</Text>
									)}
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

				{/* Title */}
				<View style={{ marginTop: 28 }} />
				<Text style={styles.label}>Title <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				<TextInput placeholder="My Backyard" placeholderTextColor={'#FFFFFF4D'} style={styles.input} value={formData.title} onChangeText={(t) => handleInputChange('title', t)} />

				{/* Price */}
				<View style={{ marginTop: 10 }} />
				<Text style={styles.label}>Price in $ <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				<View style={styles.inputRow}>
					<TextInput placeholder="100" placeholderTextColor={'#FFFFFF4D'} style={{ width: '90%', color: 'white' }} value={formData.price} onChangeText={(t) => handleInputChange('price', t.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
					<Text style={{ color: 'rgba(255,255,255,0.5)' }}>/hour</Text>
				</View>

				<View style={styles.featuresHeaderRow}>
					<Text style={styles.featuresLabel}>Features <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
					<TouchableOpacity style={styles.addPill} onPress={() => {
						openModal('features');
					}}><Text style={styles.addPillText}>Add +</Text></TouchableOpacity>
				</View>

				{features.map((_, idx) => (
					<View key={idx} style={styles.featureRow}>
						<View style={styles.radio} />
						<TextInput
							editable={false}
							placeholder={`Feature ${idx + 1}`}
							placeholderTextColor={'#FFFFFF4D'}
							style={[styles.featureInput]}
							value={features[idx]}
							onChangeText={(text) => {
								const next = [...features];
								next[idx] = text;
								setFeatures(next);

							}}
						/>
					</View>
				))}

				{/* Calculate Area */}
				<View style={{ marginTop: 28 }} />
				<Text style={styles.label}>Calculate Area <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				{calcAreaData && (
					<View style={{ marginHorizontal: 24, marginBottom: 10, backgroundColor: '#202857', borderRadius: 19, padding: 16 }}>
						<Text style={{ color: '#FFFFFF', opacity: 0.85, fontWeight: '900' }}>Address: {calcAreaData.address}</Text>
						<Text style={{ color: '#FFFFFF', opacity: 0.85, marginTop: 4 }}>Size: {calcAreaData.size} sq.ft</Text>
					</View>
				)}
				<TouchableOpacity activeOpacity={0.8} onPress={() => {
					openModal('calc-area');
				}}>
					<View style={styles.calcButton}>
						<Text style={styles.calcButtonText}>Calculate Now</Text>
					</View>
				</TouchableOpacity>

				<View style={{ marginTop: 18 }} />

				{/* Description */}
				<Text style={styles.label}>Description <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				<TextInput style={[styles.input, styles.multiline]} placeholder="Add a description..." placeholderTextColor={'#FFFFFF4D'} multiline value={formData.description} onChangeText={(t) => handleInputChange('description', t)} />

				{/* Available Weekdays */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>Available Days <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				<TouchableOpacity 
					style={styles.weekdaysButton} 
					onPress={() => {
						openModal('weekdays');
					}}
					activeOpacity={0.8}
				>
					<Text style={styles.weekdaysButtonText}>
						{formData.availableWeekdays.length > 0 
							? `${formData.availableWeekdays.length} day(s) selected`
							: 'Select available days'
						}
					</Text>
					<Image
						source={require('../../../../assets/icons/down.png')}
						style={styles.dropdownArrow}
					/>
				</TouchableOpacity>
				
				{/* Display selected weekdays */}
				{formData.availableWeekdays.length > 0 && (
					<View style={styles.selectedWeekdaysContainer}>
						{formData.availableWeekdays.map((day, index) => (
							<View key={day} style={styles.selectedWeekdayPill}>
								<Text style={styles.selectedWeekdayText}>{day}</Text>
							</View>
						))}
					</View>
				)}

				{/* Available Times */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>Available Times <Text style={{ color: '#FF6B6B' }}>*</Text></Text>
				<TouchableOpacity 
					style={styles.timeSelectionButton} 
					onPress={() => {
						openModal('time-selection');
					}}
					activeOpacity={0.8}
				>
					<Text style={styles.timeSelectionButtonText}>
						{formData.availableTimes.startTime && formData.availableTimes.endTime
							? `${formatTimeDisplay(formData.availableTimes.startTime)} - ${formatTimeDisplay(formData.availableTimes.endTime)}`
							: 'Select available times'
						}
					</Text>
					<Image
						source={require('../../../../assets/icons/down.png')}
						style={styles.dropdownArrow}
					/>
				</TouchableOpacity>

				{/* Country/City */}
				<View style={{ marginTop: 18 }} />
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

				{/* Dropdown Modal (simplified without BlurView) */}
				{showDropdown !== null && (
					<Modal
						key={`dropdown-${modalKey}`}
						transparent={true}
						visible={showDropdown !== null}
						animationType="fade"
						onRequestClose={handleCloseDropdown}
					>
						<TouchableOpacity
							style={styles.dropdownModalOverlay}
							activeOpacity={1}
							onPress={handleCloseDropdown}
						>
							<View style={styles.dropdownContainer}>
								<Text style={styles.dropdownTitle}>{getDropdownTitle()}</Text>
								<ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
									{getDropdownItems().map((item, index) => (
										<TouchableOpacity
											key={item}
											style={[
												styles.dropdownItem,
												index === getDropdownItems().length - 1 && styles.lastDropdownItem
											]}
											onPress={() => handleSelectItem(item)}
										>
											<Text style={styles.dropdownItemText}>{item}</Text>
											{(showDropdown === 'country' ? formData.country : showDropdown === 'city' ? formData.city : showDropdown === 'state' ? formData.state : '') === item && (
												<View style={styles.checkCircle}>
													<View style={styles.checkmark} />
												</View>
											)}
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</TouchableOpacity>
					</Modal>
				)}
				{/* About Owner */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>About the Owner</Text>
				<TextInput style={[styles.input, styles.multiline]} placeholder="Write here..." placeholderTextColor={'rgba(255,255,255,0.5)'} multiline value={formData.aboutOwner} onChangeText={(t) => handleInputChange('aboutOwner', t)} />

				{/* House Rules */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>House Rules</Text>
				<TextInput style={[styles.input, styles.multiline]} placeholder="Write here..." placeholderTextColor={'rgba(255,255,255,0.5)'} multiline value={formData.houseRules} onChangeText={(t) => handleInputChange('houseRules', t)} />

				{/* Safety & Cancellation Policy */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>Safety & Cancellation Policy</Text>
				<TextInput style={[styles.input, styles.multiline]} placeholder="Write here..." placeholderTextColor={'rgba(255,255,255,0.5)'} multiline />

				{/* Additional Services */}
				<View style={{ marginTop: 18 }} />
				<Text style={styles.label}>Additional Services</Text>
				{additionalServices.map((service, idx) => (
					<View key={`service-${idx}`} style={styles.featureRow}>
						<TextInput
							editable={false}
							placeholder={`Service ${idx + 1}`}
							placeholderTextColor={'#FFFFFF4D'}
							style={[styles.additionalInput]}
							value={service}
						/>
					</View>
				))}
				{additionalServices.length > 0 && <View style={{ marginBottom: 20 }} />}

				<TouchableOpacity activeOpacity={0.8} onPress={() => {
					openModal('services');
				}}>
					<View style={styles.addServicesButton}>
						<Text style={styles.addServicesButtonText}>Add +</Text>
					</View>
				</TouchableOpacity>

				{/* Add Listing CTA */}
				<View style={{ height: 12 }} />
				<TouchableOpacity activeOpacity={0.8} onPress={handleAddListing} disabled={!formValid || isSaving}>
					<LinearGradient colors={["#AF70AF", "#2E225C", "#AF70AF"]} start={{ x: 0.5257, y: -1.1167 }} end={{ x: 0.5257, y: 1 }} style={[styles.submitButton, { opacity: (formValid && !isSaving) ? 1 : 0.5 }]}>
						<Text style={styles.submitText}>{editId ? 'Update Listing' : 'Add Listing'}</Text>
					</LinearGradient>
				</TouchableOpacity>
			</ScrollView>

			{/* Modals */}
			{modalStack[0] === 'features' && showFeaturesModal && (
				<FeaturesModal
					visible={true}
					features={features}
					onClose={() => {
						closeAllModals();
					}}
					onSave={(list) => {
						setFeatures(list);
						setTimeout(() => {
							closeAllModals();
						}, 100);
					}}
				/>
			)}
			
			{modalStack[0] === 'services' && showAdditionalServicesModal && (
				<AdditionalServicesModal
					visible={true}
					services={additionalServices}
					onClose={() => {
						closeAllModals();
					}}
					onSave={(list) => {
						setAdditionalServices(list);
						setTimeout(() => {
							closeAllModals();
						}, 100);
					}}
				/>
			)}
			
			{modalStack[0] === 'calc-area' && showCalcAreaModal && (
				<CalculateAreaModal
					visible={true}
					data={calcAreaData}
					onClose={() => {
						closeAllModals();
					}}
					onSave={(d) => {
						setCalcAreaData(d);
						setTimeout(() => {
							closeAllModals();
						}, 100);
					}}
				/>
			)}
			
			{modalStack[0] === 'weekdays' && showWeekdaysModal && (
				<WeekdaysSelectionModal
					visible={true}
					selectedWeekdays={formData.availableWeekdays}
					onClose={() => {
						closeAllModals();
					}}
					onSave={(weekdays) => {
						setFormData(prev => ({ ...prev, availableWeekdays: weekdays }));
						setTimeout(() => {
							closeAllModals();
						}, 100);
					}}
				/>
			)}
			
			{modalStack[0] === 'time-selection' && showTimeModal && (
				<TimeSelectionModal
					visible={true}
					startTime={formData.availableTimes.startTime}
					endTime={formData.availableTimes.endTime}
					onClose={() => {
						closeAllModals();
					}}
					onSave={(startTime, endTime) => {
						setFormData(prev => ({ 
							...prev, 
							availableTimes: { startTime, endTime } 
						}));
						setTimeout(() => {
							closeAllModals();
						}, 100);
					}}
					onOpenTimePicker={handleOpenTimePicker}
				/>
			)}
			
			{modalStack[0] === 'time-picker' && showTimePickerModal && (
				<TimePickerModal
					visible={true}
					time={timePickerType === 'start' ? formData.availableTimes.startTime : formData.availableTimes.endTime}
					title={timePickerType === 'start' ? 'Select Start Time' : 'Select End Time'}
					timePickerType={timePickerType}
					onClose={() => {
						console.log('TimePickerModal onClose called');
						closeAllModals();
						// Reopen the time selection modal after a delay
						setTimeout(() => {
							openModal('time-selection');
						}, 800);
					}}
					onSave={(time) => {
						console.log('TimePickerModal onSave called with time:', time);
						handleTimePickerSave(time);
					}}
				/>
			)}
			
			{/* Centered Loader Overlay */}
			{isSaving && (
				<View style={styles.loaderOverlay}>
					<View style={styles.loaderContainer}>
						<LoadingIndicator size="large" color="#FFFFFF" />
						<Text style={styles.loaderText}>Saving your listing...</Text>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	inputText: {
		color: 'white',
		fontSize: 20,
		flex: 1,
	},
	inputContainer: {
		height: 70,
		backgroundColor: '#202857',
		borderRadius: 19,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	formRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingHorizontal: 24
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
		backgroundColor: '#202857',
		borderRadius: 19,
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
	container: {
		flex: 1,
		paddingTop: 16,
	},
	headerSpacer: {
		height: 30,
		backgroundColor: '#00000033',
	},
	title: {
		position: 'absolute',
		left: '30%',
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '600',
		marginLeft: 24,
		marginBottom: 16,
	},
	uploadContainer: {
		paddingHorizontal: 24,
	},
	uploadDashed: {
		borderWidth: 1,
		borderRadius: 12,
		borderStyle: 'dashed',
		borderColor: '#FFFFFF',
		height: 170,
		alignItems: 'center',
		justifyContent: 'center',
	},
	uploadArrow: {
		width: 40,
		height: 50,
		marginBottom: 30,
		resizeMode: 'contain',
		top: 10,
	},
	browseFiles: {
		color: '#FFFFFF',
		fontSize: 14,
		marginBottom: 2,
	},
	uploadHint: {
		color: 'rgba(255,255,255,0.5)',
		fontSize: 10,
	},
	uploadThumbRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 16,
	},
	thumbBox: {
		width: (width - 48 - 24) / 4,
		height: 52,
		borderRadius: 10,
		borderWidth: 1,
		borderStyle: 'dashed',
		backgroundColor: '#00000033',
		borderColor: 'rgba(255,255,255,0.4)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	plus: {
		color: '#FFFFFF',
		fontSize: 22,
		opacity: 0.6,
	},
	label: {
		color: '#FFFFFF',
		fontSize: 14,
		marginBottom: 8,
		paddingHorizontal: 24,
		fontWeight: '500',
		marginLeft: 15
	},
	// New style specifically for the features label
	featuresLabel: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 15
	},
	input: {
		height: 60,
		borderRadius: 19,
		backgroundColor: '#202857',
		color: '#FFFFFF',
		paddingHorizontal: 16,
		marginHorizontal: 24,
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 60,
		borderRadius: 19,
		justifyContent: 'space-between',
		backgroundColor: '#202857',
		color: '#FFFFFF',
		marginHorizontal: 24,
		paddingHorizontal: 12,
	},
	inputRowLeft: {
		marginHorizontal: 0,
	},
	inputRight: {
		width: 104,
		marginLeft: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	inputRightText: {
		color: 'rgba(255,255,255,0.7)'
	},
	// Fixed featuresHeaderRow - properly aligned now!
	featuresHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 18,
		paddingHorizontal: 24, // Added this for proper alignment
		// Removed borderWidth: 1 that was causing alignment issues
	},
	addPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#A6E66E',
		borderRadius: 8,
	},
	addPillText: {
		color: '#1D234B',
		fontWeight: '700'
	},
	featureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 24,
		marginTop: 12,
	},
	featureInput: {
		flex: 1,
		marginLeft: 12,
		backgroundColor: '#202857',
		borderRadius: 19,
		height: 60,
		color: '#FFFFFF',
		paddingHorizontal: 16,
	},
	additionalInput: {
		flex: 1,
		backgroundColor: '#202857',
		borderRadius: 19,
		height: 60,
		color: '#FFFFFF',
		paddingHorizontal: 16,
	},
	radio: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: '#202857',
		borderWidth: 2,
		borderColor: '#293162'
	},
	calcButton: {
		height: 56,
		borderRadius: 12,
		backgroundColor: '#BADA8B',
		marginHorizontal: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	calcButtonText: {
		color: '#1D234B',
		fontWeight: '700'
	},
	multiline: {
		height: 126,
		paddingTop: 14,
		textAlignVertical: 'top'
	},
	twoColRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
	},
	col: {
		flex: 1,
		marginHorizontal: 0,
	},
	addServicesButton: {
		height: 56,
		borderRadius: 12,
		backgroundColor: '#A6E66E',
		marginHorizontal: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addServicesButtonText: {
		color: '#1D234B',
		fontWeight: '700'
	},
	submitButton: {
		height: 56,
		borderRadius: 12,
		marginHorizontal: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	submitText: {
		color: '#FFFFFF',
		fontWeight: '700'
	},
	loaderOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)', // Light grey overlay
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000,
	},
	loaderContainer: {
		paddingHorizontal: Math.min(width * 0.08, 32),
		paddingVertical: Math.min(Dimensions.get('window').height * 0.03, 24),
		borderRadius: 12,
		alignItems: 'center',
		minWidth: Math.min(width * 0.6, 200),
	},
	loaderText: {
		color: '#FFFFFF',
		fontSize: Math.min(width * 0.045, 18),
		fontFamily: 'System',
		marginTop: Math.min(Dimensions.get('window').height * 0.015, 12),
		fontWeight: '500',
	},
	removeButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10,
	},
	removeButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: 'bold',
		lineHeight: 16,
	},
	removeButtonSmall: {
		position: 'absolute',
		top: 4,
		right: 4,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10,
	},
	removeButtonTextSmall: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: 'bold',
		lineHeight: 12,
	},
	// Weekdays Modal Styles
	modalOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#00000033',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		zIndex: 1000,
		elevation: 1000, // For Android
	},
	modalContainer: {
		backgroundColor: '#1D234B',
		borderRadius: 20,
		padding: 20,
		width: '100%',
		maxWidth: 400,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	modalTitle: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '600',
	},
	closeButton: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#202857',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: 'bold',
	},
	weekdaysContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	sundayContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: 10,
	},
	sundayButton: {
		width: '30%',
		height: 50,
		backgroundColor: '#202857',
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'transparent',
	},
	weekdayButton: {
		width: '30%',
		height: 50,
		backgroundColor: '#202857',
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	weekdayButtonSelected: {
		backgroundColor: '#A6E66E',
		borderColor: '#A6E66E',
	},
	weekdayButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '500',
	},
	weekdayButtonTextSelected: {
		color: '#1D234B',
		fontWeight: '600',
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		height: 50,
		backgroundColor: '#202857',
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cancelButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '500',
	},
	saveButton: {
		flex: 1,
		height: 50,
		backgroundColor: '#A6E66E',
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	saveButtonText: {
		color: '#1D234B',
		fontSize: 16,
		fontWeight: '600',
	},
	// Weekdays Selection UI Styles
	weekdaysButton: {
		height: 60,
		borderRadius: 19,
		backgroundColor: '#202857',
		marginHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	weekdaysButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	selectedWeekdaysContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: 24,
		marginTop: 12,
		gap: 8,
	},
	selectedWeekdayPill: {
		backgroundColor: '#A6E66E',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	selectedWeekdayText: {
		color: '#1D234B',
		fontSize: 14,
		fontWeight: '500',
	},
	// Time Selection Styles
	timeSelectionButton: {
		height: 60,
		borderRadius: 19,
		backgroundColor: '#202857',
		marginHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	timeSelectionButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	timeContainer: {
		marginBottom: 20,
	},
	timeSection: {
		marginBottom: 16,
	},
	timeLabel: {
		color: '#FFFFFF',
		fontSize: 14,
		marginBottom: 8,
		fontWeight: '500',
	},
	timeButton: {
		height: 50,
		backgroundColor: '#202857',
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	timeButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
	},
	timePickerContainer: {
		backgroundColor: '#1D234B',
		borderRadius: 12,
		marginTop: 10,
		padding: 10,
	},
	// Disabled state styles
	disabledButton: {
		opacity: 0.5,
		backgroundColor: '#1a1a1a',
	},
	disabledText: {
		color: '#666666',
	},
	disabledArrow: {
		tintColor: '#666666',
	},
	helpText: {
		color: '#FFFFFF',
		fontSize: 12,
		opacity: 0.7,
		textAlign: 'center',
		marginVertical: 10,
		fontStyle: 'italic',
	},
	// Custom Time Picker Styles
	customTimePicker: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		paddingVertical: 20,
	},
	timeColumn: {
		flex: 1,
		alignItems: 'center',
	},
	timeColumnTitle: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 15,
	},
	timeScrollView: {
		maxHeight: 200,
		width: '100%',
	},
	timeOption: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		marginVertical: 2,
		borderRadius: 8,
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	selectedTimeOption: {
		backgroundColor: '#A6E66E',
	},
	timeOptionText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '500',
	},
	selectedTimeOptionText: {
		color: '#000000',
		fontWeight: 'bold',
	},
	// Simplified Dropdown Styles
	dropdownModalOverlay: {
		flex: 1,
		backgroundColor: '#00000033',
		justifyContent: 'center',
		alignItems: 'center',
	},
	dropdownContainer: {
		width: width - 60,
		backgroundColor: 'rgba(35, 44, 96, 0.95)',
		borderRadius: 20,
		paddingVertical: 16,
		paddingHorizontal: 8,
		maxHeight: 400,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	dropdownTitle: {
		color: 'white',
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	dropdownScrollView: {
		maxHeight: 300,
	},
	dropdownItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 20,
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
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#46B649',
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkmark: {
		width: 12,
		height: 6,
		borderLeftWidth: 2,
		borderBottomWidth: 2,
		borderColor: 'white',
		transform: [{ rotate: '-45deg' }],
	},
	// Time Picker Modal Styles
	timePickerModalOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#00000033',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		zIndex: 1000,
		elevation: 1000,
	},
	timePickerModalContainer: {
		backgroundColor: '#1D234B',
		borderRadius: 20,
		padding: 20,
		width: '100%',
		maxWidth: 400,
		alignItems: 'center',
		zIndex: 10000,
		elevation: 10000, // For Android
	},
	timePickerWrapper: {
		backgroundColor: '#202857',
		borderRadius: 12,
		padding: 20,
		marginVertical: 20,
		width: '100%',
		alignItems: 'center',
	},
});