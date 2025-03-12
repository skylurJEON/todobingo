import { Task } from '../atoms/tasksAtom';

export const randomizeTasks = (tasks: Task[]): Task[] => {
  return tasks
    .map((task) => ({ ...task, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort, ...task }) => task);
}; 