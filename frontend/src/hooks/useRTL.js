import { useState, useEffect, useContext, createContext } from 'react';
import { useTranslation } from 'react-i18next';

// RTL Context
const RTLContext = createContext();

// RTL Provider Component
export const RTLProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(false);
  const [direction, setDirection] = useState('ltr');
  const [textAlign, setTextAlign] = useState('left');

  // RTL languages
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

  useEffect(() => {
    const currentLanguage = i18n.language || 'en';
    const shouldBeRTL = rtlLanguages.includes(currentLanguage);
    
    setIsRTL(shouldBeRTL);
    setDirection(shouldBeRTL ? 'rtl' : 'ltr');
    setTextAlign(shouldBeRTL ? 'right' : 'left');

    // Update document direction
    document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;

    // Add RTL class to body for CSS styling
    if (shouldBeRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }

    // Update CSS custom properties for dynamic styling
    document.documentElement.style.setProperty('--text-direction', direction);
    document.documentElement.style.setProperty('--text-align', textAlign);
    document.documentElement.style.setProperty('--start', shouldBeRTL ? 'right' : 'left');
    document.documentElement.style.setProperty('--end', shouldBeRTL ? 'left' : 'right');

  }, [i18n.language]);

  // Helper functions for RTL-aware styling
  const getDirection = () => direction;
  const getTextAlign = () => textAlign;
  const getFloat = (side) => {
    if (side === 'start') return isRTL ? 'right' : 'left';
    if (side === 'end') return isRTL ? 'left' : 'right';
    return side;
  };

  const getMargin = (side, value) => {
    if (side === 'start') return isRTL ? { marginRight: value } : { marginLeft: value };
    if (side === 'end') return isRTL ? { marginLeft: value } : { marginRight: value };
    return { [`margin${side.charAt(0).toUpperCase() + side.slice(1)}`]: value };
  };

  const getPadding = (side, value) => {
    if (side === 'start') return isRTL ? { paddingRight: value } : { paddingLeft: value };
    if (side === 'end') return isRTL ? { paddingLeft: value } : { paddingRight: value };
    return { [`padding${side.charAt(0).toUpperCase() + side.slice(1)}`]: value };
  };

  const getBorder = (side, value) => {
    if (side === 'start') return isRTL ? { borderRight: value } : { borderLeft: value };
    if (side === 'end') return isRTL ? { borderLeft: value } : { borderRight: value };
    return { [`border${side.charAt(0).toUpperCase() + side.slice(1)}`]: value };
  };

  const getPosition = (side, value) => {
    if (side === 'start') return isRTL ? { right: value } : { left: value };
    if (side === 'end') return isRTL ? { left: value } : { right: value };
    return { [side]: value };
  };

  // RTL-aware flex direction
  const getFlexDirection = (direction) => {
    if (direction === 'row' && isRTL) return 'row-reverse';
    if (direction === 'row-reverse' && isRTL) return 'row';
    return direction;
  };

  // RTL-aware transform
  const getTransform = (transform) => {
    if (isRTL && transform.includes('translateX')) {
      return transform.replace(/translateX\(([^)]+)\)/g, (match, value) => {
        const numValue = parseFloat(value);
        return `translateX(${-numValue}${value.replace(numValue.toString(), '')})`;
      });
    }
    return transform;
  };

  // Currency and number formatting for Arabic
  const formatNumber = (number, options = {}) => {
    const locale = isRTL ? 'ar-AE' : 'en-US';
    const formatOptions = {
      useGrouping: true,
      ...options
    };

    // Use Arabic-Indic numerals for Arabic locale if specified
    if (isRTL && options.useArabicNumerals) {
      formatOptions.numberingSystem = 'arab';
    }

    return new Intl.NumberFormat(locale, formatOptions).format(number);
  };

  const formatCurrency = (amount, currency, options = {}) => {
    const locale = isRTL ? 'ar-AE' : 'en-US';
    const formatOptions = {
      style: 'currency',
      currency: currency || 'AED',
      ...options
    };

    return new Intl.NumberFormat(locale, formatOptions).format(amount);
  };

  // Date formatting for Arabic
  const formatDate = (date, options = {}) => {
    const locale = isRTL ? 'ar-AE' : 'en-US';
    const formatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat(locale, formatOptions).format(new Date(date));
  };

  // RTL-aware animation classes
  const getAnimationClass = (baseClass) => {
    if (isRTL) {
      // Convert left/right animations for RTL
      return baseClass
        .replace('-left', '-temp')
        .replace('-right', '-left')
        .replace('-temp', '-right')
        .replace('slide-in-left', 'slide-in-right')
        .replace('slide-out-left', 'slide-out-right');
    }
    return baseClass;
  };

  // RTL-aware icon rotation
  const getIconRotation = (iconType) => {
    const rtlIcons = {
      'arrow-left': 'arrow-right',
      'arrow-right': 'arrow-left',
      'chevron-left': 'chevron-right',
      'chevron-right': 'chevron-left',
      'angle-left': 'angle-right',
      'angle-right': 'angle-left'
    };

    return isRTL && rtlIcons[iconType] ? rtlIcons[iconType] : iconType;
  };

  const value = {
    // State
    isRTL,
    direction,
    textAlign,

    // Helper functions
    getDirection,
    getTextAlign,
    getFloat,
    getMargin,
    getPadding,
    getBorder,
    getPosition,
    getFlexDirection,
    getTransform,
    getAnimationClass,
    getIconRotation,

    // Formatting functions
    formatNumber,
    formatCurrency,
    formatDate
  };

  return (
    <RTLContext.Provider value={value}>
      {children}
    </RTLContext.Provider>
  );
};

