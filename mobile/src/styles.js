// src/styles.js
import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#0a0a1a',
  secondary: '#1a1a2e', 
  tertiary: '#16213e',
  accent: '#06d6a0',
  accentBlue: '#3b82f6',
  accentPurple: '#8b45ff',
  accentRed: '#ef4444',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  positive: '#06d6a0',
  negative: '#ff6b6b',
  border: 'rgba(255, 255, 255, 0.1)',
  glassBackground: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  primaryGradient: ['#8b45ff', '#3b82f6', '#06d6a0'],
};

export const styles = StyleSheet.create({
  // Layout Styles
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingTop: 50,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 20,
  },
  
  // Card Styles
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 15,
    margin: 8,
  },
  
  // Glass Card Styles (React Native compatible)
  glassCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  
  glassCardSmall: {
    backgroundColor: colors.glassBackground,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Text Styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  mutedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  
  // Input Styles
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.secondary,
  },
  
  // Glass Input Styles
  glassInput: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: colors.text,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  
  // Button Styles
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Glass Button Styles (Note: React Native doesn't support gradients natively, use LinearGradient component)
  glassButton: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  
  // Primary Gradient Button Style (for use with LinearGradient)
  gradientButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  
  // Header Styles
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.text,
    fontWeight: '600',
  },
  
  // Chart Placeholder
  chartPlaceholder: {
    height: 200,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // List Item Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  
  // Utility Styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  margin: {
    margin: 16,
  },
  marginVertical: {
    marginVertical: 8,
  },
  marginHorizontal: {
    marginHorizontal: 16,
  },
  padding: {
    padding: 16,
  },
  
  // Status Colors
  positiveText: {
    color: colors.positive,
  },
  negativeText: {
    color: colors.negative,
  },
  
  // Enhanced Glass Header
  glassHeader: {
    backgroundColor: colors.glassBackground,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Gradient Text Style (for use with react-native-linear-gradient)
  gradientText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Enhanced Tab Container
  glassTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.glassBackground,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  
  // Enhanced Tab
  glassTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  
  glassActiveTab: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Form Validation States
  inputError: {
    borderColor: colors.accentRed,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  inputSuccess: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
  },
  
  validationText: {
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  
  validationError: {
    color: colors.accentRed,
  },
  
  validationSuccess: {
    color: colors.accent,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 15,
  },
  
  // Enhanced Dashboard Grid
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  
  dashboardItem: {
    width: '48%',
    marginBottom: 16,
  },
  
  // Icon Styles for Glass Effects
  glassIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  
  // Premium Card with enhanced glass effect
  premiumCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 24,
    padding: 25,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.accentPurple,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 25,
  },
  
  // Floating Action Button Style
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
});

