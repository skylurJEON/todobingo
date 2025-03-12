import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../atoms/tasksAtom';
import i18n from 'i18next';

export const getTasksKey = (size: number) => `tasks_${size}x${size}`;

export const loadTasks = async (size: number): Promise<Task[]> => {
  const key = getTasksKey(size);
  try {
    const savedTasks = await AsyncStorage.getItem(key);
    console.log('로드된 태스크 데이터:', savedTasks);
    
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      // 태스크가 비어있는지 확인
      if (parsedTasks.length > 0 && parsedTasks.some((task: Task) => task.title)) {
        return parsedTasks;
      }
    }
    
    // 저장된 태스크가 없거나 비어있으면 기본 태스크 생성
    const initialTasks = getDefaultTasks(size);
    await saveTasks(size, initialTasks);
    return initialTasks;
  } catch (error) {
    console.error('태스크 로드 중 오류:', error);
    // 오류 발생 시 기본 태스크 반환
    const initialTasks = getDefaultTasks(size);
    return initialTasks;
  }
};

export const saveTasks = async (size: number, tasks: Task[]) => {
  const key = getTasksKey(size);
  await AsyncStorage.setItem(key, JSON.stringify(tasks));
};

export const getDefaultTasks = (size: number): Task[] => {
  
  // i18n에서 현재 언어에 맞는 기본 할 일 목록 가져오기
  const getTaskList = (taskKey: string) => {
    const tasks = i18n.t(`default_tasks.${taskKey}`, { returnObjects: true }) as string[];
    return tasks;
  };

  // 빙고 크기에 따라 다른 키 사용
  const taskKey = size === 3 ? 'small' : 'large';
  const taskList = getTaskList(taskKey);
  
  return taskList.map((title, i) => ({
    id: i + 1,
    title,
    completed: false,
  }));
};