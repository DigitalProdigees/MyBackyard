import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../components/GradientBackground';
import { Header } from '../../components/Header';
import { Icons } from '../../../constants/icons';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/app/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface PaymentHistoryItem {
  bookingId: string;
  ownerName: string;
  renterEmail: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  createdAt: number;
  listingId: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const functions = getFunctions();
      const getPaymentHistory = httpsCallable(functions, 'getPaymentHistory');
      
      const result = await getPaymentHistory({});
      const data = result.data as any;
      
      if (data.success) {
        setPayments(data.paymentHistory);
      } else {
        setError('Failed to fetch payment history');
      }
    } catch (error) {
      console.log('Error fetching payment history:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalRevenue = () => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <GradientBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A6E66E" />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      
      <Header
        customLeftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        }
        customCenterComponent={
          <Text style={styles.headerTitle}>Payment History</Text>
        }
        customRightComponent={
          <TouchableOpacity onPress={fetchPaymentHistory}>
            <Text style={styles.refreshButton}>Refresh</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Revenue</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(calculateTotalRevenue())}
          </Text>
          <Text style={styles.summarySubtitle}>
            {payments.length} successful payments
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPaymentHistory}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payments found</Text>
            <Text style={styles.emptySubtext}>Payments will appear here once users complete bookings</Text>
          </View>
        ) : (
          payments.map((payment) => (
            <View key={payment.bookingId} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(payment.amount, payment.currency)}
                </Text>
                <Text style={styles.paymentDate}>
                  {formatDate(payment.createdAt)}
                </Text>
              </View>
              
              <View style={styles.paymentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Owner:</Text>
                  <Text style={styles.detailValue}>{payment.ownerName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Renter:</Text>
                  <Text style={styles.detailValue}>{payment.renterEmail}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment ID:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {payment.paymentIntentId}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Booking ID:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {payment.bookingId}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    color: '#A6E66E',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryAmount: {
    color: '#A6E66E',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentAmount: {
    color: '#A6E66E',
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  paymentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
});
