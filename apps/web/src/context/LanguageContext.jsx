'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import enTranslations from '../translations/en.json';
import arTranslations from '../translations/ar.json';

const LanguageContext = createContext({
  language: 'en',
  isRTL: false,
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key) => key,
});

const translations = {
  en: enTranslations,
  ar: arTranslations,
};

export function LanguageProvider({ children, initialLocale = 'en' }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [language, setLanguageState] = useState(initialLocale);

  const setLanguage = (lang) => {
    if (lang !== 'en' && lang !== 'ar') return;
    setLanguageState(lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
  };

  const isRTL = language === 'ar';

  const t = (key) => {
    const keys = key.split('.');
    let curr = translations[language] || translations.en;
    for (const k of keys) {
      if (curr && curr[k] !== undefined) {
        curr = curr[k];
      } else {
        // Fallback to English
        let fallback = translations.en;
        for (const fbKey of keys) {
          if (fallback && fallback[fbKey] !== undefined) {
            fallback = fallback[fbKey];
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[i18n] Missing translation key: "${key}"`);
            }
            return key;
          }
        }
        return fallback;
      }
    }
    return curr;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
