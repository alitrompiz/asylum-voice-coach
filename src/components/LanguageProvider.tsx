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
    if (!isLoading && languageCode && i18n.language !== languageCode) {
      i18n.changeLanguage(languageCode);
    }
  }, [languageCode, isLoading, i18n]);

  return <>{children}</>;
};