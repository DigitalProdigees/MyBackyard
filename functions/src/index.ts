import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with secret key from Firebase config
const stripeSecretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// Stripe Connect configuration
const CONNECT_CONFIG = {
  platformFeePercentage: 0, // 0% for sandbox testing
  payoutDelayDays: 7, // 7 days after booking
  accountType: 'express',
  requiredCapabilities: ['card_payments', 'transfers'],
};

// Create Checkout Session
export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { amount, currency = 'usd', listingId, ownerId, ownerName, bookingData, ownerConnectAccountId } = data;

    // Validate required fields
    if (!amount || !listingId || !ownerId || !ownerName) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Store booking data in Firebase first to avoid metadata size limits
    const tempBookingId = admin.database().ref().child('tempBookings').push().key;
    await admin.database().ref(`tempBookings/${tempBookingId}`).set({
      ...bookingData,
      listingId,
      ownerId,
      ownerName,
      renterId: context.auth.uid,
      renterEmail: context.auth.token.email || '',
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    // Create checkout session with Connect account
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `${ownerName}'s Backyard Rental`,
              description: `Booking for ${bookingData.listingInfo?.title || 'Backyard'}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `mybackyard://payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `mybackyard://payment-cancel`,
      metadata: {
        tempBookingId: tempBookingId || '',
        listingId,
        ownerId,
        renterId: context.auth.uid
      },
    };

    // If owner has Connect account, use it for payment destination
    if (ownerConnectAccountId) {
      console.log('Using Stripe Connect account for payment:', ownerConnectAccountId);
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amount * 100 * CONNECT_CONFIG.platformFeePercentage), // 0% for sandbox
        transfer_data: {
          destination: ownerConnectAccountId,
        },
      };
      console.log('Payment will be transferred to owner account:', ownerConnectAccountId);
    } else {
      console.log('No Stripe Connect account found for owner:', ownerId);
      console.log('Payment will go to platform account (not owner account)');
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      checkoutUrl: session.url,
      sessionId: session.id
    };
  } catch (error: any) {
    console.log('Error creating checkout session:', error);
    console.log('Error details:', error.message, error.type, error.raw);
    console.log('Request data:', { 
      amount: data.amount, 
      currency: data.currency, 
      listingId: data.listingId, 
      ownerId: data.ownerId, 
      ownerName: data.ownerName 
    });
    console.log('User context:', { uid: context.auth?.uid, email: context.auth?.token?.email });
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create checkout session');
  }
});

