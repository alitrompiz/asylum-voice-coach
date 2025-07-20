import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const { i18n } = useTranslation();
  const { languageCode, isLoading } = useLanguagePreference();

  useEffect(() => {
    console.log('LanguageProvider effect:', { languageCode, isLoading, currentLang: i18n.language });
    if (!isLoading && languageCode && i18n.language !== languageCode) {
      console.log('LanguageProvider: Changing language from', i18n.language, 'to', languageCode);
      i18n.changeLanguage(languageCode);
    }
  }, [languageCode, isLoading, i18n]);

  return <>{children}</>;
};