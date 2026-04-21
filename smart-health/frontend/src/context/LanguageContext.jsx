import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'app_language';

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', locale: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
  { code: 'te', label: 'తెలుగు', locale: 'te-IN' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LANGUAGE_OPTIONS.some((option) => option.code === saved) ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    options: LANGUAGE_OPTIONS,
    locale: LANGUAGE_OPTIONS.find((option) => option.code === language)?.locale || 'en-IN',
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