// Verify payment and create booking
export const verifyPaymentAndCreateBooking = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { sessionId } = data;

    if (!sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Session ID is required');
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      throw new functions.https.HttpsError('not-found', 'Payment session not found');
    }

    if (session.payment_status !== 'paid') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment not completed');
    }

    // Extract metadata
    const { tempBookingId, listingId, ownerId, renterId } = session.metadata;

    if (!tempBookingId || !listingId || !ownerId || !renterId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required booking data');
    }

    // Check if booking already exists FIRST (before checking temp data)
    const existingBookingsRef = admin.database().ref('bookings');
    const existingSnapshot = await existingBookingsRef
      .orderByChild('paymentIntentId')
      .equalTo(session.payment_intent as string)
      .once('value');

    if (existingSnapshot.exists()) {
      const existingBooking = Object.values(existingSnapshot.val())[0] as any;
      console.log('Booking already exists, returning existing booking:', existingBooking.id);
      return {
        success: true,
        bookingId: existingBooking.id,
        message: 'Booking already exists',
        isExisting: true
      };
    }

    // Retrieve booking data from temp storage
    const tempBookingRef = admin.database().ref(`tempBookings/${tempBookingId}`);
    const tempBookingSnapshot = await tempBookingRef.once('value');
    
    if (!tempBookingSnapshot.exists()) {
      // If temp data doesn't exist, it might have been cleaned up already
      // Try to find the booking by session payment intent
      console.log('Temp booking data not found, but checking if booking was already created');
      throw new functions.https.HttpsError('not-found', 'Booking data not found. If payment succeeded, booking may already exist.');
    }

    const tempBookingData = tempBookingSnapshot.val();
    const { ownerName, renterEmail, ...bookingData } = tempBookingData;

    // Additional time conflict check at database level
    if (bookingData.date?.selectedDate && bookingData.time?.startTime && bookingData.time?.endTime) {
      const conflictSnapshot = await existingBookingsRef
        .orderByChild('listingId')
        .equalTo(listingId)
        .once('value');

      if (conflictSnapshot.exists()) {
        const bookings = conflictSnapshot.val();
        const selectedDate = new Date(bookingData.date.selectedDate);
        const userStart = parseInt(bookingData.time.startTime.split(':')[0]);
        const userEnd = parseInt(bookingData.time.endTime.split(':')[0]);

        for (const bookingId in bookings) {
          const booking = bookings[bookingId];
          
          // Handle multiple date formats
          let bookingDate;
          if (booking.date?.selectedDate) {
            bookingDate = new Date(booking.date.selectedDate);
          } else if (booking.selectedDate) {
            bookingDate = new Date(booking.selectedDate);
          } else if (booking.bookingDate) {
            bookingDate = new Date(booking.bookingDate);
          } else {
            continue;
          }
          
          if (isNaN(bookingDate.getTime()) || bookingDate.toDateString() !== selectedDate.toDateString()) {
            continue;
          }
          
          // Handle multiple time formats
          let existingStart, existingEnd;
          if (booking.time?.startTime && booking.time?.endTime) {
            existingStart = parseInt(booking.time.startTime.split(':')[0]);
            existingEnd = parseInt(booking.time.endTime.split(':')[0]);
          } else if (booking.startTime && booking.endTime) {
            existingStart = parseInt(booking.startTime.split(':')[0]);
            existingEnd = parseInt(booking.endTime.split(':')[0]);
          } else {
            continue;
          }
          
          // Check for overlap
          const hasOverlap = userStart < existingEnd && existingStart < userEnd;
          if (hasOverlap) {
            throw new functions.https.HttpsError('failed-precondition', 'Time slot is no longer available due to a recent booking');
          }
        }
      }
    }

    // Create booking record
    const bookingId = admin.database().ref().child('bookings').push().key;
    
    const bookingRecord = {
      id: bookingId,
      listingId: listingId, // Explicitly ensure listingId is saved
      ownerId,
      ownerName,
      renterId,
      renterEmail,
      paymentIntentId: session.payment_intent,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      status: 'confirmed',
      isPaid: true,
      paymentStatus: 'completed',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      bookingDate: admin.database.ServerValue.TIMESTAMP,
      ...bookingData,
      // Ensure mainImage is included from listing (handle both string and object formats)
      mainImage: bookingData.mainImage || bookingData.listingInfo?.mainImage || '',
      backyardName: bookingData.listingInfo?.title || '',
      location: bookingData.listingInfo?.location || ''
    };

    // Save booking to main bookings collection
    await admin.database().ref(`bookings/${bookingId}`).set(bookingRecord);

    // Save booking to user's bookings
    await admin.database().ref(`users/${renterId}/bookings/${bookingId}`).set(bookingRecord);

    // Save booking to owner's bookings
    await admin.database().ref(`users/${ownerId}/ownerBookings/${bookingId}`).set(bookingRecord);

    // Update listing with booking info
    const listingBookingsRef = admin.database().ref(`listings/${listingId}/bookings/${bookingId}`);
    await listingBookingsRef.set({
      bookingId,
      renterId,
      renterEmail,
      date: bookingData.date,
      time: bookingData.time,
      status: 'confirmed',
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    // Clean up temp booking data
    await tempBookingRef.remove();

    console.log('Booking created successfully:', bookingId);

    return {
      success: true,
      bookingId,
      message: 'Booking created successfully'
    };
  } catch (error) {
    console.log('Error verifying payment and creating booking:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify payment and create booking');
  }
});

