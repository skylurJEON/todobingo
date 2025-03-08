import { atom } from 'recoil';

export interface ScoreState {
  totalScore: number;
  bingoCount: number;
  streak: number;  // 연속 출석일
  lastAttendanceDate: string | null;  // 마지막 출석일 (YYYY-MM-DD 형식)
}

export const scoreAtom = atom<ScoreState>({
  key: 'scoreState',
  default: {
    totalScore: 0,
    bingoCount: 0,
    streak: 0,
    lastAttendanceDate: null,
  },
});