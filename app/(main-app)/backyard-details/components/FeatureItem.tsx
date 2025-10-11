import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface FeatureItemProps {
  icon?: string;
  iconSource?: any; // For image icons from assets
  feature: string;
  description?: string;
}

export function FeatureItem({ icon = '🍴', iconSource, feature, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      {iconSource ? (
        <Image source={iconSource} style={styles.featureIconImage} />
      ) : (
        <Text style={styles.featureIcon}>{icon}</Text>
      )}
      <View style={styles.featureContent}>
        <Text style={styles.featureText}>{feature}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featureItem: {
    flexDirection: 'row',
    paddingVertical: 5,
    width: '48%', // Take up roughly half the width
    minWidth: 150,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  featureIconImage: {
    width: 18,
    height: 18,
    marginRight: 6,
    marginTop: 2,
    tintColor: 'white', // Makes the icon white to match the theme
  },
  featureContent: {
    flex: 1,
  },
  featureText: {
    color: '#FFFFFF99',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
}); 