// Handle successful payment
export const handlePaymentSuccess = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { paymentIntentId, listingId, ownerId, ownerName, bookingData } = data;

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment not successful');
    }

    // Get listing details
    const listingRef = admin.database().ref(`listings/${listingId}`);
    const listingSnapshot = await listingRef.once('value');
    const listingData = listingSnapshot.val();

    if (!listingData) {
      throw new functions.https.HttpsError('not-found', 'Listing not found');
    }

    // Create booking record
    const bookingId = admin.database().ref().child('bookings').push().key;
    const bookingRecord = {
      id: bookingId,
      listingId,
      ownerId,
      ownerName,
      renterId: context.auth.uid,
      renterEmail: context.auth.token.email || '',
      paymentIntentId,
      amount: paymentIntent.amount / 100, // Convert back from cents
      currency: paymentIntent.currency,
      status: 'confirmed',
      isPaid: true,
      paymentStatus: 'completed',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      bookingDate: admin.database.ServerValue.TIMESTAMP,
      ...bookingData
    };

    // Save booking to main bookings collection
    await admin.database().ref(`bookings/${bookingId}`).set(bookingRecord);

    // Save booking to user's bookings
    await admin.database().ref(`users/${context.auth.uid}/bookings/${bookingId}`).set(bookingRecord);

    // Save booking to owner's bookings
    await admin.database().ref(`users/${ownerId}/ownerBookings/${bookingId}`).set(bookingRecord);

    // Update listing with booking info
    const listingBookingsRef = admin.database().ref(`listings/${listingId}/bookings/${bookingId}`);
    await listingBookingsRef.set({
      bookingId,
      renterId: context.auth.uid,
      renterEmail: context.auth.token.email || '',
      date: bookingData.date,
      time: bookingData.time,
      status: 'confirmed',
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    return {
      success: true,
      bookingId,
      message: 'Booking created successfully'
    };
  } catch (error) {
    console.log('Error handling payment success:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process payment success');
  }
});

