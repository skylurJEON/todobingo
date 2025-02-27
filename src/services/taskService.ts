import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../atoms/tasksAtom';

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
    return size === 3
      ? ['1', '2', '3', '4', '5', '6', '7', '8'].map((title, i) => ({
          id: i + 1,
          title,
          completed: false,
        }))
      : ['1', 
        '2', 
        '3', 
        '4', 
        '5', 
        '6', 
        '7', 
        '8', 
        '9', 
        '10', 
        '11', 
        '12', 
        '13', 
        '14', 
        '15', 
        '16', 
        '17', 
        '18', 
        '19', 
        '20', 
        '21', 
        '22', 
        '23', 
        '24', ].map((title, i) => ({
          id: i + 1,
          title,
          completed: false,
        }));
  };