'use client';

import { useAuth as useAuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function useAuth() {
  const auth = useAuthContext();
  const lang = useLanguage();

  return {
    ...auth,
    language: lang.language,
    isRTL: lang.isRTL,
    t: lang.t,
    toggleLanguage: lang.toggleLanguage,
    setLanguage: lang.setLanguage,
  };
}

export default useAuth;