// Get payment history for owner - hybrid approach (Firebase + Stripe)
export const getPaymentHistory = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;
    console.log('Getting payment history for user:', uid);

    // Get user's Stripe Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userSnapshot.val();
    const stripeConnectAccountId = userData.stripeConnectAccountId;

    if (!stripeConnectAccountId) {
      console.log('No Stripe Connect account found for user:', uid);
      return {
        success: true,
        paymentHistory: []
      };
    }

    console.log('Fetching owner bookings from Firebase for user:', uid);

    // Get owner's bookings from Firebase (this has the booking metadata)
    const ownerBookingsRef = admin.database().ref(`users/${uid}/ownerBookings`);
    const ownerBookingsSnapshot = await ownerBookingsRef.once('value');

    if (!ownerBookingsSnapshot.exists()) {
      console.log('No owner bookings found for user:', uid);
      return {
        success: true,
        paymentHistory: []
      };
    }

    const ownerBookings = ownerBookingsSnapshot.val();
    console.log('Found', Object.keys(ownerBookings).length, 'owner bookings in Firebase');

    // Get Stripe charges for payment status and amounts
    console.log('Fetching charges from Stripe for account:', stripeConnectAccountId);
    const charges = await stripe.charges.list({
      limit: 100, // Get last 100 charges
    }, {
      stripeAccount: stripeConnectAccountId
    });

    console.log('Found', charges.data.length, 'charges from Stripe');

    const paymentHistory = [];
    
    // Process each owner booking
    for (const bookingId in ownerBookings) {
      const booking = ownerBookings[bookingId];
      
      // Only include paid bookings
      if (booking.isPaid && booking.paymentStatus === 'completed') {
        console.log('Processing booking:', bookingId, 'paymentIntentId:', booking.paymentIntentId);
        
        // Find matching Stripe charge by payment intent ID
        let matchingCharge = null;
        for (const charge of charges.data) {
          if (charge.payment_intent === booking.paymentIntentId) {
            matchingCharge = charge;
            break;
          }
        }
        
        if (matchingCharge && matchingCharge.status === 'succeeded') {
          console.log('Found matching Stripe charge for booking:', bookingId);
          
          // Determine payout status from Stripe
          let payoutStatus = 'pending';
          let payoutDate = null;
          
          try {
            if (matchingCharge.balance_transaction && typeof matchingCharge.balance_transaction === 'string') {
              const balanceTransaction = await stripe.balanceTransactions.retrieve(matchingCharge.balance_transaction, {
                stripeAccount: stripeConnectAccountId
              });
              
              if (balanceTransaction.status === 'available') {
                // Check if it's been 7 days since the charge
                const chargeDate = new Date(matchingCharge.created * 1000);
                const now = new Date();
                const daysSinceCharge = (now.getTime() - chargeDate.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceCharge >= 7) {
                  payoutStatus = 'ready_for_payout';
                } else {
                  payoutStatus = 'pending';
                }
                payoutDate = new Date(balanceTransaction.created * 1000).toISOString();
              } else if (balanceTransaction.status === 'pending') {
                payoutStatus = 'pending';
              }
            }
          } catch (error) {
            console.log('Error checking payout status for charge:', matchingCharge.id, error);
          }

          // Combine Firebase booking data with Stripe payment data
          paymentHistory.push({
            bookingId: bookingId,
            ownerName: userData.fullName || 'Property Owner',
            renterName: booking.fullName || 'Unknown Renter',
            renterEmail: booking.renterEmail || '',
            amount: matchingCharge.amount / 100, // Use Stripe amount
            currency: matchingCharge.currency.toUpperCase(), // Use Stripe currency
            paymentIntentId: booking.paymentIntentId,
            createdAt: new Date(matchingCharge.created * 1000).getTime(), // Use Stripe timestamp
            listingId: booking.listingId || '',
            listingTitle: booking.backyardName || booking.listingInfo?.title || 'Unknown Listing', // Use Firebase data
            payoutStatus: payoutStatus, // Use Stripe payout status
            payoutDate: payoutDate,
            stripePaymentStatus: matchingCharge.status, // Use Stripe status
            stripeChargeId: matchingCharge.id
          });
        } else {
          console.log('No matching Stripe charge found for booking:', bookingId);
          // Fallback to Firebase data only
          paymentHistory.push({
            bookingId: bookingId,
            ownerName: userData.fullName || 'Property Owner',
            renterName: booking.fullName || 'Unknown Renter',
            renterEmail: booking.renterEmail || '',
            amount: booking.amount || 0,
            currency: (booking.currency || 'USD').toUpperCase(),
            paymentIntentId: booking.paymentIntentId,
            createdAt: booking.createdAt || Date.now(),
            listingId: booking.listingId || '',
            listingTitle: booking.backyardName || booking.listingInfo?.title || 'Unknown Listing',
            payoutStatus: 'pending',
            payoutDate: null,
            stripePaymentStatus: 'unknown',
            stripeChargeId: booking.paymentIntentId
          });
        }
      }
    }

    console.log('Payment history combined:', paymentHistory.length, 'payments');

    return {
      success: true,
      paymentHistory: paymentHistory.sort((a, b) => b.createdAt - a.createdAt)
    };
  } catch (error) {
    console.log('Error getting payment history:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get payment history');
  }
});

