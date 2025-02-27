import { atom } from 'recoil';

export interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export const tasksAtom = atom<Task[]>({
  key: 'tasksAtom',
  default: [],
});

