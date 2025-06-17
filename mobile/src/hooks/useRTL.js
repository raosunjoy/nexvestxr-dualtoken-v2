// React Native RTL Hook for Arabic Support
import { useState, useEffect, useCallback } from 'react';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LanguageUtils, RTLUtils, CurrencyUtils } from '../i18n';

export const useRTL = () => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState('ltr');

  // Update RTL state when language changes
  useEffect(() => {
    const updateRTLState = () => {
      const rtl = LanguageUtils.isRTL(i18n.language);
      setIsRTL(rtl);
      setLayoutDirection(rtl ? 'rtl' : 'ltr');
      
      // Force RTL layout for React Native
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        I18nManager.forceRTL(rtl);
        // Note: On iOS, this might require app restart to take effect
        // On Android, it should work immediately
      }
    };

    updateRTLState();
    
    // Listen for language changes
    const unsubscribe = i18n.on('languageChanged', updateRTLState);
    
    return () => {
      i18n.off('languageChanged', unsubscribe);
    };
  }, [i18n]);

  // Style helpers for RTL layout
  const getFlexDirection = useCallback((direction = 'row') => {
    return RTLUtils.getFlexDirection(direction);
  }, [isRTL]);

  const getTextAlign = useCallback((align = 'left') => {
    return RTLUtils.getTextAlign(align);
  }, [isRTL]);

  const getPosition = useCallback((side, value) => {
    return RTLUtils.getPosition(side, value);
  }, [isRTL]);

  const getSpacing = useCallback((side, value, type = 'margin') => {
    return RTLUtils.getSpacing(side, value, type);
  }, [isRTL]);

  const getIconRotation = useCallback((iconName) => {
    return RTLUtils.getIconRotation(iconName);
  }, [isRTL]);

  // Margin helpers
  const getMarginStart = useCallback((value) => {
    return isRTL ? { marginRight: value } : { marginLeft: value };
  }, [isRTL]);

  const getMarginEnd = useCallback((value) => {
    return isRTL ? { marginLeft: value } : { marginRight: value };
  }, [isRTL]);

  // Padding helpers
  const getPaddingStart = useCallback((value) => {
    return isRTL ? { paddingRight: value } : { paddingLeft: value };
  }, [isRTL]);

  const getPaddingEnd = useCallback((value) => {
    return isRTL ? { paddingLeft: value } : { paddingRight: value };
  }, [isRTL]);

  // Border helpers
  const getBorderStart = useCallback((value) => {
    return isRTL ? { borderRightWidth: value } : { borderLeftWidth: value };
  }, [isRTL]);

  const getBorderEnd = useCallback((value) => {
    return isRTL ? { borderLeftWidth: value } : { borderRightWidth: value };
  }, [isRTL]);

  // Positioning helpers
  const getLeft = useCallback((value) => {
    return isRTL ? { right: value } : { left: value };
  }, [isRTL]);

  const getRight = useCallback((value) => {
    return isRTL ? { left: value } : { right: value };
  }, [isRTL]);

  // Transform helpers
  const getTransformX = useCallback((value) => {
    return isRTL ? -value : value;
  }, [isRTL]);

  const getScaleX = useCallback((flipForRTL = false) => {
    return flipForRTL && isRTL ? -1 : 1;
  }, [isRTL]);

  // Text and content helpers
  const getWritingDirection = useCallback(() => {
    return isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  const getStartAlign = useCallback(() => {
    return isRTL ? 'right' : 'left';
  }, [isRTL]);

  const getEndAlign = useCallback(() => {
    return isRTL ? 'left' : 'right';
  }, [isRTL]);

  // Currency formatting with RTL support
  const formatCurrency = useCallback((amount, currencyCode = 'AED') => {
    return CurrencyUtils.formatCurrency(amount, currencyCode, i18n.language);
  }, [i18n.language]);

  const formatNumber = useCallback((number, useArabicNumerals = false) => {
    return CurrencyUtils.formatNumber(number, useArabicNumerals);
  }, [i18n.language]);

  // Animation helpers for RTL
  const getSlideAnimation = useCallback((direction) => {
    const slideDirections = {
      'slideInLeft': isRTL ? 'slideInRight' : 'slideInLeft',
      'slideInRight': isRTL ? 'slideInLeft' : 'slideInRight',
      'slideOutLeft': isRTL ? 'slideOutRight' : 'slideOutLeft',
      'slideOutRight': isRTL ? 'slideOutLeft' : 'slideOutRight'
    };
    return slideDirections[direction] || direction;
  }, [isRTL]);

  // Shadow helpers for RTL
  const getShadowOffset = useCallback((offsetX, offsetY) => {
    return {
      shadowOffset: {
        width: isRTL ? -offsetX : offsetX,
        height: offsetY
      }
    };
  }, [isRTL]);

  // Comprehensive style object for common RTL patterns
  const getRTLStyle = useCallback((baseStyle = {}) => {
    return {
      ...baseStyle,
      writingDirection: getWritingDirection(),
      textAlign: baseStyle.textAlign ? getTextAlign(baseStyle.textAlign) : undefined,
      flexDirection: baseStyle.flexDirection ? getFlexDirection(baseStyle.flexDirection) : undefined
    };
  }, [isRTL, getWritingDirection, getTextAlign, getFlexDirection]);

  // Icon direction helper
  const getIconDirection = useCallback((iconName) => {
    const directionalIcons = {
      'arrow-left': isRTL ? 'arrow-right' : 'arrow-left',
      'arrow-right': isRTL ? 'arrow-left' : 'arrow-right',
      'chevron-left': isRTL ? 'chevron-right' : 'chevron-left',
      'chevron-right': isRTL ? 'chevron-left' : 'chevron-right',
      'angle-left': isRTL ? 'angle-right' : 'angle-left',
      'angle-right': isRTL ? 'angle-left' : 'angle-right',
      'caret-left': isRTL ? 'caret-right' : 'caret-left',
      'caret-right': isRTL ? 'caret-left' : 'caret-right'
    };
    return directionalIcons[iconName] || iconName;
  }, [isRTL]);

  // Layout helpers for complex components
  const getRowDirection = useCallback(() => {
    return isRTL ? 'row-reverse' : 'row';
  }, [isRTL]);

  const getColumnDirection = useCallback() => {
    return 'column'; // Column direction doesn't change for RTL
  }, []);

  // Tab navigation helpers
  const getTabDirection = useCallback(() => {
    return isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  return {
    // Basic RTL state
    isRTL,
    layoutDirection,
    
    // Style helpers
    getFlexDirection,
    getTextAlign,
    getPosition,
    getSpacing,
    getIconRotation,
    
    // Margin/Padding shortcuts
    getMarginStart,
    getMarginEnd,
    getPaddingStart,
    getPaddingEnd,
    
    // Border shortcuts
    getBorderStart,
    getBorderEnd,
    
    // Position shortcuts
    getLeft,
    getRight,
    
    // Transform helpers
    getTransformX,
    getScaleX,
    
    // Text helpers
    getWritingDirection,
    getStartAlign,
    getEndAlign,
    
    // Formatting helpers
    formatCurrency,
    formatNumber,
    
    // Animation helpers
    getSlideAnimation,
    getShadowOffset,
    
    // Comprehensive helpers
    getRTLStyle,
    getIconDirection,
    getRowDirection,
    getColumnDirection,
    getTabDirection,
    
    // Language info
    currentLanguage: i18n.language,
    isArabic: i18n.language === 'ar'
  };
};

// HOC for RTL-aware components
export const withRTL = (WrappedComponent) => {
  return function RTLWrappedComponent(props) {
    const rtl = useRTL();
    return <WrappedComponent {...props} rtl={rtl} />;
  };
};

export default useRTL;