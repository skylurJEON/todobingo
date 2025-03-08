import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 번역 파일 불러오기
import ko from './src/i18n/translations/ko.json';
import en from './src/i18n/translations/en.json';
import ja from './src/i18n/translations/ja.json';
import zh from './src/i18n/translations/zh.json';

// 번역 리소스 객체
const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh }
};

// 초기 언어 설정 (동기적으로 기기 언어 확인)
let initialLanguage = 'en';
try {
  const locales = getLocales();
  const deviceLang = locales[0].languageCode;
  // 지원하는 언어인지 확인
  if (['ko', 'en', 'ja', 'zh'].includes(deviceLang)) {
    initialLanguage = deviceLang;
  }
} catch (error) {
  console.error('기기 언어 설정을 가져오는 중 오류 발생:', error);
}

// i18n 초기화
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v4',
    react: {
      useSuspense: false
    }
  });

// 저장된 언어 설정 불러와서 적용 (비동기)
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage && savedLanguage !== i18next.language) {
      i18next.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('저장된 언어 설정을 불러오는 중 오류 발생:', error);
  }
};

// 비동기적으로 저장된 언어 설정 확인
loadSavedLanguage();

export default i18next;