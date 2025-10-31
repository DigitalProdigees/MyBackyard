import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GradientBackground } from '../../../components/GradientBackground';
import { auth, rtdb } from '../../../lib/firebase';
import { ref, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

interface EarningsData {
  bookingId: string;
  renterName: string;
  renterEmail: string;
  listingTitle: string;
  amount: number;
  currency: string;
  status: 'pending' | 'ready_for_payout' | 'completed' | 'failed';
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: number;
  paymentDate?: number;
  payoutDate?: number;
  platformFee: number;
  netAmount: number;
  paymentIntentId?: string;
  isWithdrawing?: boolean;
}

export default function MyEarnings() {
  const [earnings, setEarnings] = useState<EarningsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [completedEarnings, setCompletedEarnings] = useState(0);
  const [readyForPayoutEarnings, setReadyForPayoutEarnings] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [accountBalance, setAccountBalance] = useState(0);



  // Load account balance
  const loadAccountBalance = useCallback(async () => {
    try {
      const functions = getFunctions();
      const getBalance = httpsCallable(functions, 'getAccountBalance');
      
      const result = await getBalance({});
      const data = result.data as any;
      
      if (data.success) {
        setAccountBalance(data.availableBalance);
      }
    } catch (error) {
      console.log('Error loading account balance:', error);
    }
  }, []);

  // Load earnings data from Stripe
  const loadEarnings = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log('Loading earnings from Stripe for user:', user.uid);
      
      // Call Firebase function to get payment history from Stripe
      const functions = getFunctions();
      const getPaymentHistory = httpsCallable(functions, 'getPaymentHistory');
      
      console.log('Calling getPaymentHistory function...');
      const result = await getPaymentHistory({});
      const data = result.data as any;
      
      console.log('Payment history response:', data);
      console.log('Response success:', data.success);
      console.log('Payment history length:', data.paymentHistory?.length || 0);
      
      if (data.success && data.paymentHistory) {
        const earningsList: EarningsData[] = data.paymentHistory.map((payment: any) => {
          const platformFee = payment.amount * 0.1; // 10% platform fee
          const netAmount = payment.amount - platformFee;
          
          // Determine status based on payout status
          let status: 'pending' | 'ready_for_payout' | 'completed' | 'failed' = 'pending';
          if (payment.payoutStatus === 'completed') {
            status = 'completed';
          } else if (payment.payoutStatus === 'ready_for_payout') {
            status = 'ready_for_payout';
          } else if (payment.payoutStatus === 'failed') {
            status = 'failed';
          }
          
          return {
            bookingId: payment.bookingId || payment.paymentIntentId,
            renterName: payment.renterName || 'Unknown Renter',
            renterEmail: payment.renterEmail || '',
            listingTitle: payment.listingTitle || 'Unknown Listing',
            amount: payment.amount || 0,
            currency: payment.currency || 'USD',
            status,
            paymentStatus: 'completed',
            createdAt: payment.createdAt || Date.now(),
            paymentDate: payment.createdAt,
            payoutDate: payment.payoutDate,
            platformFee,
            netAmount,
            paymentIntentId: payment.paymentIntentId,
            isWithdrawing: false
          };
        });
        
        // Sort by creation date (newest first)
        earningsList.sort((a, b) => b.createdAt - a.createdAt);
        
        console.log('Stripe earnings loaded:', earningsList.length, 'payments');
        
        setEarnings(earningsList);
        
        // Calculate totals
        const total = earningsList.reduce((sum, earning) => sum + earning.amount, 0);
        const pending = earningsList
          .filter(earning => earning.status === 'pending')
          .reduce((sum, earning) => sum + earning.netAmount, 0);
        const readyForPayout = earningsList
          .filter(earning => earning.status === 'ready_for_payout')
          .reduce((sum, earning) => sum + earning.netAmount, 0);
        const completed = earningsList
          .filter(earning => earning.status === 'completed')
          .reduce((sum, earning) => sum + earning.netAmount, 0);
          
        setTotalEarnings(total);
        setPendingEarnings(pending);
        setReadyForPayoutEarnings(readyForPayout);
        setCompletedEarnings(completed);
      } else {
        console.log('No payment history found or error:', data);
        setEarnings([]);
        setTotalEarnings(0);
        setPendingEarnings(0);
        setReadyForPayoutEarnings(0);
        setCompletedEarnings(0);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.log('Error loading earnings from Stripe:', error);
      setIsLoading(false);
    }
  }, []);

  // Load earnings when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadEarnings();
      loadAccountBalance();
    }, [loadEarnings, loadAccountBalance])
  );

  // Refresh earnings
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEarnings();
    await loadAccountBalance();
    setIsRefreshing(false);
  }, [loadEarnings, loadAccountBalance]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'ready_for_payout':
        return '#2196F3';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Paid Out';
      case 'ready_for_payout':
        return 'Ready to Withdraw';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  // Handle manual payout
  const handleWithdraw = async (earning: EarningsData) => {
    try {
      if (!earning.paymentIntentId) {
        Alert.alert('Error', 'Payment Intent ID not found');
        return;
      }

      // Set withdrawing state
      setEarnings(prev => prev.map(e => 
        e.bookingId === earning.bookingId 
          ? { ...e, isWithdrawing: true }
          : e
      ));

      const functions = getFunctions();
      const triggerPayout = httpsCallable(functions, 'triggerManualPayout');
      
      const result = await triggerPayout({
        amount: earning.netAmount,
        currency: earning.currency.toLowerCase()
      });

      const data = result.data as any;
      
      if (data.success) {
        Alert.alert(
          'Payout Initiated', 
          `Your payout of ${formatCurrency(earning.netAmount, earning.currency)} has been initiated. It will arrive in your bank account within 1-2 business days.`
        );
        
        // Refresh earnings to update status
        await loadEarnings();
      } else {
        Alert.alert('Error', data.message || 'Failed to initiate payout');
      }
    } catch (error) {
      console.log('Error initiating payout:', error);
      Alert.alert('Error', 'Failed to initiate payout. Please try again.');
    } finally {
      // Reset withdrawing state
      setEarnings(prev => prev.map(e => 
        e.bookingId === earning.bookingId 
          ? { ...e, isWithdrawing: false }
          : e
      ));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <GradientBackground />
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image
              source={require('../../../../assets/icons/back.png')}
              style={styles.backIcon}
            />
          </TouchableOpacity>
          <View style={{alignItems:'center',justifyContent:'center',width:'100%'}}>
          <Text style={styles.headerTitle}>My Earnings</Text></View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A6E66E" />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image
            source={require('../../../../assets/icons/back.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <View style={{alignItems:'center',justifyContent:'center',width:'100%'}}>
        <Text style={styles.headerTitle}>My Earnings</Text></View>        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#A6E66E"
          />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Earnings</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalEarnings)}</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Pending</Text>
            <Text style={[styles.summaryAmount, { color: '#FF9800' }]}>
              {formatCurrency(pendingEarnings)}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ready to Withdraw</Text>
            <Text style={[styles.summaryAmount, { color: '#2196F3' }]}>
              {formatCurrency(readyForPayoutEarnings)}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Paid Out</Text>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
              {formatCurrency(completedEarnings)}
            </Text>
          </View>
        </View>

        {/* Account Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceTitle}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(accountBalance)}</Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({earnings.filter(earning => earning.status === 'pending' || earning.status === 'ready_for_payout').length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed ({earnings.filter(earning => earning.status === 'completed').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings List based on active tab */}
        <View style={styles.earningsContainer}>
          {activeTab === 'pending' ? (
            earnings.filter(earning => earning.status === 'pending' || earning.status === 'ready_for_payout').length > 0 ? (
              earnings
                .filter(earning => earning.status === 'pending' || earning.status === 'ready_for_payout')
                .map((earning, index) => (
                  <View key={earning.bookingId} style={styles.earningCard}>
                    <View style={styles.earningHeader}>
                      <Text style={styles.earningTitle}>Backyard Name : {earning.listingTitle}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(earning.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(earning.status)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.earningDetails}>
                      <Text style={styles.renterName}>Rental Name : {earning.renterName}</Text>
                      <Text style={styles.renterEmail}>{earning.renterEmail}</Text>
                    </View>
                    
                    <View style={styles.earningAmounts}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Gross Amount:</Text>
                        <Text style={styles.amountValue}>{formatCurrency(earning.amount, earning.currency)}</Text>
                      </View>
                      
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Platform Fee (10%):</Text>
                        <Text style={styles.amountValue}>-{formatCurrency(earning.platformFee, earning.currency)}</Text>
                      </View>
                      
                      <View style={[styles.amountRow, styles.netAmountRow]}>
                        <Text style={styles.netAmountLabel}>Net Amount:</Text>
                        <Text style={styles.netAmountValue}>{formatCurrency(earning.netAmount, earning.currency)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.earningDates}>
                      <Text style={styles.dateLabel}>Payment Date: {formatDate(earning.paymentDate || earning.createdAt)}</Text>
                      {earning.payoutDate && (
                        <Text style={styles.dateLabel}>Payout Date: {formatDate(earning.payoutDate)}</Text>
                      )}
                    </View>


                    {/* Withdraw Button for Ready for Payout */}
                    {earning.status === 'ready_for_payout' && (
                      <View style={styles.withdrawContainer}>
                        <TouchableOpacity
                          style={[styles.withdrawButton, earning.isWithdrawing && styles.withdrawButtonDisabled]}
                          onPress={() => handleWithdraw(earning)}
                          disabled={earning.isWithdrawing}
                        >
                          {earning.isWithdrawing ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.withdrawButtonText}>Withdraw {formatCurrency(earning.netAmount, earning.currency)}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⏳</Text>
                <Text style={styles.emptyTitle}>No Pending Earnings</Text>
                <Text style={styles.emptySubtitle}>
                  All your earnings have been processed
                </Text>
              </View>
            )
          ) : (
            earnings.filter(earning => earning.status !== 'pending').length > 0 ? (
              earnings
                .filter(earning => earning.status !== 'pending')
                .map((earning, index) => (
                  <View key={earning.bookingId} style={styles.earningCard}>
                    <View style={styles.earningHeader}>
                      <Text style={styles.earningTitle}>Backyard Name : {earning.listingTitle}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(earning.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(earning.status)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.earningDetails}>
                      <Text style={styles.renterName}>Rental Name : {earning.renterName}</Text>
                      <Text style={styles.renterEmail}>{earning.renterEmail}</Text>
                    </View>
                    
                    <View style={styles.earningAmounts}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Gross Amount:</Text>
                        <Text style={styles.amountValue}>{formatCurrency(earning.amount, earning.currency)}</Text>
                      </View>
                      
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Platform Fee (10%):</Text>
                        <Text style={styles.amountValue}>-{formatCurrency(earning.platformFee, earning.currency)}</Text>
                      </View>
                      
                      <View style={[styles.amountRow, styles.netAmountRow]}>
                        <Text style={styles.netAmountLabel}>Net Amount:</Text>
                        <Text style={styles.netAmountValue}>{formatCurrency(earning.netAmount, earning.currency)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.earningDates}>
                      <Text style={styles.dateLabel}>Payment Date: {formatDate(earning.paymentDate || earning.createdAt)}</Text>
                      {earning.payoutDate && (
                        <Text style={styles.dateLabel}>Payout Date: {formatDate(earning.payoutDate)}</Text>
                      )}
                    </View>
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>No Completed Earnings</Text>
                <Text style={styles.emptySubtitle}>
                  Completed earnings will appear here once payments are processed
                </Text>
              </View>
            )
          )}
        </View>

        {/* Global Empty State */}
        {earnings.length === 0 && (
          <View style={styles.earningsContainer}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyTitle}>No Earnings Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your earnings will appear here once you receive bookings
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems:'center',

    paddingBottom: 20,
  },
  backButton: {
    borderRadius: 20,
    position:'absolute',
    left:20,
  },
  backIcon: {
    width: 44,
    height: 44,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign:'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  summaryTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryAmount: {
    color: '#A6E66E',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  earningsContainer: {
    marginBottom: 20,
  },
  earningsTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  earningCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  earningDetails: {
    marginBottom: 12,
  },
  renterName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  renterEmail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  earningAmounts: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  netAmountRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 8,
    marginTop: 8,
  },
  amountLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  amountValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  netAmountLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  netAmountValue: {
    color: '#A6E66E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningDates: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  dateLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#A6E66E',
    borderRadius:100,
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  balanceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#A6E66E',
    fontSize: 24,
    fontWeight: 'bold',
  },
  withdrawContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  withdrawButton: {
    backgroundColor: '#A6E66E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: 'rgba(166, 230, 110, 0.5)',
  },
  withdrawButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
