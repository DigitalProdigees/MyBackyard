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
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amount * 100 * CONNECT_CONFIG.platformFeePercentage), // 0% for sandbox
        transfer_data: {
          destination: ownerConnectAccountId,
        },
      };
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

// Get payment history for admin
export const getPaymentHistory = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin (you can implement your own admin check)
    const userRef = admin.database().ref(`users/${context.auth.uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    // Get all bookings with payment info
    const bookingsRef = admin.database().ref('bookings');
    const bookingsSnapshot = await bookingsRef.once('value');
    const bookingsData = bookingsSnapshot.val();

    const paymentHistory = [];
    if (bookingsData) {
      for (const bookingId in bookingsData) {
        const booking = bookingsData[bookingId];
        if (booking.isPaid && booking.paymentStatus === 'completed') {
          paymentHistory.push({
            bookingId,
            ownerName: booking.ownerName,
            renterEmail: booking.renterEmail,
            amount: booking.amount,
            currency: booking.currency,
            paymentIntentId: booking.paymentIntentId,
            createdAt: booking.createdAt,
            listingId: booking.listingId
          });
        }
      }
    }

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

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://stripe.com/connect/refresh',
      return_url: 'https://stripe.com/connect/return',
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
      return_url: 'https://stripe.com/connect/return',
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
