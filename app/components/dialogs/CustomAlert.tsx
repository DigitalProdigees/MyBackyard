import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GradientBackground } from '../GradientBackground';
import { colors } from '../../../theme/colors';
import { GradientButton } from '../buttons';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string; // <-- allow any label
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
}

export function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}: CustomAlertProps) {
  const getAlertColors = () => {
    switch (type) {
      case 'success':
        return {
          primary: '#46B649',
          secondary: '#2E7D2E',
          icon: '✓',
        };
      case 'error':
        return {
          primary: '#FF4757',
          secondary: '#C23616',
          icon: '✕',
        };
      case 'warning':
        return {
          primary: '#FFA502',
          secondary: '#FF6348',
          icon: '⚠',
        };
      default:
        return {
          primary: '#4F67FF',
          secondary: '#2E4BC7',
          icon: 'ℹ',
        };
    }
  };

  const alertColors = getAlertColors();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <Pressable style={styles.alertContainer} onPress={(e) => e.stopPropagation()}>
            <GradientBackground />
            <View style={styles.content}>
              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              {message && <Text style={styles.message}>{message}</Text>}

              {/* Buttons */}
              <View style={styles.buttonsContainer}>
                {buttons.map((button, index) => {
                  if (button.style === 'destructive') {
                    // ✅ Use your custom GradientButton
                    return (
                      <GradientButton
                        key={index}
                        text={button.text}
                        onPress={() => handleButtonPress(button)}
                      />
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        button.style === 'cancel' && styles.cancelButton,
                        buttons.length > 1 && index === 0 && styles.firstButton,
                      ]}
                      onPress={() => handleButtonPress(button)}
                    >
                      {/* ✅ No gradient for cancel */}

                      <Text
                        style={[
                          styles.buttonText,
                          button.style === 'cancel' && styles.cancelButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
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
    width: '85%',
    maxWidth: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  alertContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Urbanist-Bold',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'Urbanist',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 40,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  firstButton: {
    marginRight: 6,
  },
  cancelButton: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent', // ✅ make sure no background
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Urbanist-Medium',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
