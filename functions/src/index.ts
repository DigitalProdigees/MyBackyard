import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe with secret key from environment variable
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
});

// Create Checkout Session
export const createCheckoutSession = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { amount, currency = 'usd', listingId, ownerId, ownerName, bookingData } = data;

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

    // Create checkout session with minimal metadata
    const session = await stripe.checkout.sessions.create({
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
    });

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

// Webhook to handle Stripe events (for production)
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = 'whsec_your_webhook_secret_here'; // Replace with your webhook secret

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed:', err);
    res.status(400).send('Webhook Error');
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      
      // Create booking from successful checkout
      if (session.payment_status === 'paid') {
        try {
          const { tempBookingId, listingId, ownerId, renterId } = session.metadata;
          
          if (tempBookingId && listingId && ownerId && renterId) {
            // Retrieve booking data from temp storage
            const tempBookingRef = admin.database().ref(`tempBookings/${tempBookingId}`);
            const tempBookingSnapshot = await tempBookingRef.once('value');
            
            if (tempBookingSnapshot.exists()) {
              const tempBookingData = tempBookingSnapshot.val();
              const { ownerName, renterEmail, ...bookingData } = tempBookingData;
              
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

              // Clean up temp booking data
              await tempBookingRef.remove();

              console.log('Booking created successfully:', bookingId);
            }
          }
        } catch (error) {
          console.log('Error creating booking from webhook:', error);
        }
      }
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('PaymentIntent failed:', failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
