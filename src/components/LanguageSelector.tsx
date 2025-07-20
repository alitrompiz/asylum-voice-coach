
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Globe } from 'lucide-react';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { useTranslation } from 'react-i18next';

export interface Language {
  code: string;
  name: string;
  flag: string;
  primaryTTS: 'polly' | 'google' | 'openai';
  pollyVoice?: string;
  googleVoice?: string;
  openaiVoice?: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', primaryTTS: 'polly', pollyVoice: 'Joanna', googleVoice: 'en-US-Wavenet-F', openaiVoice: 'alloy' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', primaryTTS: 'polly', pollyVoice: 'Lupe', googleVoice: 'es-US-Wavenet-A', openaiVoice: 'nova' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', primaryTTS: 'polly', pollyVoice: 'Zeina', googleVoice: 'ar-XA-Wavenet-A', openaiVoice: 'alloy' },
  { code: 'fr', name: 'French', flag: '🇫🇷', primaryTTS: 'polly', pollyVoice: 'Celine', googleVoice: 'fr-FR-Wavenet-A', openaiVoice: 'shimmer' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳', primaryTTS: 'polly', pollyVoice: 'Zhiyu', googleVoice: 'cmn-CN-Wavenet-A', openaiVoice: 'alloy' },
  { code: 'fa', name: 'Persian (Farsi)', flag: '🇮🇷', primaryTTS: 'google', googleVoice: 'fa-IR-Wavenet-A', openaiVoice: 'echo' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', primaryTTS: 'polly', pollyVoice: 'Tatyana', googleVoice: 'ru-RU-Wavenet-A', openaiVoice: 'fable' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', primaryTTS: 'polly', pollyVoice: 'Camila', googleVoice: 'pt-BR-Wavenet-A', openaiVoice: 'onyx' },
  { code: 'so', name: 'Somali', flag: '🇸🇴', primaryTTS: 'google', googleVoice: 'so-SO-Wavenet-A', openaiVoice: 'nova' },
  { code: 'ti', name: 'Tigrinya', flag: '🇪🇷', primaryTTS: 'google', googleVoice: 'ti-ER-Wavenet-A', openaiVoice: 'alloy' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹', primaryTTS: 'google', googleVoice: 'am-ET-Wavenet-A', openaiVoice: 'echo' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪', primaryTTS: 'google', googleVoice: 'sw-KE-Wavenet-A', openaiVoice: 'shimmer' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰', primaryTTS: 'google', googleVoice: 'ur-PK-Wavenet-A', openaiVoice: 'fable' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', primaryTTS: 'polly', pollyVoice: 'Aditi', googleVoice: 'hi-IN-Wavenet-A', openaiVoice: 'onyx' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', primaryTTS: 'google', googleVoice: 'bn-IN-Wavenet-A', openaiVoice: 'nova' }
];

interface LanguageSelectorProps {
  selectedLanguage?: string;
  onLanguageChange?: (languageCode: string) => void;
}

export const LanguageSelector = ({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { languageCode, language, isLoading, updateLanguage, isUpdating } = useLanguagePreference();

  const handleLanguageChange = async (newLanguageCode: string) => {
    try {
      await updateLanguage(newLanguageCode);
      onLanguageChange?.(newLanguageCode);
      toast({
        title: t('language.updated'),
        description: t('language.set_to', { language: SUPPORTED_LANGUAGES.find(l => l.code === newLanguageCode)?.name }),
      });
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: t('common.error'),
        description: t('language.update_failed'),
        variant: "destructive",
      });
    }
  };

  const currentLanguageData = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);

  return (
    <div className="bg-card rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4" />
        <h3 className="text-lg font-semibold">{t('language.title')}</h3>
      </div>
      <Select 
        value={languageCode} 
        onValueChange={handleLanguageChange}
        disabled={isUpdating || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentLanguageData?.flag}</span>
              <span>{currentLanguageData?.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
