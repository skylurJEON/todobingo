import { ScoreState } from '../atoms/scoreAtom';
import { RankingData } from '../types/rankingTypes';
import { 
  getAuth, 
  firebase,
  signInWithCredential,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut as authSignOut
} from '@react-native-firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction,
  serverTimestamp
} from '@react-native-firebase/firestore';
import { appleAuth } from '@invertase/react-native-apple-authentication';

// Firebase 인스턴스 가져오기
const auth = getAuth();
const db = getFirestore();

// 로그인 함수
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

// 애플 로그인 함수
export const signInWithApple = async () => {
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  // 애플 인증 정보 혹인
  const { identityToken, nonce } = appleAuthRequestResponse;

  if (!identityToken) {
    throw new Error('애플 인증 정보를 얻을 수 없습니다.');
  }

  const appleCredential = firebase.auth.AppleAuthProvider.credential(identityToken, nonce);

  const userCredential = await firebase.auth().signInWithCredential(appleCredential);

  // user is now signed in, any Firebase `onAuthStateChanged` listeners you have will trigger
  console.warn(`Firebase authenticated via Apple, UID: ${userCredential.user.uid}`);

  // 사용자 정보 업데이트 (이름이 없는 경우)
  const { user } = userCredential;
    
  if (user && !user.displayName && appleAuthRequestResponse.fullName) {
    const displayName = `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim();
    
    if (displayName) {
      await updateProfile(user, { displayName });
    }
  }
  // 신규 사용자인 경우 Firestore에 정보 저장
  if (userCredential.additionalUserInfo?.isNewUser) {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      displayName: user.displayName || '',
      totalScore: 0,
      bingoCount: 0,
      streak: 0,
      lastAttendanceDate: null,
      createdAt: serverTimestamp(),
      provider: 'apple.com'
    });
  }
  
  return user;
};

// 회원가입 함수
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // 사용자 정보 Firestore에 저장
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
      email,
      displayName,
      totalScore: 0,
      bingoCount: 0,
      streak: 0,
      lastAttendanceDate: null,
      createdAt: serverTimestamp()
    });
    
    return userCredential.user;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

// 로그아웃 함수
export const signOut = async () => {
  try {
    await authSignOut(auth);
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw error;
  }
};

// 점수 업데이트 함수
export const updateScore = async (scoreState: ScoreState) => {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      totalScore: scoreState.totalScore,
      bingoCount: scoreState.bingoCount,
      streak: scoreState.streak,
      lastAttendanceDate: scoreState.lastAttendanceDate,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('점수 업데이트 오류:', error);
  }
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (displayName: string) => {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    await updateProfile(user, { displayName });
    
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      displayName,
      updatedAt: serverTimestamp()
    });
    
    return user;
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    throw error;
  }
};

// 랭킹 데이터 가져오기
export const fetchRankings = async (): Promise<RankingData[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('totalScore', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      displayName: doc.data().displayName || '익명',
      totalScore: doc.data().totalScore,
      streak: doc.data().streak,
    }));
  } catch (error) {
    console.error('랭킹 데이터 가져오기 오류:', error);
    return [];
  }
};

// 내 랭킹 가져오기
export const fetchMyRanking = async (): Promise<RankingData | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    // 내 점수 가져오기
    const myDocRef = doc(db, 'users', user.uid);
    const myDoc = await getDoc(myDocRef);
    const myData = myDoc.data();
    
    if (!myData) return null;
    
    // 내 점수보다 높은 사용자 수 계산
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('totalScore', '>', myData.totalScore || 0));
    const higherScores = await getDocs(q);
    
    const myRank = higherScores.size + 1;
    
    return {
      id: user.uid,
      rank: myRank,
      displayName: myData.displayName || '익명',
      totalScore: myData.totalScore,
      streak: myData.streak,
    };
  } catch (error) {
    console.error('내 랭킹 가져오기 오류:', error);
    return null;
  }
};