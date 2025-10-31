import { auth, rtdb } from '@/app/lib/firebase';
import { ref, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface PaymentData {
  listingId: string;
  fullName: string;
  guests: string;
  hours: string;
  total: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface PaymentState {
  state: 'idle' | 'creating' | 'processing' | 'completed' | 'cancelled' | 'error';
  isProcessing: boolean;
  error: string;
  sessionId: string | null;
  checkoutUrl: string;
}

/**
 * Create a Stripe checkout session
 */
export const createCheckoutSession = async (data: PaymentData): Promise<CheckoutSessionResult> => {
  // Check if user is authenticated
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const uid = user.uid;
  console.log('User authenticated with UID:', uid);

  // Get listing details from Firebase
  const listingRef = ref(rtdb, `listings/${data.listingId}`);
  const listingSnapshot = await get(listingRef);
  
  if (!listingSnapshot.exists()) {
    throw new Error('Listing not found');
  }

  const listing = listingSnapshot.val();

  // Initialize Firebase Functions
  const functions = getFunctions();
  const createCheckoutSessionFunction = httpsCallable(functions, 'createCheckoutSession');

  // Get owner's Stripe Connect account ID
  let ownerConnectAccountId = null;
  try {
    const ownerRef = ref(rtdb, `users/${listing.ownerId}`);
    const ownerSnapshot = await get(ownerRef);
    if (ownerSnapshot.exists()) {
      const ownerData = ownerSnapshot.val();
      ownerConnectAccountId = ownerData.stripeConnectAccountId || null;
      console.log('Owner Stripe Connect Account ID:', ownerConnectAccountId);
    }
  } catch (error) {
    console.log('Error fetching owner Connect account ID:', error);
  }

  // Create checkout session
  const checkoutData = {
    amount: parseFloat(data.total),
    currency: 'usd',
    listingId: data.listingId,
    ownerId: listing.ownerId,
    ownerName: listing.ownerName || 'Property Owner',
    ownerConnectAccountId: ownerConnectAccountId,
    bookingData: {
      fullName: data.fullName,
      guests: data.guests,
      hours: data.hours,
      mainImage: listing.mainImage || listing.images?.[0] || '',
      date: {
        selectedDate: data.selectedDate,
        formattedDate: new Date(data.selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      },
      time: {
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.hours
      },
      listingInfo: {
        id: data.listingId,
        title: listing.title,
        location: `${listing.city || ''}, ${listing.state || ''}, ${listing.country || ''}`.replace(/^,\s*|,\s*$/g, ''),
        mainImage: listing.mainImage || listing.images?.[0] || ''
      }
    }
  };
  
  console.log('Creating checkout session with data:', checkoutData);
  const checkoutResult = await createCheckoutSessionFunction(checkoutData);
  console.log('Checkout result:', checkoutResult);

  const { checkoutUrl, sessionId } = checkoutResult.data as any;
  
  if (!checkoutUrl) {
    throw new Error('Failed to create checkout session');
  }

  return { checkoutUrl, sessionId };
};

/**
 * Check if a session is still valid
 */
export const checkSessionStatus = async (sessionId: string): Promise<boolean> => {
  try {
    if (!sessionId) return false;
    
    const functions = getFunctions();
    const verifyPayment = httpsCallable(functions, 'verifyPaymentAndCreateBooking');
    
    const result = await verifyPayment({ sessionId });
    const data = result.data as any;
    
    // If session is already completed or expired, don't reopen
    return !data.success && !data.error?.includes('not found');
  } catch (error) {
    console.log('Session status check error:', error);
    return false;
  }
};

/**
 * Convert Stripe error codes to user-friendly messages
 */
export const getErrorMessage = (error: string): string => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('card_declined')) {
    return 'Your card was declined. Please try a different payment method.';
  } else if (errorLower.includes('insufficient_funds')) {
    return 'Insufficient funds. Please check your account balance and try again.';
  } else if (errorLower.includes('incorrect_cvc') || errorLower.includes('cvc')) {
    return 'Incorrect CVC code. Please check your card details and try again.';
  } else if (errorLower.includes('expired_card')) {
    return 'Your card has expired. Please use a different payment method.';
  } else if (errorLower.includes('processing_error')) {
    return 'Payment processing error. Please try again later.';
  } else if (errorLower.includes('authentication_required')) {
    return 'Additional authentication required. Please complete the verification process.';
  } else {
    return 'Payment failed. Please try again or use a different payment method.';
  }
};
