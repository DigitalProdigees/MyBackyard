import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { BackyardCardProps } from "../types";
import { router } from "expo-router";
import { useAuth } from "@/app/lib/hooks/useAuth";
import { Icons } from "@/constants/icons";
import { CustomAlert } from "@/app/components/dialogs/CustomAlert";
import { capitalizeFirstLetter } from "@/app/lib/utils/textUtils";

export function BackyardCard({
  imageSource,
  name,
  location,
  distance,
  dimensions,
  price,
  onDelete,
  styles,
  listingId,
  onPress,
  thumbnails,
  onImageLoad,
  onImageError,
}: BackyardCardProps & { styles: any; onImageLoad?: (uri: string) => void; onImageError?: (uri: string) => void }) {
  const { user } = useAuth();
  const isAdmin = user?.type === 'owner' || false;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCardPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push("/(owner-app)/(main-app)/backyard-details");
  };

  const handleEdit = () => {
    router.push({
      pathname: "/(owner-app)/(main-app)/my-listings",
      params: listingId ? { editId: listingId } : undefined,
    } as any);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.9}>
      <View style={{ paddingHorizontal: 16 }}>
        <View
          style={{
            padding: 15,
            backgroundColor: "#00000033",
            borderRadius: 10,
          }}
        >
          <View>
            <Image 
              source={imageSource} 
              style={styles.cardImage}
              onLoad={() => {
                const imageUri = imageSource?.uri || (typeof imageSource === 'number' ? `local_${imageSource}` : 'fallback');
                onImageLoad?.(imageUri);
              }}
              onError={() => {
                const imageUri = imageSource?.uri || (typeof imageSource === 'number' ? `local_${imageSource}` : 'fallback');
                onImageError?.(imageUri);
              }}
            />
            {/* Thumbnails strip overlay (bottom) */}
            {thumbnails && thumbnails.length > 0 && (
              <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row' }}>

              </View>
            )}
          </View>

          {/* Price tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{price}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.cardTitle}>{capitalizeFirstLetter(name)}</Text>
                <View style={styles.distanceContainer}>
                  <Image
                    source={require("../../../../../assets/icons/loc.png")}
                    style={styles.distanceIcon}
                  />
                  <Text style={styles.distanceText}>{distance}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.locationRow}>
                  <Image source={Icons.pin} style={styles.locationIcon} />
                  <Text style={styles.locationText}>{location}</Text>
                </View>

                <View style={styles.dimensionsContainer}>
                  <Image
                    source={require("../../../../../assets/icons/icDis.png")}
                    style={styles.dimensionsIcon}
                  />
                  <Text style={styles.dimensionsText}>{dimensions}</Text>
                </View>
              </View>

              {/* Admin Controls */}
              <>
                <View style={styles.adminSeparator} />
                <View style={styles.adminControls}>
                  <TouchableOpacity
                    style={styles.adminButton}
                    onPress={handleEdit}
                  >
                    <Text style={styles.adminButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.buttonSeparator} />
                  <TouchableOpacity
                    style={[styles.adminButton, styles.deleteButton]}
                    onPress={handleDelete}
                  >
                    <Text
                      style={[styles.adminButtonText, styles.deleteButtonText]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            </View>
          </View>
        </View>
      </View>

      {/* Delete Confirmation Dialog */}
      <CustomAlert
        visible={showDeleteDialog}
        title={"Are you sure you want\ndelete the listing?"}
        buttons={[
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              if (onDelete) {
                onDelete(); // tell parent to delete
              }
              setShowDeleteDialog(false);
            },
          },
          { text: "Cancel", style: "cancel" },
        ]}
        onClose={() => setShowDeleteDialog(false)}
      />
    </TouchableOpacity>
  );
}
