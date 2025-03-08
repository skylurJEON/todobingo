import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
import { API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID } from '@env';

// Firebase 초기화 확인 및 수행 함수
const initializeFirebase = () => {
  // 이미 초기화되었는지 확인
  if (!firebase.apps.length) {
    // Firebase 설정 직접 입력 (환경 변수 대신)
    const firebaseConfig = {
      apiKey: API_KEY,
      authDomain: AUTH_DOMAIN,
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
      //messagingSenderId: MESSAGING_SENDER_ID,
      appId: APP_ID
    };
    
    // Firebase 초기화
    firebase.initializeApp(firebaseConfig);
  }
  
  return firebase;
};

// Firebase 초기화 실행
const app = initializeFirebase();

export default app;