// Hook to use RTL context
export const useRTL = () => {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within an RTLProvider');
  }
  return context;
};

// RTL-aware styled components helper
export const rtlStyle = (isRTL) => ({
  direction: isRTL ? 'rtl' : 'ltr',
  textAlign: isRTL ? 'right' : 'left'
});

// RTL-aware Tailwind classes helper
export const rtlClass = (isRTL, ltrClass, rtlClass) => {
  return isRTL ? rtlClass || ltrClass.replace(/-(left|right)/g, (match, side) => 
    side === 'left' ? '-right' : '-left'
  ) : ltrClass;
};

// RTL-aware spacing helper
export const rtlSpacing = (isRTL, side, value) => {
  const mapping = {
    'left': isRTL ? 'right' : 'left',
    'right': isRTL ? 'left' : 'right',
    'start': isRTL ? 'right' : 'left',
    'end': isRTL ? 'left' : 'right'
  };

  return {
    [mapping[side] || side]: value
  };
};

// HOC for RTL-aware components
export const withRTL = (WrappedComponent) => {
  return function RTLWrappedComponent(props) {
    const rtl = useRTL();
    return <WrappedComponent {...props} rtl={rtl} />;
  };
};

// RTL-aware CSS-in-JS helper
export const rtlCSS = (isRTL) => `
  .rtl-container {
    direction: ${isRTL ? 'rtl' : 'ltr'};
    text-align: ${isRTL ? 'right' : 'left'};
  }

  .rtl-float-start {
    float: ${isRTL ? 'right' : 'left'};
  }

  .rtl-float-end {
    float: ${isRTL ? 'left' : 'right'};
  }

  .rtl-text-start {
    text-align: ${isRTL ? 'right' : 'left'};
  }

  .rtl-text-end {
    text-align: ${isRTL ? 'left' : 'right'};
  }

  .rtl-border-start {
    border-${isRTL ? 'right' : 'left'}: 1px solid;
  }

  .rtl-border-end {
    border-${isRTL ? 'left' : 'right'}: 1px solid;
  }

  .rtl-margin-start {
    margin-${isRTL ? 'right' : 'left'}: 1rem;
  }

  .rtl-margin-end {
    margin-${isRTL ? 'left' : 'right'}: 1rem;
  }

  .rtl-padding-start {
    padding-${isRTL ? 'right' : 'left'}: 1rem;
  }

  .rtl-padding-end {
    padding-${isRTL ? 'left' : 'right'}: 1rem;
  }

  .rtl-rotate-icon {
    transform: ${isRTL ? 'scaleX(-1)' : 'none'};
  }

  /* RTL-aware animations */
  @keyframes rtl-slide-in-start {
    from {
      transform: translateX(${isRTL ? '100%' : '-100%'});
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes rtl-slide-in-end {
    from {
      transform: translateX(${isRTL ? '-100%' : '100%'});
    }
    to {
      transform: translateX(0);
    }
  }

  /* RTL-aware flexbox */
  .rtl-flex-row {
    flex-direction: ${isRTL ? 'row-reverse' : 'row'};
  }

  .rtl-flex-row-reverse {
    flex-direction: ${isRTL ? 'row' : 'row-reverse'};
  }

  /* RTL-aware positioning */
  .rtl-left-0 {
    ${isRTL ? 'right' : 'left'}: 0;
  }

  .rtl-right-0 {
    ${isRTL ? 'left' : 'right'}: 0;
  }
`;

export default useRTL;