// Periodic status checker for Stripe Connect accounts (for sandbox mode)
export const checkConnectAccountStatuses = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  console.log('Running periodic Connect account status check...');
  
  try {
    // Get all users with Connect accounts
    const usersRef = admin.database().ref('users');
    const usersSnapshot = await usersRef.once('value');
    const users = usersSnapshot.val();
    
    if (!users) {
      console.log('No users found');
    return;
  }

    const updatePromises = [];
    
    for (const userId in users) {
      const user = users[userId];
      
      // Only check owners with Connect accounts
      if (user.type === 'owner' && user.stripeConnectAccountId) {
        const updatePromise = checkAndUpdateAccountStatus(userId, user.stripeConnectAccountId);
        updatePromises.push(updatePromise);
      }
    }
    
    await Promise.all(updatePromises);
    console.log('Completed periodic Connect account status check');
    
  } catch (error) {
    console.log('Error in periodic status check:', error);
  }
});

// Helper function to check and update individual account status
async function checkAndUpdateAccountStatus(userId: string, accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    console.log('Periodic check - Stripe account details:', {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements
    });
    
    // Determine verification status
    let status = 'not_created';
    
    if (!account.details_submitted) {
      status = 'pending_onboarding';
    } else if (!account.charges_enabled || !account.payouts_enabled) {
      status = 'pending_verification';
    } else {
      // Check if account has any pending requirements
      const hasPendingRequirements = account.requirements && (
        account.requirements.currently_due.length > 0 ||
        account.requirements.eventually_due.length > 0 ||
        account.requirements.past_due.length > 0
      );
      
      if (hasPendingRequirements) {
        status = 'pending_verification';
      } else {
        status = 'verified';
      }
    }
    
    // Update user data if status changed
    const userRef = admin.database().ref(`users/${userId}`);
    const currentUserSnapshot = await userRef.once('value');
    const currentUser = currentUserSnapshot.val();
    
    if (currentUser.stripeAccountStatus !== status) {
      await userRef.update({
        stripeAccountStatus: status,
        kycCompleted: account.details_submitted,
        bankAccountAdded: account.payouts_enabled,
        verificationStatus: status,
        onboardingCompleted: status === 'verified',
        lastStatusCheck: admin.database.ServerValue.TIMESTAMP
      });
      
      console.log(`Updated status for user ${userId}: ${currentUser.stripeAccountStatus} -> ${status}`);
    }
    
  } catch (error) {
    console.log(`Error checking account status for user ${userId}:`, error);
  }
}

// Webhook placeholder (for production when webhooks are available)
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  // This is a placeholder for production webhooks
  // In sandbox mode, we use the periodic checker above
  console.log('Webhook called (sandbox mode - using periodic checker instead)');
  res.json({ received: true, message: 'Using periodic status checker in sandbox mode' });
});

// Create Stripe Connect Account for Owner
export const createConnectAccount = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { email, name } = data;
    const uid = context.auth.uid;

    // Check if user already has a Connect account
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (userData?.stripeConnectAccountId) {
      // Return existing account
      const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);
      return {
        success: true,
        accountId: userData.stripeConnectAccountId,
        accountLink: null,
        isExisting: true
      };
    }

    // Create new Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You can make this dynamic based on user location
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: uid,
        platform: 'mybackyard'
      }
    });

    // Create account link for onboarding with HTTPS return URL
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://stripe.com/connect/refresh',
      return_url: 'https://mybackyard-55716.web.app/owner-verification-complete.html', // HTTPS URL required by Stripe
      type: 'account_onboarding',
    });

    // Save account ID to user profile
    await userRef.update({
      stripeConnectAccountId: account.id,
      stripeAccountStatus: 'pending_onboarding',
      kycCompleted: false,
      bankAccountAdded: false,
      verificationStatus: 'pending',
      onboardingCompleted: false,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    return {
      success: true,
      accountId: account.id,
      accountLink: accountLink.url,
      isExisting: false
    };
  } catch (error: any) {
    console.log('Error creating Connect account:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create Connect account');
  }
});

