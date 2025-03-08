import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../atoms/tasksAtom';
import i18n from 'i18next';

export const getTasksKey = (size: number) => `tasks_${size}x${size}`;

export const loadTasks = async (size: number): Promise<Task[]> => {
  const key = getTasksKey(size);
  const savedTasks = await AsyncStorage.getItem(key);
  if (savedTasks) return JSON.parse(savedTasks);

  const initialTasks = getDefaultTasks(size); // 샘플 데이터
  await saveTasks(size, initialTasks); // 최초 사용 시 저장
  return initialTasks;
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