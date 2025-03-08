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

// 초기 언어 설정 
let initialLanguage = 'en';

// 저장된 언어 설정 불러오기 (비동기 함수)
const getInitialLanguage = async () => {
  try {
    // 저장된 언어 설정 확인
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage) {
      return savedLanguage;
    }
    
    // 저장된 설정이 없으면 기기 언어 사용
    try {
      const locales = getLocales();
      const deviceLang = locales[0].languageCode;
      // 지원하는 언어인지 확인
      if (['ko', 'en', 'ja', 'zh'].includes(deviceLang)) {
        return deviceLang;
      }
    } catch (error) {
      console.error('기기 언어 설정을 가져오는 중 오류 발생:', error);
    }
  } catch (error) {
    console.error('저장된 언어 설정을 불러오는 중 오류 발생:', error);
  }
  
  return initialLanguage; // 기본값 반환
};

// i18n 초기화
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: initialLanguage,
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v4',
    react: {
      useSuspense: false // 이 옵션을 추가하여 Suspense 관련 문제 방지
    }
  });

// 저장된 언어 설정 불러와서 적용
getInitialLanguage().then(language => {
  if (language) {
    i18next.changeLanguage(language);
  }
});

export default i18next;