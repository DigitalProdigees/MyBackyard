import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { validateField, ValidationRule, ValidationResult } from '../lib/utils/validation';
import { Icons } from '../../constants/icons';

interface ValidatedInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
  validationRules?: ValidationRule;
  error?: string | null;
  touched?: boolean;
  showError?: boolean;
  containerStyle?: any;
  icon?: any;
  rightIcon?: any;
  onRightIconPress?: () => void;
}

export function ValidatedInput({
  label,
  value,
  onChangeText,
  onValidationChange,
  validationRules,
  error,
  touched = false,
  showError = true,
  containerStyle,
  icon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...textInputProps
}: ValidatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle text change with validation
  const handleTextChange = (text: string) => {
    onChangeText(text);

    // Perform validation if rules are provided
    if (validationRules && onValidationChange) {
      const result = validateField(text, validationRules);
      onValidationChange(result);
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle password visibility toggle
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine if we should show error
  const shouldShowError = showError && error && touched;
  const hasError = Boolean(error);
  const isPasswordField = secureTextEntry || textInputProps.textContentType === 'password';

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <Text style={[styles.label, hasError && touched && styles.labelError]}>
        {label}
        {validationRules?.required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        hasError && touched && styles.inputContainerError,
      ]}>
        {/* Left Icon */}
        {icon && (
          <Image source={icon} style={styles.leftIcon} />
        )}

        {/* Text Input */}
        <TextInput
          style={[styles.input, icon && styles.inputWithLeftIcon]}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPasswordField ? !showPassword : false}
          placeholderTextColor={colors.text.secondary}
          {...textInputProps}
        />

        {/* Right Icon or Password Toggle */}
        {isPasswordField ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={togglePasswordVisibility}
          >
            <Image
              source={Icons.viewPassword}
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
          >
            <Image source={rightIcon} style={styles.rightIcon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error Message */}
      {shouldShowError && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>⚠</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Success Indicator */}
      {!hasError && value.length > 0 && touched && (
        <View style={styles.successContainer}>
          <Image source={require('../../assets/icons/tick.png')} style={styles.successIcon} />
          <Text style={styles.successText}>Looks good!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: colors.text.primary,
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelError: {
    color: '#FF4757',
  },
  required: {
    color: '#FF4757',
  },
  inputContainer: {
    height: 56,
    backgroundColor: '#202857',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerFocused: {
    borderColor: '#46B649',
    backgroundColor: 'rgba(70, 182, 73, 0.1)',
  },
  inputContainerError: {
    borderColor: '#FF4757',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  leftIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: colors.text.secondary,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: 'Urbanist-Medium',
    fontSize: 16,
    paddingVertical: 0,
  },
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  rightIconContainer: {
    padding: 4,
  },
  rightIcon: {
    width: 20,
    height: 20,
    tintColor: colors.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF4757',
    fontFamily: 'Urbanist',
    fontSize: 13,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  successIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: '#46B649',
  },
  successText: {
    color: '#46B649',
    fontFamily: 'Urbanist',
    fontSize: 13,
  },
}); 