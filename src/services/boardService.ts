import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../atoms/tasksAtom';
import { loadTasks } from './taskService';
import { getCurrentLocalDate, getLocalDateString } from '../utils/dateUtils';
import { randomizeTasks } from '../utils/bingoUtils';

export const syncTasksWithBoard = async (
  tasks: Task[],
  bingoSize: number,
  t: (key: string) => string
): Promise<Task[]> => {
  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);
  const currentDateStr = getCurrentLocalDate();
  const lastRandomizeDate = await AsyncStorage.getItem('lastRandomizeDate');
  const sizeKey = `bingoSize_${bingoSize}`;
  const lastSizeKey = await AsyncStorage.getItem('lastBingoSizeKey');
  
  let currentTasks = [...tasks];
  const hasEmptyTasks = currentTasks.length === 0 || currentTasks.every(task => !task.title);
  if (hasEmptyTasks) {
    const savedTasksJson = await AsyncStorage.getItem(`tasks_${bingoSize}x${bingoSize}`);
    if (savedTasksJson) {
      currentTasks = JSON.parse(savedTasksJson);
    } else {
      const defaultTasks = await loadTasks(bingoSize);
      currentTasks = defaultTasks;
    }
  }
   
  // 사이즈 변경 시 기본 태스크 로드
  if (sizeKey !== lastSizeKey) {
    const defaultTasks = await loadTasks(bingoSize);
    currentTasks = defaultTasks;
    await AsyncStorage.setItem('lastBingoSizeKey', sizeKey);
  }
  
  const needsRandomize = !lastRandomizeDate || lastRandomizeDate !== currentDateStr;
  if (needsRandomize) {
    const existingTasks = currentTasks.slice(0, totalCells - 1);
    if (existingTasks.length === 0 || existingTasks.every(task => !task.title)) {
      const defaultTasks = await loadTasks(bingoSize);
      currentTasks = defaultTasks;
    }
    const randomizedTasks = randomizeTasks(existingTasks);
    currentTasks = randomizedTasks;
    await AsyncStorage.setItem(`tasks_${bingoSize}x${bingoSize}`, JSON.stringify(randomizedTasks));
    await AsyncStorage.setItem('lastRandomizeDate', currentDateStr);
  }
  
  const completedTasksJson = await AsyncStorage.getItem(`completedTasks_${bingoSize}`);
  const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
  const savedBingoCountStr = await AsyncStorage.getItem(`lastBingoCount_${bingoSize}`);
  
  const filledBoard: Task[] = Array.from({ length: totalCells }, (_, i) => {
    if (i === centerIndex) {
      return { 
        id: 9999, 
        title: t('bingo.praise'), 
        completed: completedTasks[9999] || false 
      };
    }
    let taskIndex = i;
    if (i > centerIndex) taskIndex = i - 1;
    const task = currentTasks[taskIndex] || { id: -(i + 1), title: '', completed: false };
    return { ...task, completed: completedTasks[task.id] || false };
  });
  
  return filledBoard;
};