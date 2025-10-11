import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GradientButton from '../buttons/GradientButton';
import { colors } from '../../../theme/colors';

interface SuccessDialogProps {
  visible: boolean;
  title: string;
  buttonText: string;
  onButtonPress: () => void;
}

export default function SuccessDialog({
  visible,
  title,
  buttonText,
  onButtonPress,
}: SuccessDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <View style={styles.dialogContainer}>
            <LinearGradient
              colors={[
                '#202857',
                '#202857',
                '#46B649',
                '#34A853',
                '#202857',
                '#202857'
              ]}
              style={StyleSheet.absoluteFill}
              start={{ x: -0.9, y: -0.9 }}
              end={{ x: 1.1, y: 0.3 }}
              locations={[0, 0.1, 0.1, 0.45, 0.9, 0.1]}
            />
            <View style={styles.content}>
              {/* Success Icon Circle */}
              <View style={styles.iconCircle}>
                <View style={styles.checkmark} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Button */}
              <GradientButton
                text={buttonText}
                onPress={onButtonPress}
                containerStyle={styles.button}
              />
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dialogContainer: {
    width: '100%',
    aspectRatio: 0.98,
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#46B649',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmark: {
    width: 44,
    height: 20,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderColor: 'white',
    transform: [{ rotate: '-45deg' }],
    marginTop: -4,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
  },
}); 