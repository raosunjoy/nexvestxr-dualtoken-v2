import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enUAE from '../locales/en/uae.json';
import arCommon from '../locales/ar/common.json';
import arUAE from '../locales/ar/uae.json';

// UAE Market Configuration
const UAE_CONFIG = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'],
  rtlLanguages: ['ar'],
  fallbackLanguage: 'en',
  autoDetectLanguage: true,
  persistLanguage: true
};

// Translation resources
const resources = {
  en: {
    common: enCommon,
    uae: enUAE
  },
  ar: {
    common: arCommon,
    uae: arUAE
  }
};

// Language detection options for UAE market
const detectionOptions = {
  // Order and from where user language should be detected
  order: [
    'localStorage',        // Check localStorage first
    'sessionStorage',      // Then sessionStorage
    'navigator',          // Browser language
    'htmlTag',            // HTML lang attribute
    'path',               // URL path (/ar/properties)
    'subdomain'           // Subdomain (ar.propxchange.ae)
  ],

  // Keys or params to lookup language from
  lookupLocalStorage: 'i18nextLng',
  lookupSessionStorage: 'i18nextLng',
  lookupFromPathIndex: 0,
  lookupFromSubdomainIndex: 0,

  // Cache user language
  caches: ['localStorage', 'sessionStorage'],

  // Exclude certain routes from detection
  excludeCacheFor: ['cimode'],

  // Check for country-specific languages
  checkWhitelist: true,

  // Fallback options
  fallbackLng: UAE_CONFIG.fallbackLanguage,

  // Convert country codes (AE -> ar-AE)
  convertDetectedLanguage: (lng) => {
    // Handle UAE-specific language detection
    if (lng === 'ae' || lng === 'AE') return 'ar';
    if (lng.startsWith('ar-')) return 'ar';
    if (lng.startsWith('en-')) return 'en';
    
    // Support for GCC countries
    const gccCountries = ['sa', 'qa', 'kw', 'om', 'bh'];
    if (gccCountries.includes(lng.toLowerCase())) {
      return 'ar'; // Default to Arabic for GCC countries
    }
    
    return lng;
  }
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Default language settings
    lng: UAE_CONFIG.defaultLanguage,
    fallbackLng: UAE_CONFIG.fallbackLanguage,
    
    // Supported languages
    supportedLngs: UAE_CONFIG.supportedLanguages,
    
    // Namespace settings
    defaultNS: 'common',
    ns: ['common', 'uae'],
    
    // Detection settings
    detection: detectionOptions,
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already does escaping
      formatSeparator: ',',
      format: function(value, format, lng) {
        // Custom formatters for UAE market
        
        // Currency formatting
        if (format === 'currency') {
          const isArabic = lng === 'ar';
          return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(value);
        }
        
        // Number formatting
        if (format === 'number') {
          const isArabic = lng === 'ar';
          return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-AE').format(value);
        }
        
        // Percentage formatting
        if (format === 'percentage') {
          const isArabic = lng === 'ar';
          return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-AE', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 2
          }).format(value / 100);
        }
        
        // Date formatting
        if (format === 'date') {
          const isArabic = lng === 'ar';
          return new Intl.DateTimeFormat(isArabic ? 'ar-AE' : 'en-AE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(value));
        }
        
        // Time formatting
        if (format === 'time') {
          const isArabic = lng === 'ar';
          return new Intl.DateTimeFormat(isArabic ? 'ar-AE' : 'en-AE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: !isArabic // 24h format for Arabic, 12h for English
          }).format(new Date(value));
        }
        
        return value;
      }
    },
    
    // React settings
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span']
    },
    
    // Debug settings (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Missing key handling
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation key: ${ns}:${key} for language: ${lng}`);
      }
    },
    
    // Pluralization rules for Arabic
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Load settings
    load: 'languageOnly', // Load 'en' instead of 'en-US'
    preload: UAE_CONFIG.supportedLanguages,
    
    // Clean code on init
    cleanCode: true,
    
    // Return empty string for missing keys in production
    returnEmptyString: process.env.NODE_ENV !== 'development',
    
    // Return key if missing in development
    returnNull: false,
    returnObjects: false
  });

// RTL Language Detection Helper
export const isRTL = (language = i18n.language) => {
  return UAE_CONFIG.rtlLanguages.includes(language);
};

// Language Direction Helper
export const getDirection = (language = i18n.language) => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

// Currency Formatting Helper
export const formatCurrency = (amount, currency = 'AED', language = i18n.language) => {
  const isArabic = language === 'ar';
  return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Number Formatting Helper
export const formatNumber = (number, language = i18n.language) => {
  const isArabic = language === 'ar';
  return new Intl.NumberFormat(isArabic ? 'ar-AE' : 'en-AE').format(number);
};

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const direction = getDirection(lng);
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;
  
  // Add/remove RTL class for CSS
  if (direction === 'rtl') {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
  
  // Update CSS custom properties
  document.documentElement.style.setProperty('--text-direction', direction);
  document.documentElement.style.setProperty('--start', direction === 'rtl' ? 'right' : 'left');
  document.documentElement.style.setProperty('--end', direction === 'rtl' ? 'left' : 'right');
});

// Set initial direction
const initialDirection = getDirection();
document.documentElement.dir = initialDirection;
document.documentElement.lang = i18n.language;
if (initialDirection === 'rtl') {
  document.documentElement.classList.add('rtl');
}

export default i18n;