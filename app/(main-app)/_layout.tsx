import { Drawer } from 'expo-router/drawer';
import { GradientBackground } from '../components/GradientBackground';
import CustomDrawerContent from '../components/menu/CustomDrawerContent';

export default function RenterLayout() {
  return (
    <>
      <GradientBackground />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: 'transparent',
            width: '80%',
          },
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          drawerType: 'slide',
        }}
      >
        <Drawer.Screen
          name="home/index"
          options={{
            drawerLabel: 'Home',
            title: 'Home',
          }}
        />
        <Drawer.Screen
          name="my-bookings/index"
          options={{
            drawerLabel: 'My Bookings',
            title: 'My Bookings',
          }}
        />
        <Drawer.Screen
          name="messaging/index"
          options={{
            drawerLabel: 'Messaging',
            title: 'Messaging',
          }}
        />
        <Drawer.Screen
          name="chat/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="backyard-details/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="booking-details/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="profile/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="change-pass/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="reset-pass/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="contact-us/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="terms-conditions/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="privacy-policy/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="payment-processing/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="payment-success/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="payment-cancel/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="notification-centre/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="reset-pss-change/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="admin-payments/index"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </>
  );
} 