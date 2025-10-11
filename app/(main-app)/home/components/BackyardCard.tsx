import React from 'react';
import { Image, Text, TouchableOpacity, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { Icons } from '../../../../constants/icons';
import { BackyardCardProps } from '../types';
import { useAuth } from '../../../lib/hooks/useAuth';
import { capitalizeFirstLetter } from '../../../lib/utils/textUtils';

export function BackyardCard({ imageSource, name, location, distance, dimensions, price, styles, listingId, onPress, onImageLoad, onImageError }: BackyardCardProps & { styles: any; onImageLoad?: (uri: string) => void; onImageError?: (uri: string) => void }) {
  const { user } = useAuth();
  const isAdmin = user?.type === 'owner' || false;

  const handleCardPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push('/(main-app)/backyard-details');
  };

  const handleEdit = () => {
    Alert.alert('Edit', `Edit ${name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => console.log('Edit pressed for:', name) }
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete pressed for:', name) }
    ]);
  };

  return (

    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.8}>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ padding: 15, backgroundColor: '#00000033', borderRadius: 10 }}>
          <Image source={imageSource} style={styles.cardImage} />

          {/* Price tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{price}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.cardTitle}>{capitalizeFirstLetter(name)}</Text>
                <View style={styles.distanceContainer}>
                  <Image source={require('../../../../assets/icons/loc.png')} style={styles.distanceIcon} />
                  <Text style={styles.distanceText}>{distance}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.locationRow}>
                  <Image source={Icons.pin} style={styles.locationIcon} />
                  <Text style={styles.locationText}>{location}</Text>
                </View>

                <View style={styles.dimensionsContainer}>
                  <Image source={require('../../../../assets/icons/icDis.png')} style={styles.dimensionsIcon} />
                  <Text style={styles.dimensionsText}>{dimensions}</Text>
                </View>
              </View>


            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
} 