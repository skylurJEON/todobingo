import { atom } from 'recoil';

export const bingoSizeAtom = atom<number>({
  key: 'bingoSizeAtom',
  default: 3, // 기본값: 3x3
});