// Check Connect Account Status
export const checkConnectAccountStatus = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    // Get user data
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      return {
        success: true,
        status: 'not_created',
        accountId: null,
        needsOnboarding: true
      };
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);
    
    // Determine verification status
    let status = 'not_created';
    let needsOnboarding = false;
    
    console.log('Stripe account details:', {
      id: account.id,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements
    });
    
    if (!account.details_submitted) {
      status = 'pending_onboarding';
      needsOnboarding = true;
    } else if (!account.charges_enabled || !account.payouts_enabled) {
      status = 'pending_verification';
      needsOnboarding = false;
    } else {
      // Check if account has any pending requirements
      const hasPendingRequirements = account.requirements && (
        account.requirements.currently_due.length > 0 ||
        account.requirements.eventually_due.length > 0 ||
        account.requirements.past_due.length > 0
      );
      
      if (hasPendingRequirements) {
        status = 'pending_verification';
        needsOnboarding = false;
      } else {
        status = 'verified';
        needsOnboarding = false;
      }
    }

    // Update user data with current status
    await userRef.update({
      stripeAccountStatus: status,
      kycCompleted: account.details_submitted,
      bankAccountAdded: account.payouts_enabled,
      verificationStatus: status,
      onboardingCompleted: status === 'verified',
      lastStatusCheck: admin.database.ServerValue.TIMESTAMP
    });

    return {
      success: true,
      status,
      accountId: userData.stripeConnectAccountId,
      needsOnboarding,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements
      }
    };
  } catch (error: any) {
    console.log('Error checking Connect account status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to check account status');
  }
});

// Create Account Link for Onboarding
export const createAccountLink = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    // Get user's Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Connect account found');
    }

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripeConnectAccountId,
      refresh_url: 'https://stripe.com/connect/refresh',
      return_url: 'https://mybackyard-55716.web.app/owner-verification-complete.html', // HTTPS URL required by Stripe
      type: 'account_onboarding',
    });

    return {
      success: true,
      accountLink: accountLink.url
    };
  } catch (error: any) {
    console.log('Error creating account link:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create account link');
  }
});

// Manual status refresh (for immediate updates)
export const refreshConnectAccountStatus = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    // Get user's Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      return {
        success: true,
        status: 'not_created',
        accountId: null,
        needsOnboarding: true
      };
    }

    // Check account status directly
    await checkAndUpdateAccountStatus(uid, userData.stripeConnectAccountId);

    // Get updated status
    const updatedSnapshot = await userRef.once('value');
    const updatedData = updatedSnapshot.val();

    return {
      success: true,
      status: updatedData.stripeAccountStatus,
      accountId: updatedData.stripeConnectAccountId,
      needsOnboarding: updatedData.stripeAccountStatus === 'not_created' || updatedData.stripeAccountStatus === 'pending_onboarding'
    };
  } catch (error: any) {
    console.log('Error refreshing account status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to refresh account status');
  }
});

// Check payout status for a specific payment
export const checkPayoutStatus = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { paymentIntentId } = data;
    const uid = context.auth.uid;

    if (!paymentIntentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Payment Intent ID is required');
    }

    // Get user's Stripe Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe Connect account found');
    }

    // Get the charge for this payment intent
    const charges = await stripe.charges.list({
      limit: 100,
    }, {
      stripeAccount: userData.stripeConnectAccountId
    });

    const charge = charges.data.find(c => c.payment_intent === paymentIntentId);
    
    if (!charge) {
      throw new functions.https.HttpsError('not-found', 'Charge not found');
    }

    // Get balance transaction to check payout status
    let payoutStatus = 'pending';
    let availableBalance = 0;
    let pendingBalance = 0;
    let payoutDate = null;

    if (charge.balance_transaction && typeof charge.balance_transaction === 'string') {
      const balanceTransaction = await stripe.balanceTransactions.retrieve(charge.balance_transaction, {
        stripeAccount: userData.stripeConnectAccountId
      });

      if (balanceTransaction.status === 'available') {
        payoutStatus = 'ready_for_payout';
        availableBalance = balanceTransaction.amount / 100; // Convert from cents
      } else if (balanceTransaction.status === 'pending') {
        payoutStatus = 'pending';
        pendingBalance = balanceTransaction.amount / 100;
      }
    }

    // Get account balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: userData.stripeConnectAccountId
    });

    const totalAvailable = balance.available[0]?.amount / 100 || 0;

    return {
      success: true,
      payoutStatus,
      availableBalance: totalAvailable,
      pendingBalance,
      payoutDate,
      chargeId: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase()
    };
  } catch (error: any) {
    console.log('Error checking payout status:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to check payout status');
  }
});

