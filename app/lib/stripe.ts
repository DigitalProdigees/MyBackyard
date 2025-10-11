// Stripe configuration
export const STRIPE_CONFIG = {
  // Keys from environment variables
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  
  // Currency settings
  currency: 'usd',
  
  // Payment settings
  paymentMethods: ['card'],
  
  // Test card numbers for development
  testCards: {
    success: '4242424242424242',
    decline: '4000000000000002',
    insufficientFunds: '4000000000009995',
    expired: '4000000000000069',
    incorrectCvc: '4000000000000127',
    processingError: '4000000000000119'
  }
};

// Payment processing configuration
export const PAYMENT_CONFIG = {
  // App fee percentage (9.5%)
  appFeePercentage: 0.095,
  
  // Fixed app fee
  appFeeFixed: 9.5,
  
  // Tax percentage (33.5%)
  taxPercentage: 0.335,
  
  // Fixed tax
  taxFixed: 33.5,
  
  // Minimum payment amount (in cents)
  minimumAmount: 50
};

// Helper function to calculate fees and taxes
export const calculatePaymentBreakdown = (baseAmount: number) => {
  const appFee = Math.max(PAYMENT_CONFIG.appFeeFixed, baseAmount * PAYMENT_CONFIG.appFeePercentage);
  const tax = Math.max(PAYMENT_CONFIG.taxFixed, baseAmount * PAYMENT_CONFIG.taxPercentage);
  const total = baseAmount + appFee + tax;
  
  return {
    baseAmount,
    appFee: Math.round(appFee * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};
