import { AppNavigation } from "./src/navigation/AppNavigation";
import { RecoilRoot } from 'recoil';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom } from './src/atoms/tasksAtom';
import { bingoSizeAtom } from './src/atoms/bingoSettingsAtom';
import { loadTasks } from './src/services/taskService';

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

  useEffect(() => {
    const fetchTasks = async () => {
      const savedTasks = await loadTasks(bingoSize);
      setTasks(savedTasks);
    };

    fetchTasks();
  }, [bingoSize]);

  return children;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RecoilRoot>
        <AppDataLoader>
          <AppNavigation />
        </AppDataLoader>
      </RecoilRoot>
    </GestureHandlerRootView>
  );
}
