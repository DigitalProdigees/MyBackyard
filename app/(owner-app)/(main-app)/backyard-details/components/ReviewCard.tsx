import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Review } from '../types';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  // Render stars based on rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i < rating ? '★' : '☆'}
        </Text>
      );
    }
    return (
      <View style={styles.starsContainer}>
        {stars}
      </View>
    );
  };

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Image source={review.avatar} style={styles.reviewAvatar} />
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewerName}>{review.name}</Text>
          {renderStars(review.rating)}
          <Text style={styles.reviewText}>{review.review}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  reviewItem: {
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'contain',
    marginRight: 12,
    alignSelf: 'flex-start'
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    color: '#FFD700',
    fontSize: 20,
    marginRight: 2,
  },
  reviewText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
}); 