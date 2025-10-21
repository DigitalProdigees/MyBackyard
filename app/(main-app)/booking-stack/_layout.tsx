import { Stack } from 'expo-router';

export default function BookingStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="booking-details/index" />
      <Stack.Screen name="payment-processing/index" />
      <Stack.Screen name="payment-success/index" />
      <Stack.Screen name="payment-cancel/index" />
    </Stack>
  );
}
