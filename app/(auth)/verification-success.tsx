import React, { useEffect, useState } from 'react';
import { View, Text, Image, useWindowDimensions, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { authStyles } from './styles/auth.styles';
import { Icons } from '../../constants/icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, rtdb } from '../lib/firebase';
import { ref, set, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ratio = Math.min(width, height) / 375; // Base ratio for responsive scaling

export default function VerificationSuccess() {
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const email = params.email as string;
  const fullName = params.fullName as string;
  const password = params.password as string;
  const isAdmin = (params.isAdmin as string) === 'true';

  // Create user account after verification is complete
  useEffect(() => {
    const createUserAccount = async () => {
      if (!email || !fullName || !password) {
        console.log('Missing user data for account creation');
        router.replace('/(auth)/signup');
        return;
      }

      setIsCreatingUser(true);

      try {
        console.log('Creating user account after verification:', { email, fullName });
        
        // Ensure signup flow flag is set before creating user
        try { 
          await AsyncStorage.setItem('signup_flow_active', 'true'); 
          await AsyncStorage.setItem('signup_user_type', isAdmin ? 'owner' : 'customer');
          console.log('✅ Signup flow flags set before user creation');
        } catch (e) { 
          console.warn('Failed to set signup flow flags:', e); 
        }
        
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user && fullName) {
          try { await updateProfile(cred.user, { displayName: fullName }); } catch (e) { console.warn('updateProfile failed', e); }
          try {
            const userRef = ref(rtdb, `users/${cred.user.uid}`);
            const userData = {
              fullName: fullName,
              email: cred.user.email,
              type: isAdmin ? 'owner' : 'customer',
              createdAt: new Date().toISOString(),
            };
            console.log('💾 Saving user data to RTDB:', userData);
            await set(userRef, userData);
            console.log('✅ User data saved successfully to RTDB');
          } catch (e) { 
            console.log('❌ Failed to save user in RTDB:', e); 
          }
        }
        // No navigation here; listener in _layout will handle stack change
      } catch (error) {
        console.log('Error creating user account:', error);
      } finally {
        setIsCreatingUser(false);
      }
    };

    createUserAccount();
  }, [email, fullName, password]);

  // TODO: Uncomment for future countdown implementation
  // useEffect(() => {
  //   const countdownTimer = setInterval(() => {
  //     setCountdown((prev: number) => {
  //       if (prev <= 1) {
  //         router.replace('/(main-app)/profile');
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);

  //   return () => clearInterval(countdownTimer);
  // }, []);

  // TODO: For production, uncomment the authentication check and remove the bypass
  // The current implementation bypasses authentication for testing purposes

  return (
    <View style={authStyles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={[authStyles.content, { flex: 1, justifyContent: 'center' }]}>
        <View style={{
          alignItems: 'center',
          paddingVertical: Math.min(windowHeight * 0.1, height * 0.1),
          marginBottom: Math.min(height * 0.06, 50), // This will create equal spacing of 10% of screen height from top and bottom
        }}>
          <View style={{
            borderRadius: Math.min(width * 0.24, 90),
            padding: Math.min(width * 0.027, 10),
            backgroundColor: '#46B64933',
            marginBottom: Math.min(height * 0.05, 40)
          }}>
            <View style={{
              borderRadius: Math.min(width * 0.267, 100),
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Image
                source={Icons.done}
                style={{
                  width: Math.min(width * 0.293, 110),
                  height: Math.min(width * 0.293, 110),
                  resizeMode: 'contain',
                }}
              />
            </View>
          </View>
          <Text style={[authStyles.title, {
            textAlign: 'center',
            marginBottom: Math.min(height * 0.015, 12)
          }]}>
            Successfully Verified!
          </Text>
          <Text style={[authStyles.subtitle, { textAlign: 'center' }]}>
            {isCreatingUser
              ? 'Creating your account...'
              : 'Your account is ready! Redirecting to profile...'
            }
          </Text>
        </View>
      </View>
    </View>
  );
} 