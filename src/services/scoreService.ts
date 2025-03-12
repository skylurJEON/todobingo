import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { scoreAtom } from '../atoms/scoreAtom';


export const syncUserScoreFromFirebase = async (setScoreState: (score: any) => void) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  
  try {
    // 로컬 캐시에서 점수 읽기
    const cachedTotalScoreStr = await AsyncStorage.getItem('cachedTotalScore');
    const cachedTotalScore = cachedTotalScoreStr ? parseInt(cachedTotalScoreStr) : 0;
    
    const userDocRef = doc(getFirestore(), 'users', currentUser.uid);
    const docSnapshot = await getDoc(userDocRef);
    
    if (docSnapshot.exists) {
      const userData = docSnapshot.data();
      // 중요: 로컬 캐시된 점수와 Firebase 점수 중 더 높은 값을 사용
      const firebaseTotalScore = userData?.totalScore || 0;
      const finalTotalScore = Math.max(cachedTotalScore, firebaseTotalScore);
      const firebaseStreak = userData?.streak || 0;
      
      setScoreState((prev: any) => ({
        ...prev, 
        totalScore: finalTotalScore,
        streak: firebaseStreak,
        lastAttendanceDate: userData?.lastAttendanceDate || null
      }));
      
      // Firebase 점수가 로컬보다 낮으면 Firebase 업데이트
      if (cachedTotalScore > firebaseTotalScore) {
        await updateDoc(userDocRef, {
          totalScore: cachedTotalScore,
          updatedAt: serverTimestamp()
        });
        console.log('로컬 점수가 더 높아 Firebase 업데이트:', cachedTotalScore);
      }
      
      // 항상 로컬 캐시 업데이트
      await AsyncStorage.setItem('cachedTotalScore', finalTotalScore.toString());
      
      console.log('Firebase 동기화 완료:', {
        totalScore: finalTotalScore,
        streak: firebaseStreak,
        lastAttendanceDate: userData?.lastAttendanceDate
      });
    } else {
      // 문서가 없는 경우 로컬 캐시 값 유지
      if (cachedTotalScore > 0) {
        setScoreState((prev: any) => ({
          ...prev,
          totalScore: cachedTotalScore
        }));
      }
    }
  } catch (error) {
    console.error('점수 동기화 오류:', error);
    // 오류 발생 시 로컬 캐시 값 사용
    const cachedTotalScoreStr = await AsyncStorage.getItem('cachedTotalScore');
    if (cachedTotalScoreStr) {
      const cachedTotalScore = parseInt(cachedTotalScoreStr);
      setScoreState((prev: any) => ({
        ...prev,
        totalScore: cachedTotalScore
      }));
    }
  }
};