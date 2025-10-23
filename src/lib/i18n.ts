import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/common.json';
import es from './locales/es/common.json';
import ht from './locales/ht/common.json';
import uk from './locales/uk/common.json';
import zh from './locales/zh/common.json';
import ar from './locales/ar/common.json';
import fr from './locales/fr/common.json';
import fa from './locales/fa/common.json';
import ru from './locales/ru/common.json';
import pt from './locales/pt/common.json';
import so from './locales/so/common.json';
import ti from './locales/ti/common.json';
import am from './locales/am/common.json';
import sw from './locales/sw/common.json';
import ur from './locales/ur/common.json';
import hi from './locales/hi/common.json';
import bn from './locales/bn/common.json';

const resources = {
  en: { common: en },
  es: { common: es },
  ht: { common: ht },
  uk: { common: uk },
  zh: { common: zh },
  ar: { common: ar },
  fr: { common: fr },
  fa: { common: fa },
  ru: { common: ru },
  pt: { common: pt },
  so: { common: so },
  ti: { common: ti },
  am: { common: am },
  sw: { common: sw },
  ur: { common: ur },
  hi: { common: hi },
  bn: { common: bn },
};

// Check if localStorage is available (fails in incognito/private browsing)
function isStorageAvailable(): boolean {
  try {
    const test = '__i18n_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const canUseStorage = isStorageAvailable();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: [...(canUseStorage ? ['localStorage'] : []), 'navigator', 'htmlTag'],
      caches: canUseStorage ? ['localStorage'] : [],
    },
  });

export default i18n;