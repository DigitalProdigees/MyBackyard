import { Dimensions, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
const { width, height } = Dimensions.get('window');

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: Math.min(height * 0.03, 24), // Responsive vertical padding
  },
  content: {
    flex: 1,
    marginTop: Math.min(height * 0.11, 88), // Responsive top padding
    paddingHorizontal: Math.min(width * 0.08, 30),
  },
  backButton: {
    position: 'absolute',
    top: Math.min(height * 0.08, 60),
    left: Math.min(width * 0.08, 30),
    zIndex: 1,
  },
  header: {
    marginTop: Math.min(height * 0.15, 120),
    marginBottom: Math.min(height * 0.03, 24),
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: Math.min(width * 0.08, 34),
    color: colors.text.primary,
    marginBottom: Math.min(height * 0.01, 3),
    lineHeight: Math.min(width * 0.09, 41),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: Math.min(width * 0.045, 18),
    color: '#FFFFFF90',
    lineHeight: Math.min(width * 0.055, 22),
    textAlign: 'center',
  },
  inputContainer: {},
  inputLabel: {
    color: colors.text.primary,
    fontFamily: 'Urbanist-Medium',
    fontSize: Math.min(width * 0.035, 14),
    marginBottom: Math.min(height * 0.01, 8),
    marginLeft: Math.min(width * 0.01, 4),
  },
  input: {
    height: Math.min(height * 0.08, 66),
    backgroundColor: '#202857',
    borderRadius: Math.min(width * 0.04, 16),
    paddingHorizontal: Math.min(width * 0.06,18),
    marginBottom: Math.min(height * 0.02, 16),
  },
  inputText: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: 'Urbanist-SemiBold',
    fontSize: Math.min(width * 0.04, 16),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: Math.min(height * 0.01, 8),
  },
  forgotPasswordText: {
    color: colors.text.secondary,
    fontFamily: 'Urbanist-Medium',
    fontSize: Math.min(width * 0.035, 14),
  },
  loginButton: {
    width: '100%',
    height: Math.min(height * 0.07, 56),
    marginTop: Math.min(height * 0.04, 32),
  },
  buttons: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: Math.min(height * 0.025, 20),
  },
  buttonSpacing: {
    height: Math.min(height * 0.02, 16),
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 25,
  },
  footerText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: Math.min(width * 0.042, 17),
    color: colors.text.secondary,
    marginBottom: Math.min(height * 0.02, 16),
    lineHeight: Math.min(width * 0.05, 20),
  },
  nextButtonContainer: {
    width: '100%',
    height: Math.min(height * 0.07, 56),
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: 'Urbanist-Medium',
    fontSize: Math.min(width * 0.035, 14),
    marginTop: Math.min(height * 0.004, 3),
    marginBottom: Math.min(height * 0.02, 16),
    marginLeft: Math.min(width * 0.01, 4),
  },
});
