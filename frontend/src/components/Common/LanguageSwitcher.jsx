import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../../hooks/useRTL';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const { isRTL, direction } = useRTL();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      direction: 'ltr'
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇦🇪',
      direction: 'rtl'
    }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);
      
      // Update document direction and attributes
      const selectedLang = languages.find(lang => lang.code === languageCode);
      if (selectedLang) {
        document.documentElement.dir = selectedLang.direction;
        document.documentElement.lang = languageCode;
        
        // Add/remove RTL class
        if (selectedLang.direction === 'rtl') {
          document.documentElement.classList.add('rtl');
        } else {
          document.documentElement.classList.remove('rtl');
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Language Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white 
          border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none 
          focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200
          ${isRTL ? 'flex-row-reverse' : ''}
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className={`w-4 h-4 text-gray-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
        <span className="flex items-center">
          <span className={`text-lg ${isRTL ? 'ml-2' : 'mr-2'}`}>
            {currentLanguage.flag}
          </span>
          <span className="hidden sm:block">
            {currentLanguage.nativeName}
          </span>
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${isRTL ? 'mr-1' : 'ml-1'}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className={`
              absolute z-50 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg 
              ring-1 ring-black ring-opacity-5 focus:outline-none
              ${isRTL ? 'left-0' : 'right-0'}
            `}
          >
            <div className="py-1">
              {/* Header */}
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                {t('language.selectLanguage')}
              </div>
              
              {/* Language Options */}
              {languages.map((language) => {
                const isSelected = language.code === i18n.language;
                
                return (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150
                      ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      ${isRTL ? 'text-right' : 'text-left'}
                    `}
                  >
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-lg ${isRTL ? 'ml-3' : 'mr-3'}`}>
                          {language.flag}
                        </span>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-medium">
                            {language.nativeName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {language.name}
                          </div>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{t('common.language')}</span>
                <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                  {currentLanguage.direction.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;