// Trigger manual payout
export const triggerManualPayout = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { amount, currency = 'usd' } = data;
    const uid = context.auth.uid;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Valid amount is required');
    }

    // Get user's Stripe Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe Connect account found');
    }

    // Check if account has sufficient balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: userData.stripeConnectAccountId
    });

    const availableBalance = balance.available[0]?.amount || 0;
    const requestedAmount = Math.round(amount * 100); // Convert to cents

    if (availableBalance < requestedAmount) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient balance for payout');
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: requestedAmount,
      currency: currency.toLowerCase(),
      method: 'standard', // or 'instant' for instant payouts (requires additional setup)
    }, {
      stripeAccount: userData.stripeConnectAccountId
    });

    console.log('Payout created:', payout.id, 'Amount:', amount, 'Currency:', currency);

    return {
      success: true,
      payoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      status: payout.status,
      arrivalDate: payout.arrival_date,
      message: 'Payout initiated successfully'
    };
  } catch (error: any) {
    console.log('Error creating payout:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create payout');
  }
});

// Get account balance
export const getAccountBalance = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    // Get user's Stripe Connect account ID
    const userRef = admin.database().ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData?.stripeConnectAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe Connect account found');
    }

    // Get account balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: userData.stripeConnectAccountId
    });

    const availableBalance = balance.available[0]?.amount / 100 || 0;
    const pendingBalance = balance.pending[0]?.amount / 100 || 0;

    return {
      success: true,
      availableBalance,
      pendingBalance,
      currency: balance.available[0]?.currency?.toUpperCase() || 'USD'
    };
  } catch (error: any) {
    console.log('Error getting account balance:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to get account balance');
  }
});

// Test Helper: Move funds to payout ready (for sandbox testing)
export const moveFundsToPayoutReady = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { accountId, amount, bookingId } = data;

    if (!accountId || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'Account ID and amount are required');
    }

    console.log(`Moving funds to payout ready - Account: ${accountId}, Amount: ${amount}, Booking: ${bookingId || 'all'}`);

    // Create a test charge to move funds to available balance
    // This simulates moving funds from pending to available (payout ready)
    const result = await stripe.charges.create({
      amount: amount, // amount in cents
      currency: 'usd',
      source: 'tok_visa', // Test token
      description: `Test charge to move funds to payout ready - ${bookingId || 'manual'}`,
    }, {
      stripeAccount: accountId
    });

    console.log('Funds moved to payout ready successfully:', result);

    // If a specific booking ID is provided, update the earnings status in the database
    if (bookingId) {
      try {
        const admin = require('firebase-admin');
        const db = admin.database();
        const userId = context.auth.uid;
        
        // Update the specific earning's status to 'ready_for_payout'
        await db.ref(`users/${userId}/earnings/${bookingId}`).update({
          status: 'ready_for_payout',
          updatedAt: Date.now()
        });
        
        console.log(`Updated earnings status for booking ${bookingId} to ready_for_payout`);
      } catch (dbError) {
        console.log('Error updating earnings status in database:', dbError);
        // Don't throw error here as the Stripe operation was successful
      }
    }

    return {
      success: true,
      message: 'Funds moved to payout ready successfully',
      result: result
    };
  } catch (error: any) {
    console.log('Error moving funds to payout ready:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to move funds to payout ready');
  }
});
