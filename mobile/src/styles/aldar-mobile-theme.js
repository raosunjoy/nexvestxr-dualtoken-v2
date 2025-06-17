// Aldar Properties Mobile Theme
// Based on official brand guidelines and React Native StyleSheet

import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Aldar Official Brand Colors
export const aldarColors = {
  // Primary Brand Colors
  black: '#000000',
  white: '#FFFFFF',
  frameGray: '#333333',
  
  // Dynamic Tones (Accent Colors)
  blue: '#0066CC',
  blueLight: '#E6F2FF',
  blueDark: '#004080',
  
  green: '#00A651',
  greenLight: '#E6F7ED',
  greenDark: '#007A3D',
  
  orange: '#FF6B35',
  orangeLight: '#FFE8E1',
  orangeDark: '#E5522A',
  
  purple: '#8B5CF6',
  purpleLight: '#F3EFFF',
  purpleDark: '#7C3AED',
  
  // Neutral Palette
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Semantic Colors
  success: '#00A651',
  warning: '#FF6B35',
  error: '#EF4444',
  info: '#0066CC',
};

// Aldar Typography System
export const aldarFonts = {
  // Font Families (React Native compatible)
  primary: isIOS ? 'Poppins' : 'Poppins-Regular',
  primaryBold: isIOS ? 'Poppins-Bold' : 'Poppins-Bold',
  primarySemiBold: isIOS ? 'Poppins-SemiBold' : 'Poppins-SemiBold',
  primaryMedium: isIOS ? 'Poppins-Medium' : 'Poppins-Medium',
  primaryLight: isIOS ? 'Poppins-Light' : 'Poppins-Light',
  
  // Arabic Font Support
  arabic: isIOS ? 'Almarai' : 'Almarai-Regular',
  arabicBold: isIOS ? 'Almarai-Bold' : 'Almarai-Bold',
  
  // Secondary Fonts
  secondary: isIOS ? 'Inter' : 'Inter-Regular',
  secondaryBold: isIOS ? 'Inter-Bold' : 'Inter-Bold',
  secondarySemiBold: isIOS ? 'Inter-SemiBold' : 'Inter-SemiBold',
};

// Aldar Spacing System
export const aldarSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

// Aldar Border Radius
export const aldarRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 50,
};

