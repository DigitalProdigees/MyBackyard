import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { BackButton, GradientBackground, GradientButton, Input } from '@/app/components';
import { Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Success from '@/app/components/dialogs/Success';
const { width, height } = Dimensions.get('window');
export default function ContactUs() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleSubmit = () => {
    // Here you would typically send the form data to your backend
    console.log('Form submitted with:', { email, message });

    // Show success dialog
    setShowSuccessDialog(true);
    setEmail('');
    setMessage('');
  };

  const handleSuccessButtonPress = () => {
    setShowSuccessDialog(false);
    // Navigate back to home
    router.push('/(main-app)/home');
  };

  const handleAttachFile = () => {
    // Implement file attachment functionality
    console.log('Attach file pressed');
  };

  // Auto-close success dialog after 2 seconds
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GradientBackground />

      <View style={styles.customHeader}>
        <BackButton
        />

        <TouchableOpacity
          style={styles.bellIconContainer}
          onPress={() => router.push('/(main-app)/notification-centre')}
        >
          <Image
            source={require('../../../../assets/icons/icBELL.png')}
            style={styles.bellIcon}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <View
        style={styles.contentContainer}
      >
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <View style={{ paddingHorizontal: 15, backgroundColor: '#222952', alignItems: 'center', paddingVertical: 10, borderRadius: 20, flexDirection: 'row' }}>
              <Image source={require('../../../../assets/icons/mail.png')} style={{ width: 22, height: 20, tintColor: '#FFFFFF' }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={'#FFFFFF70'}
                style={{ fontSize: 18, marginLeft: 15, color: 'white', width: '90%' }}
              /></View>
          </View>

          {/* Message Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Message</Text>
            <View style={styles.messageContainer}>
              <Input
                label=""
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                multiline={true}
                numberOfLines={5}
              />
            </View>
          </View>

          {/* Attach File Button */}
          <TouchableOpacity
            style={styles.attachFileButton}
            onPress={handleAttachFile}
          >
            <Image
              source={require('../../../../assets/icons/icLink.png')}
              style={{
                width: 20,
                height: 20,
                tintColor: '#FFFFFF',
                marginRight: 8,
                resizeMode: 'contain'
              }}
            />
            <Text style={styles.attachFileText}>
              Attach File (should not be more than 5mb)
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <GradientButton
              text="Submit"
              onPress={handleSubmit}
            />
          </View>
        </View>
      </View >

      {/* Success Dialog */}
      < Success
        visible={showSuccessDialog}
        title="Your Request Sent!"
        buttonText="OK"
        onButtonPress={handleSuccessButtonPress}
      />
    </View>);
}
const styles = StyleSheet.create({
  headerTitleContainer: {
    paddingHorizontal: 44,
    marginTop: -5
  },
  bellIconContainer: {
    top: 48,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  customHeader: {
    paddingHorizontal: 24,
  },


  bellIcon: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  container: {
    flex: 1,

  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 50
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
    marginTop: 70,
  },
  headerTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 15
  },

  messageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#222952',
    height: 120,
  },
  attachFileButton: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    minHeight: 56, // Ensure enough height for icon and text
    backgroundColor: '#00000033'
  },
  attachFileText: {
    marginLeft: 10,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButtonContainer: {
    marginTop: 'auto',
  },
});