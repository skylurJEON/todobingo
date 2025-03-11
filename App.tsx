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
