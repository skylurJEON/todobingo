import { AppNavigation } from "./src/navigation/AppNavigation";
import { RecoilRoot } from 'recoil';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom } from './src/atoms/tasksAtom';
import { bingoSizeAtom } from './src/atoms/bingoSettingsAtom';
import { loadTasks } from './src/services/taskService';
import { StatusBar } from 'react-native';
import './i18n.config';

import { doc, getDoc } from 'firebase/firestore';
import { scoreAtom } from './src/atoms/scoreAtom';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const auth = getAuth();
const db = getFirestore();

const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('모든 데이터가 삭제되었습니다.');
  } catch (error) {
    console.error('데이터 삭제 중 오류 발생:', error);
  }
};

//clearAllData();

function AppDataLoader({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const bingoSize = useRecoilValue(bingoSizeAtom);
  const [scoreState, setScoreState] = useRecoilState(scoreAtom);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Firebase에서 사용자 데이터 동기화 (먼저 실행
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db as any, 'users', currentUser.uid);
          const docSnapshot = await getDoc(userDocRef);
          
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            
            // 현재 상태와 비교하여 업데이트가 필요한 경우에만 업데이트
            if (
              userData?.totalScore !== scoreState.totalScore ||
              userData?.streak !== scoreState.streak ||
              userData?.lastAttendanceDate !== scoreState.lastAttendanceDate
            ) {
              setScoreState({
                totalScore: userData?.totalScore || 0,
                bingoCount: scoreState.bingoCount, // 기존 빙고 카운트 유지
                streak: userData?.streak || 0,
                lastAttendanceDate: userData?.lastAttendanceDate || null
              });
            }
          }
        }
        
        // 로컬 태스크 데이터 로드 (나중에 실행)
        const savedTasks = await loadTasks(bingoSize);
        setTasks(savedTasks);
        
      } catch (error) {
        console.error('앱 초기화 오류:', error);
      }
    };

    initializeApp();
  }, []);

  return children;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden={true} />
      <RecoilRoot>
        <AppDataLoader>
          <AppNavigation />
        </AppDataLoader>
      </RecoilRoot>
    </GestureHandlerRootView>
  );
}
