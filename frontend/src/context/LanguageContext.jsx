'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import enTranslations from '../i18n/en.json';
import arTranslations from '../i18n/ar.json';
import { translate } from '../i18n/translator.js';

export { translate };

const LanguageContext = createContext({
  language: 'en',
  locale: 'en',
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

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    }
  }, [language]);

  const setLanguage = (lang) => {
    if (lang !== 'en' && lang !== 'ar') return;
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    startTransition(() => {
      router.refresh();
    });
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
  };

  const isRTL = language === 'ar';

  const t = (key, paramsOrFallback, maybeParams) => {
    return translate(translations, language, key, paramsOrFallback, maybeParams);
  };

  return (
    <LanguageContext.Provider value={{ language, locale: language, isRTL, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
