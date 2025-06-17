// React Native Internationalization Setup
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

// Import translation files
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';

// Get device language
const getDeviceLanguage = (): string => {
  const locale = RNLocalize.getLocales()[0];
  return locale?.languageCode || 'en';
};

// Get device region for currency detection
const getDeviceRegion = (): string => {
  const locale = RNLocalize.getLocales()[0];
  return locale?.countryCode || 'AE';
};

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Language resources
const resources = {
  en: {
    common: enCommon
  },
  ar: {
    common: arCommon
  }
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'app_language';
const CURRENCY_STORAGE_KEY = 'app_currency';

// Default currency mapping by region
const REGION_CURRENCY_MAP = {
  'AE': 'AED', // UAE
  'SA': 'SAR', // Saudi Arabia
  'QA': 'QAR', // Qatar
  'KW': 'KWD', // Kuwait
  'BH': 'BHD', // Bahrain
  'OM': 'OMR', // Oman
  'US': 'USD', // United States
  'GB': 'GBP', // United Kingdom
  'EU': 'EUR', // European Union
  'SG': 'SGD', // Singapore
  'IN': 'INR'  // India
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: __DEV__,
    
    // Namespace configuration
    ns: ['common'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React Native already escapes values
    },
    
    // React i18next options
    react: {
      useSuspense: false,
    }
  });

// Language utilities
export const LanguageUtils = {
  // Get available languages
  getAvailableLanguages: () => [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪' }
  ],

  // Check if language is RTL
  isRTL: (language?: string): boolean => {
    const lang = language || i18n.language;
    return RTL_LANGUAGES.includes(lang);
  },

  // Get text direction
  getTextDirection: (language?: string): 'ltr' | 'rtl' => {
    return LanguageUtils.isRTL(language) ? 'rtl' : 'ltr';
  },

  // Get layout direction (for React Native)
  getLayoutDirection: (language?: string) => {
    return LanguageUtils.isRTL(language) ? 'rtl' : 'ltr';
  },

  // Change language
  changeLanguage: async (languageCode: string): Promise<void> => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      
      // Update RTL layout for React Native
      if (Platform.OS === 'android') {
        // For Android, we need to restart the app or use a library like react-native-restart
        console.log('Language changed to:', languageCode);
      } else if (Platform.OS === 'ios') {
        // For iOS, RTL is handled automatically
        console.log('Language changed to:', languageCode);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  },

  // Load saved language preference
  loadSavedLanguage: async (): Promise<void> => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && resources[savedLanguage]) {
        await i18n.changeLanguage(savedLanguage);
      } else {
        // Use device language if available
        const deviceLanguage = getDeviceLanguage();
        if (resources[deviceLanguage]) {
          await i18n.changeLanguage(deviceLanguage);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLanguage);
        }
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  },

  // Get current language info
  getCurrentLanguageInfo: () => {
    const languages = LanguageUtils.getAvailableLanguages();
    return languages.find(lang => lang.code === i18n.language) || languages[0];
  }
};

// Currency utilities
export const CurrencyUtils = {
  // Get default currency based on region
  getDefaultCurrency: (): string => {
    const region = getDeviceRegion();
    return REGION_CURRENCY_MAP[region] || 'AED';
  },

  // Get available currencies
  getAvailableCurrencies: () => [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', primary: true },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', region: 'GCC' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦', region: 'GCC' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', region: 'GCC' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', region: 'International' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', region: 'International' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', region: 'International' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', region: 'International' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', region: 'Emerging' }
  ],

  // Save currency preference
  saveCurrencyPreference: async (currencyCode: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  },

  // Load saved currency preference
  loadSavedCurrency: async (): Promise<string> => {
    try {
      const savedCurrency = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      return savedCurrency || CurrencyUtils.getDefaultCurrency();
    } catch (error) {
      console.error('Error loading saved currency:', error);
      return CurrencyUtils.getDefaultCurrency();
    }
  },

  // Format currency amount
  formatCurrency: (amount: number, currencyCode: string, language?: string): string => {
    const lang = language || i18n.language;
    const locale = lang === 'ar' ? 'ar-AE' : 'en-US';
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const currency = CurrencyUtils.getAvailableCurrencies().find(c => c.code === currencyCode);
      const symbol = currency?.symbol || currencyCode;
      return `${symbol} ${amount.toLocaleString()}`;
    }
  },

  // Format number for Arabic numerals if needed
  formatNumber: (number: number, useArabicNumerals: boolean = false): string => {
    if (useArabicNumerals && i18n.language === 'ar') {
      return new Intl.NumberFormat('ar-AE', {
        numberingSystem: 'arab'
      }).format(number);
    }
    return number.toLocaleString();
  }
};

// RTL layout utilities for React Native
export const RTLUtils = {
  // Get flex direction for RTL
  getFlexDirection: (direction: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row') => {
    const isRTL = LanguageUtils.isRTL();
    if (direction === 'row' && isRTL) return 'row-reverse';
    if (direction === 'row-reverse' && isRTL) return 'row';
    return direction;
  },

  // Get text alignment
  getTextAlign: (align: 'left' | 'right' | 'center' | 'auto' = 'left') => {
    const isRTL = LanguageUtils.isRTL();
    if (align === 'left' && isRTL) return 'right';
    if (align === 'right' && isRTL) return 'left';
    return align;
  },

  // Get positioning (for absolute positioned elements)
  getPosition: (side: 'left' | 'right', value: number) => {
    const isRTL = LanguageUtils.isRTL();
    if (side === 'left' && isRTL) return { right: value };
    if (side === 'right' && isRTL) return { left: value };
    return { [side]: value };
  },

  // Get margin/padding for logical properties
  getSpacing: (side: 'start' | 'end' | 'left' | 'right', value: number, type: 'margin' | 'padding' = 'margin') => {
    const isRTL = LanguageUtils.isRTL();
    let actualSide = side;
    
    if (side === 'start') actualSide = isRTL ? 'right' : 'left';
    if (side === 'end') actualSide = isRTL ? 'left' : 'right';
    
    return { [`${type}${actualSide.charAt(0).toUpperCase() + actualSide.slice(1)}`]: value };
  },

  // Get icon rotation for directional icons
  getIconRotation: (iconName: string): { transform: { scaleX: number }[] } | {} => {
    const isRTL = LanguageUtils.isRTL();
    const rtlIcons = ['arrow-left', 'arrow-right', 'chevron-left', 'chevron-right'];
    
    if (isRTL && rtlIcons.some(icon => iconName.includes(icon))) {
      return { transform: [{ scaleX: -1 }] };
    }
    return {};
  }
};

// Theme utilities for RTL
export const ThemeUtils = {
  // Get theme direction
  getThemeDirection: () => ({
    direction: LanguageUtils.getTextDirection(),
    writingDirection: LanguageUtils.isRTL() ? 'rtl' : 'ltr'
  }),

  // Get shadow position for RTL
  getShadowOffset: (offsetX: number, offsetY: number) => {
    const isRTL = LanguageUtils.isRTL();
    return {
      shadowOffset: {
        width: isRTL ? -offsetX : offsetX,
        height: offsetY
      }
    };
  }
};

// Initialize language and currency on app start
export const initializeLocalization = async (): Promise<void> => {
  try {
    await LanguageUtils.loadSavedLanguage();
    console.log('Localization initialized with language:', i18n.language);
  } catch (error) {
    console.error('Error initializing localization:', error);
  }
};

export default i18n;