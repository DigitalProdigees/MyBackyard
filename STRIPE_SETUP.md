# Stripe Payment Integration Setup

This document provides instructions for setting up Stripe payment integration in your MyBackyard app.

## Prerequisites

1. Stripe account (test mode for development)
2. Firebase project with Cloud Functions enabled
3. Node.js and npm installed

## Stripe Configuration

### 1. Get Your Stripe Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Developers > API Keys
3. Copy your **Publishable key** and **Secret key** (test mode)

### 2. Update Configuration Files

Update the following files with your Stripe keys:

#### `/app/lib/stripe.ts`
```typescript
export const STRIPE_CONFIG = {
  publishableKey: 'pk_test_your_publishable_key_here',
  secretKey: 'sk_test_your_secret_key_here',
  // ... rest of config
};
```

#### `/functions/src/index.ts`
```typescript
const stripe = new Stripe('sk_test_your_secret_key_here', {
  apiVersion: '2023-10-16',
});
```

## Firebase Cloud Functions Setup

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Functions
```bash
cd functions
npm install
```

### 4. Deploy Functions
```bash
firebase deploy --only functions
```

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
```

## Testing the Integration

### 1. Test Card Numbers

Use these test card numbers for testing:

- **Success**: 4242424242424242
- **Decline**: 4000000000000002
- **Insufficient Funds**: 4000000000009995
- **Expired Card**: 4000000000000069

### 2. Test Flow

1. Navigate to a listing
2. Click "Booking Now"
3. Fill in booking details
4. Click "Pay Now"
5. The app will process the payment using Stripe
6. On successful payment, booking will be created
7. Check "My Bookings" to see the confirmed booking

## Payment Flow

1. **User clicks "Pay Now"** in booking details
2. **Payment Intent created** via Firebase Cloud Function
3. **Stripe processes payment** using test card
4. **Payment success handled** via Cloud Function
5. **Booking created** in Firebase with payment details
6. **Booking appears** in "My Bookings" only if payment successful

## Admin Features

### Payment History

Admins can view payment history by calling the `getPaymentHistory` Cloud Function. This shows:

- Owner name for each payment
- Renter email
- Payment amount
- Payment status
- Booking details

### Revenue Tracking

All payments go to your Stripe account with metadata including:
- Listing ID
- Owner ID and name
- Renter information
- Booking details

## Security Notes

1. **Never expose secret keys** in client-side code
2. **Use environment variables** for sensitive data
3. **Validate payments** on the server side
4. **Use HTTPS** in production
5. **Implement webhook verification** for production

## Production Setup

1. **Switch to live Stripe keys** (remove `_test_` from keys)
2. **Set up webhook endpoints** for real-time payment updates
3. **Configure proper error handling** and logging
4. **Test thoroughly** with real payment methods
5. **Set up monitoring** and alerts

## Troubleshooting

### Common Issues

1. **Payment fails**: Check Stripe keys and network connection
2. **Booking not created**: Check Firebase Functions logs
3. **Functions not deploying**: Check Firebase CLI and project permissions

### Debug Steps

1. Check browser console for errors
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify Stripe dashboard for payment attempts
4. Check Firebase Realtime Database for booking data

## Support

For issues with:
- **Stripe**: Check [Stripe Documentation](https://stripe.com/docs)
- **Firebase**: Check [Firebase Documentation](https://firebase.google.com/docs)
- **App-specific**: Check this README and code comments
