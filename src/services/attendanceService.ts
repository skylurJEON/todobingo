import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocalDate, getLocalDateString } from '../utils/dateUtils';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';

export const checkAttendance = async (
  currentTotalScore: number,
  currentStreak: number
): Promise<{ newTotalScore: number; newStreak: number; lastAttendanceDate: string }> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user");
  const today = getCurrentLocalDate();
  const cachedLastAttendanceDate = await AsyncStorage.getItem('localLastAttendanceDate');
  const cachedStreakStr = await AsyncStorage.getItem('localStreak');

  let localStreak = cachedStreakStr ? parseInt(cachedStreakStr) : currentStreak;
  
  if (cachedLastAttendanceDate === today) {
    return { newTotalScore: currentTotalScore, newStreak: localStreak, lastAttendanceDate: today };
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  if (cachedLastAttendanceDate === yesterdayStr) {
    localStreak += 1;
  } else {
    localStreak = 1;
  } 
  
  let attendanceBonus = 0;
  if (localStreak === 1) attendanceBonus = 50;
  else if (localStreak === 2) attendanceBonus = 60;
  else if (localStreak === 3) attendanceBonus = 70;
  else if (localStreak === 4) attendanceBonus = 80;
  else if (localStreak === 5) attendanceBonus = 90;
  else if (localStreak >= 6) attendanceBonus = 100;
  
  const newTotalScore = currentTotalScore + attendanceBonus;
  
  const db = getFirestore();
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    totalScore: newTotalScore,
    streak: localStreak,
    lastAttendanceDate: today,
    updatedAt: serverTimestamp()
  });
  
  await AsyncStorage.setItem('localLastAttendanceDate', today);
  await AsyncStorage.setItem('localStreak', localStreak.toString());
  
  return { newTotalScore, newStreak: localStreak, lastAttendanceDate: today };
};

export const initializeAttendance = async (): Promise<{ shouldCheck: boolean }> => {
  const today = getCurrentLocalDate();
  const cachedLastAttendanceDate = await AsyncStorage.getItem('localLastAttendanceDate');
  return { shouldCheck: cachedLastAttendanceDate !== today };
};

export const dailyReset = async (boardSizes: number[] = [3, 5]) => {
  const today = getCurrentLocalDate();
  const lastResetDay = await AsyncStorage.getItem('lastResetDay');
  console.log('lastResetDay', lastResetDay);
  console.log('today', today);

  if (!lastResetDay || lastResetDay !== today) {
    // 리셋 전에 현재 점수 백업
    const cachedTotalScoreStr = await AsyncStorage.getItem('cachedTotalScore');
    const cachedTotalScore = cachedTotalScoreStr ? parseInt(cachedTotalScoreStr) : 0;
    
    // 완료된 태스크만 초기화
    for (const size of boardSizes) {
      await AsyncStorage.setItem(`completedTasks_${size}`, JSON.stringify({}));
      await AsyncStorage.setItem(`lastBingoCount_${size}`, '0');
    }
    await AsyncStorage.setItem('lastResetDay', today);
    await AsyncStorage.removeItem('lastRandomizeDate');

    // 중요: 점수는 항상 로컬 캐시에 보존
    if (cachedTotalScore > 0) {
      await AsyncStorage.setItem('cachedTotalScore', cachedTotalScore.toString());
      console.log('일일 리셋 후 점수 보존:', cachedTotalScore);
    }

    // Firebase 업데이트는 필요한 경우에만
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && cachedTotalScore > 0) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        const firebaseTotalScore = userData?.totalScore || 0;
        
        // Firebase 점수가 로컬보다 낮은 경우에만 업데이트
        if (cachedTotalScore > firebaseTotalScore) {
          await updateDoc(userDocRef, {
            totalScore: cachedTotalScore,
            streak: userData?.streak || 0,
            lastAttendanceDate: userData?.lastAttendanceDate || null,
            updatedAt: serverTimestamp()
          });
          console.log('Firebase 점수 업데이트 (로컬이 더 높음):', cachedTotalScore);
        }
      }
    }
  }
};