// Aldar Shadows
export const aldarShadows = {
  sm: {
    shadowColor: aldarColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: aldarColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: aldarColors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Aldar Mobile Theme Styles
export const aldarStyles = StyleSheet.create({
  // ===============================================
  // Container Styles
  // ===============================================
  
  container: {
    flex: 1,
    backgroundColor: aldarColors.white,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: aldarColors.white,
  },
  
  contentContainer: {
    flex: 1,
    paddingHorizontal: aldarSpacing.lg,
  },
  
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: aldarSpacing.xxxl,
  },
  
  // ===============================================
  // Aldar Header Styles
  // ===============================================
  
  header: {
    backgroundColor: aldarColors.white,
    paddingHorizontal: aldarSpacing.lg,
    paddingVertical: aldarSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: aldarColors.gray200,
    ...aldarShadows.sm,
  },
  
  headerTitle: {
    fontFamily: aldarFonts.primarySemiBold,
    fontSize: 18,
    color: aldarColors.black,
    textAlign: 'center',
  },
  
  headerSubtitle: {
    fontFamily: aldarFonts.secondary,
    fontSize: 14,
    color: aldarColors.gray600,
    textAlign: 'center',
    marginTop: 2,
  },
  
  // ===============================================
  // Aldar Typography Styles
  // ===============================================
  
  headingXL: {
    fontFamily: aldarFonts.primaryBold,
    fontSize: 32,
    lineHeight: 40,
    color: aldarColors.black,
    marginBottom: aldarSpacing.md,
  },
  
  headingLG: {
    fontFamily: aldarFonts.primarySemiBold,
    fontSize: 28,
    lineHeight: 36,
    color: aldarColors.black,
    marginBottom: aldarSpacing.md,
  },
  
  headingMD: {
    fontFamily: aldarFonts.primarySemiBold,
    fontSize: 22,
    lineHeight: 28,
    color: aldarColors.black,
    marginBottom: aldarSpacing.sm,
  },
  
  headingSM: {
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 18,
    lineHeight: 24,
    color: aldarColors.black,
    marginBottom: aldarSpacing.sm,
  },
  
  bodyLG: {
    fontFamily: aldarFonts.secondary,
    fontSize: 16,
    lineHeight: 24,
    color: aldarColors.gray700,
  },
  
  body: {
    fontFamily: aldarFonts.secondary,
    fontSize: 14,
    lineHeight: 22,
    color: aldarColors.gray700,
  },
  
  bodySM: {
    fontFamily: aldarFonts.secondary,
    fontSize: 12,
    lineHeight: 18,
    color: aldarColors.gray600,
  },
  
  caption: {
    fontFamily: aldarFonts.secondary,
    fontSize: 10,
    lineHeight: 14,
    color: aldarColors.gray500,
  },
  
  // ===============================================
  // Aldar Button Styles
  // ===============================================
  
  buttonBase: {
    paddingHorizontal: aldarSpacing.xl,
    paddingVertical: aldarSpacing.md,
    borderRadius: aldarRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  
  buttonPrimary: {
    backgroundColor: aldarColors.black,
    ...aldarShadows.sm,
  },
  
  buttonSecondary: {
    backgroundColor: aldarColors.white,
    borderWidth: 1,
    borderColor: aldarColors.gray300,
    ...aldarShadows.sm,
  },
  
  buttonBlue: {
    backgroundColor: aldarColors.blue,
    ...aldarShadows.sm,
  },
  
  buttonGreen: {
    backgroundColor: aldarColors.green,
    ...aldarShadows.sm,
  },
  
  buttonOrange: {
    backgroundColor: aldarColors.orange,
    ...aldarShadows.sm,
  },
  
  buttonDisabled: {
    backgroundColor: aldarColors.gray300,
    opacity: 0.6,
  },
  
  buttonTextPrimary: {
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 14,
    color: aldarColors.white,
  },
  
  buttonTextSecondary: {
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 14,
    color: aldarColors.black,
  },
  
  buttonSmall: {
    paddingHorizontal: aldarSpacing.md,
    paddingVertical: aldarSpacing.sm,
    minHeight: 36,
  },
  
  buttonLarge: {
    paddingHorizontal: aldarSpacing.xxxl,
    paddingVertical: aldarSpacing.lg,
    minHeight: 56,
  },
  
  buttonTextSmall: {
    fontSize: 12,
  },
  
  buttonTextLarge: {
    fontSize: 16,
  },
  
  // ===============================================
  // Aldar Card Styles
  // ===============================================
  
  card: {
    backgroundColor: aldarColors.white,
    borderRadius: aldarRadius.lg,
    borderWidth: 1,
    borderColor: aldarColors.gray200,
    ...aldarShadows.sm,
    overflow: 'hidden',
  },
  
  cardHeader: {
    padding: aldarSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: aldarColors.gray200,
    backgroundColor: aldarColors.gray50,
  },
  
  cardBody: {
    padding: aldarSpacing.lg,
  },
  
  cardFooter: {
    padding: aldarSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: aldarColors.gray200,
    backgroundColor: aldarColors.gray50,
  },
  
  // Property Card Specific
  propertyCard: {
    backgroundColor: aldarColors.white,
    borderRadius: aldarRadius.lg,
    borderWidth: 1,
    borderColor: aldarColors.gray200,
    ...aldarShadows.md,
    overflow: 'hidden',
    marginBottom: aldarSpacing.lg,
  },
  
  propertyCardHeader: {
    height: 4,
    backgroundColor: aldarColors.blue,
  },
  
  propertyCardGradientHeader: {
    height: 4,
    backgroundColor: aldarColors.blue, // Fallback, will be overridden with gradient
  },
  
  propertyPrice: {
    fontFamily: aldarFonts.primaryBold,
    fontSize: 24,
    color: aldarColors.black,
    marginBottom: aldarSpacing.xs,
  },
  
  propertyLocation: {
    fontFamily: aldarFonts.secondary,
    fontSize: 14,
    color: aldarColors.gray600,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  propertyDeveloper: {
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 12,
    color: aldarColors.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // ===============================================
  // Aldar Form Styles
  // ===============================================
  
  formGroup: {
    marginBottom: aldarSpacing.lg,
  },
  
  label: {
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 14,
    color: aldarColors.gray700,
    marginBottom: aldarSpacing.xs,
  },
  
  input: {
    borderWidth: 1,
    borderColor: aldarColors.gray300,
    borderRadius: aldarRadius.md,
    paddingHorizontal: aldarSpacing.md,
    paddingVertical: aldarSpacing.md,
    fontFamily: aldarFonts.secondary,
    fontSize: 14,
    color: aldarColors.black,
    backgroundColor: aldarColors.white,
    minHeight: 48,
  },
  
  inputFocused: {
    borderColor: aldarColors.blue,
    borderWidth: 2,
  },
  
  inputError: {
    borderColor: aldarColors.error,
  },
  
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // ===============================================
  // Aldar Navigation Styles
  // ===============================================
  
  tabBar: {
    backgroundColor: aldarColors.white,
    borderTopWidth: 1,
    borderTopColor: aldarColors.gray200,
    paddingTop: aldarSpacing.sm,
    paddingBottom: isIOS ? aldarSpacing.xl : aldarSpacing.sm,
    ...aldarShadows.lg,
  },
  
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: aldarSpacing.sm,
  },
  
  tabLabel: {
    fontFamily: aldarFonts.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  
  tabLabelActive: {
    color: aldarColors.blue,
    fontFamily: aldarFonts.primaryMedium,
  },
  
  tabLabelInactive: {
    color: aldarColors.gray500,
  },
  
  // ===============================================
  // Aldar Status & Indicator Styles
  // ===============================================
  
  statusBadge: {
    paddingHorizontal: aldarSpacing.sm,
    paddingVertical: aldarSpacing.xs,
    borderRadius: aldarRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  statusSuccess: {
    backgroundColor: aldarColors.greenLight,
  },
  
  statusWarning: {
    backgroundColor: aldarColors.orangeLight,
  },
  
  statusError: {
    backgroundColor: '#FEE2E2',
  },
  
  statusInfo: {
    backgroundColor: aldarColors.blueLight,
  },
  
  statusTextSuccess: {
    color: aldarColors.green,
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 12,
  },
  
  statusTextWarning: {
    color: aldarColors.orange,
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 12,
  },
  
  statusTextError: {
    color: aldarColors.error,
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 12,
  },
  
  statusTextInfo: {
    color: aldarColors.blue,
    fontFamily: aldarFonts.primaryMedium,
    fontSize: 12,
  },
  
  // ===============================================
  // Aldar Trading Interface Styles
  // ===============================================
  
  tradingPanel: {
    backgroundColor: aldarColors.white,
    borderRadius: aldarRadius.lg,
    borderWidth: 1,
    borderColor: aldarColors.gray200,
    borderLeftWidth: 4,
    borderLeftColor: aldarColors.blue,
    ...aldarShadows.sm,
  },
  
  priceUp: {
    color: aldarColors.green,
    backgroundColor: aldarColors.greenLight,
    paddingHorizontal: aldarSpacing.xs,
    paddingVertical: 2,
    borderRadius: aldarRadius.sm,
    fontFamily: aldarFonts.primarySemiBold,
    fontSize: 12,
  },
  
  priceDown: {
    color: aldarColors.error,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: aldarSpacing.xs,
    paddingVertical: 2,
    borderRadius: aldarRadius.sm,
    fontFamily: aldarFonts.primarySemiBold,
    fontSize: 12,
  },
  
  // ===============================================
  // Aldar Utility Styles
  // ===============================================
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  spacer: {
    flex: 1,
  },
  
  divider: {
    height: 1,
    backgroundColor: aldarColors.gray200,
    marginVertical: aldarSpacing.md,
  },
  
  // Margin utilities
  mb1: { marginBottom: aldarSpacing.xs },
  mb2: { marginBottom: aldarSpacing.sm },
  mb3: { marginBottom: aldarSpacing.md },
  mb4: { marginBottom: aldarSpacing.lg },
  mb5: { marginBottom: aldarSpacing.xl },
  
  mt1: { marginTop: aldarSpacing.xs },
  mt2: { marginTop: aldarSpacing.sm },
  mt3: { marginTop: aldarSpacing.md },
  mt4: { marginTop: aldarSpacing.lg },
  mt5: { marginTop: aldarSpacing.xl },
  
  // Padding utilities
  p1: { padding: aldarSpacing.xs },
  p2: { padding: aldarSpacing.sm },
  p3: { padding: aldarSpacing.md },
  p4: { padding: aldarSpacing.lg },
  p5: { padding: aldarSpacing.xl },
  
  px1: { paddingHorizontal: aldarSpacing.xs },
  px2: { paddingHorizontal: aldarSpacing.sm },
  px3: { paddingHorizontal: aldarSpacing.md },
  px4: { paddingHorizontal: aldarSpacing.lg },
  px5: { paddingHorizontal: aldarSpacing.xl },
  
  py1: { paddingVertical: aldarSpacing.xs },
  py2: { paddingVertical: aldarSpacing.sm },
  py3: { paddingVertical: aldarSpacing.md },
  py4: { paddingVertical: aldarSpacing.lg },
  py5: { paddingVertical: aldarSpacing.xl },
});

// Aldar Responsive Utilities
export const aldarResponsive = {
  isSmallScreen: width < 375,
  isMediumScreen: width >= 375 && width < 414,
  isLargeScreen: width >= 414,
  isTablet: width >= 768,
  
  // Responsive font sizes
  fontSize: (base, scale = 0.9) => {
    if (width < 375) return Math.floor(base * scale);
    if (width >= 414) return Math.ceil(base * 1.1);
    return base;
  },
  
  // Responsive spacing
  spacing: (base, scale = 0.8) => {
    if (width < 375) return Math.floor(base * scale);
    return base;
  },
};

// Aldar Animation Configs
export const aldarAnimations = {
  fadeIn: {
    duration: 300,
    useNativeDriver: true,
  },
  slideIn: {
    duration: 250,
    useNativeDriver: true,
  },
  scale: {
    duration: 200,
    useNativeDriver: true,
  },
};

export default {
  colors: aldarColors,
  fonts: aldarFonts,
  spacing: aldarSpacing,
  radius: aldarRadius,
  shadows: aldarShadows,
  styles: aldarStyles,
  responsive: aldarResponsive,
  animations: aldarAnimations,
};