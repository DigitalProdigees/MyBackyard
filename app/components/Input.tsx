import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, Image, KeyboardTypeOptions } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  keyboardType,
  autoCapitalize,
}: InputProps) => {
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, multiline && styles.multilineContainer]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          style={[styles.input, multiline && styles.multilineInput]}
          secureTextEntry={secureTextEntry && !isSecureTextVisible}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setIsSecureTextVisible(!isSecureTextVisible)}
            style={styles.eyeIcon}
          >
            <Image
              source={require('../../assets/images/eye-icon.svg')}
              style={styles.icon}
            />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: colors.input.background,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  input: {
    ...typography.input,
    color: colors.text.primary,
    flex: 1,
    height: 50,
  },
  multilineInput: {
    height: 'auto',
    minHeight: 100,
  },
  eyeIcon: {
    padding: 8,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: colors.text.disabled,
  },
  error: {
    ...typography.caption,
    color: 'red',
    marginTop: 4,
  },
}); 