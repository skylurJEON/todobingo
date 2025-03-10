import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Animated, Modal, TextInput, AppState } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import TaskModal from './TaskModal';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scoreAtom } from '../atoms/scoreAtom';
import { updateScore } from '../firebase/firebaseService';
import { getAuth } from '@react-native-firebase/auth';
import { 
  getFirestore, 
  doc, 
  runTransaction, 
  serverTimestamp,
  getDoc,
  updateDoc
} from '@react-native-firebase/firestore';
import { useTranslation } from 'react-i18next';
import { loadTasks } from '../services/taskService';

import { Vibration } from 'react-native';

// Firebase 인스턴스 가져오기
const auth = getAuth();
const db = getFirestore();

// 네비게이션 타입 정의
type RootStackParamList = {
    Home: undefined;
    TimerScreen: { task: Task | null; onComplete: () => void };
  };
  
type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface BingoCellProps {
  title: string;
  completed: boolean;
  onPress: () => void;
  onLongPress: (title: string) => void;
}


function BingoCell({ title, completed, onPress, onLongPress }: BingoCellProps) {
    const wobbleAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (completed) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(wobbleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }), 
            Animated.timing(wobbleAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
        //Vibration.vibrate([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      } else {
        wobbleAnim.setValue(0);
      }
    }, [completed]);
  
    const animatedStyle = completed ? {
      transform: [
        {
          rotate: wobbleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['-3deg', '3deg'],
          }),
        },
        { scale: scaleAnim }
      ],
    } : {
      transform: [
        { scale: scaleAnim }
      ]
    };

    const handleLongPress = () => {
      // 길게 누를 때 확대 애니메이션
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      
      // 모달 표시 함수 호출
      onLongPress(title);
    };
  
    return (
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity 
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={300}
        >
          <LinearGradient
            colors={completed ? ['#8EB69B','#235347' ] : ['#000','#222']}
            locations={[0.2, 1]}
            start={{ x: 0 , y: 1 }}
            end={{ x: 1, y: 0 }}
            style={[styles.cell, completed && styles.completedCell]}
          >
            <Text style={[styles.text, completed && styles.completedText]}>
              {title || ' '}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
}

const RANDOMIZE_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

const randomizeTasks = (tasks: Task[]) => {
  const shuffled = tasks
    .map((task) => ({ ...task, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort, ...task }) => task);
  return shuffled;
};

// 현재 날짜를 로컬 시간대 기준으로 가져오는 함수
const getCurrentLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BingoBoard() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const bingoSize = useRecoilValue(bingoSizeAtom);
  const [bingoBoard, setBingoBoard] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{id: number, title: string}>({id: 0, title: ''});
  const [editText, setEditText] = useState('');
  const [praiseModalVisible, setPraiseModalVisible] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [lastBingoCount, setLastBingoCount] = useState(0); // 마지막으로 확인한 빙고 수
  const [scoreState, setScoreState] = useRecoilState(scoreAtom); // 점수 상태
  
  const { t } = useTranslation();

  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);

  // BingoBoard.tsx 파일에 개발자 모드 추가
const [devModeEnabled, setDevModeEnabled] = useState(false);

// 개발자 모드 토글 함수
const toggleDevMode = () => {
  setDevModeEnabled(!devModeEnabled);
};

// 시뮬레이션 상태 추가
const [isSimulating, setIsSimulating] = useState(false);

// 날짜 변경 시뮬레이션 함수 수정
const simulateDateChange = async (daysToAdd = 1) => {
  if (!devModeEnabled) return;
  
  // 시뮬레이션 상태 설정
  //setIsSimulating(true);
  setIsSimulating(false);

  // 현재 저장된 마지막 리셋 날짜 가져오기
  const lastResetDay = await AsyncStorage.getItem('lastResetDay') || new Date().toISOString().split('T')[0];
  
  // 지정된 일수만큼 날짜 추가
  const lastDate = new Date(lastResetDay);
  lastDate.setDate(lastDate.getDate() + daysToAdd);
  const newDateStr = lastDate.toISOString().split('T')[0];
  
  // 마지막 리셋 날짜 업데이트
  await AsyncStorage.setItem('lastResetDay', newDateStr);
  await AsyncStorage.setItem('lastRandomizeDate', newDateStr);
  
  // 현재 사용자 확인
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      // 사용자 문서 참조
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        
        // 기존 점수와 연속 출석 정보 가져오기
        const currentTotalScore = userData?.totalScore || 0;
        let newStreak = userData?.streak || 0;
        const lastAttendanceDate = userData?.lastAttendanceDate;
        
        // 마지막 출석일이 시뮬레이션 전날인지 확인
        const simulatedYesterday = new Date(lastDate);
        simulatedYesterday.setDate(simulatedYesterday.getDate() - 1);
        const yesterdayStr = simulatedYesterday.toISOString().split('T')[0];
        
        // 출석 보상 계산
        let attendanceBonus = 0;
        
        if (lastAttendanceDate === yesterdayStr) {
          // 연속 출석
          newStreak += 1;
          
          // 연속 출석 보상 계산
          if (newStreak === 1) attendanceBonus = 50;
          else if (newStreak === 2) attendanceBonus = 60;
          else if (newStreak === 3) attendanceBonus = 70;
          else if (newStreak === 4) attendanceBonus = 80;
          else if (newStreak === 5) attendanceBonus = 90;
          else if (newStreak >= 6) attendanceBonus = 100;
        } else if (lastAttendanceDate !== newDateStr) {
          // 연속 출석 끊김
          newStreak = 1;
          attendanceBonus = 50; // 첫 출석 보상
        }
        
        // 새로운 총점 계산 (기존 점수 + 출석 보너스)
        const newTotalScore = currentTotalScore + attendanceBonus;
        
        // Firebase 업데이트 - 빙고 수는 업데이트하지 않음
        await updateDoc(userDocRef, {
          totalScore: newTotalScore,
          streak: newStreak,
          lastAttendanceDate: newDateStr,
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트 - 빙고 수는 0으로 설정
        setScoreState(prev => ({
          ...prev,
          totalScore: newTotalScore,
          streak: newStreak,
          lastAttendanceDate: newDateStr,
          bingoCount: 0
        }));
        
        // 마지막 빙고 수 리셋
        setLastBingoCount(0);
        
        console.log('시뮬레이션 출석 체크:', { 
          기존점수: currentTotalScore,
          연속출석: newStreak, 
          보너스점수: attendanceBonus,
          새로운총점: newTotalScore
        });
      }
    } catch (error) {
      console.error('시뮬레이션 오류:', error);
    }
  }
  
  // 완료 상태 리셋
  await AsyncStorage.setItem('completedTasks', JSON.stringify({}));
  
  // 보드 다시 생성
  await syncTasksWithBoard();
  
  Alert.alert(
    '날짜 변경 시뮬레이션',
    `${daysToAdd}일 경과를 시뮬레이션했습니다. 빙고보드가 리셋되었습니다.`,
    [{ text: '확인', style: 'default' }]
  );
  
  // 시뮬레이션 상태 해제
  setIsSimulating(false);
};




  const syncTasksWithBoard = async () => {
    // 날짜 체크
    const currentDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastRandomizeDate = await AsyncStorage.getItem('lastRandomizeDate');
    const sizeKey = `bingoSize_${bingoSize}`;
    const lastSizeKey = await AsyncStorage.getItem('lastBingoSizeKey');
    
    // 태스크 배열 가져오기
    let currentTasks = [...tasks];

    // 태스크가 비어있는지 확인
    const hasEmptyTasks = currentTasks.length === 0 || 
                          currentTasks.every(task => !task.title);

    // 태스크가 비어있으면 저장된 태스크 또는 기본 태스크 로드
    if (hasEmptyTasks) {
      const savedTasksJson = await AsyncStorage.getItem(`tasks_${bingoSize}x${bingoSize}`);
      if (savedTasksJson) {
        currentTasks = JSON.parse(savedTasksJson);
        console.log('저장된 태스크 로드:', currentTasks);
      } else {
        // 저장된 태스크가 없으면 기본 태스크 로드
        const defaultTasks = await loadTasks(bingoSize);
        currentTasks = defaultTasks;
        console.log('기본 태스크 로드:', defaultTasks);
      }
      setTasks(currentTasks);
    }
    
    // 랜덤화 필요 여부 체크 (하루가 지났거나, 저장된 배열이 없는 경우)
    const needsRandomize = !lastRandomizeDate || lastRandomizeDate !== currentDateStr;
    
    if (needsRandomize) {
      // 하루가 지나서 랜덤화 필요
      const existingTasks = currentTasks.slice(0, totalCells - 1); // '칭찬하기' 제외

      // 태스크가 비어있는지 다시 확인
      if (existingTasks.length === 0 || existingTasks.every(task => !task.title)) {
        // 기본 태스크 로드
        const defaultTasks = await loadTasks(bingoSize);
        currentTasks = defaultTasks;
        console.log('랜덤화를 위한 기본 태스크 로드:', defaultTasks);
      }

      const randomizedTasks = randomizeTasks(existingTasks);
      
      // 랜덤화된 태스크 저장
      setTasks(randomizedTasks);
      currentTasks = randomizedTasks;
      
      // 각 사이즈별로 랜덤화된 태스크 저장
      await AsyncStorage.setItem(`tasks_${bingoSize}x${bingoSize}`, JSON.stringify(randomizedTasks));
      
      // 마지막 랜덤화 날짜 저장
      await AsyncStorage.setItem('lastRandomizeDate', currentDateStr);
    } else if (sizeKey !== lastSizeKey) {
      // 사이즈만 변경된 경우 - 해당 사이즈의 저장된 태스크 불러오기
      const savedTasks = await AsyncStorage.getItem(`tasks_${bingoSize}x${bingoSize}`);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
        currentTasks = parsedTasks;
      }
      
      // 현재 사이즈 키 저장
      await AsyncStorage.setItem('lastBingoSizeKey', sizeKey);
    }
    
    // 완료 상태 불러오기
    const completedTasksJson = await AsyncStorage.getItem('completedTasks');
    const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
    
    // 빙고 보드 생성
    const filledBoard = Array.from({ length: totalCells }, (_, i) => {
      if (i === centerIndex) {
        // 칭찬하기 셀은 항상 중앙에 고정
        return { 
          id: 9999, 
          title: t('bingo.praise'), 
          completed: completedTasks[9999] || false 
        };
      }

      // 중앙 셀을 제외한 인덱스 계산
      let taskIndex = i;
      if (i > centerIndex) taskIndex = i - 1;

      // 해당 인덱스의 할 일 가져오기 (없으면 빈 셀)
      const task = currentTasks[taskIndex] || { id: -(i + 1), title: '', completed: false };
      
      // ID 기준으로 완료 상태 복원
      return { 
        ...task, 
        completed: completedTasks[task.id] || false 
      };
    });

    setBingoBoard(filledBoard);
  };

  useEffect(() => {
    syncTasksWithBoard();
  }, [tasks, bingoSize]);

  // 빙고 체크 로직 추가
  useEffect(() => {
    checkBingo();
  }, [bingoBoard]);

  const checkBingo = async () => {
    // 2차원 그리드로 변환
    const grid = Array(bingoSize).fill(null).map(() => Array(bingoSize).fill(false));
    
    bingoBoard.forEach((cell, index) => {
      const row = Math.floor(index / bingoSize);
      const col = index % bingoSize;
      grid[row][col] = cell.completed;
    });

    // 빙고 체크 함수들
    const checkRow = (row: number) => grid[row].every((cell) => cell);
    const checkCol = (col: number) => grid.every((row) => row[col]);
    const checkDiagonal1 = () => grid.every((_, i) => grid[i][i]);
    const checkDiagonal2 = () => grid.every((_, i) => grid[i][bingoSize - 1 - i]);

    let bingoCount = 0;

    // 가로 체크
    for (let i = 0; i < bingoSize; i++) {
      if (checkRow(i)) bingoCount++;
    }

    // 세로 체크
    for (let i = 0; i < bingoSize; i++) {
      if (checkCol(i)) bingoCount++;
    }

    // 대각선 체크
    if (checkDiagonal1()) bingoCount++;
    if (checkDiagonal2()) bingoCount++;

    // 이전 빙고 수와 현재 빙고 수 비교
    const bingoDifference = bingoCount - lastBingoCount;
    
    // 빙고 수 변화에 따른 처리
    if (bingoDifference > 0) {
      // 새로운 빙고가 생겼을 때
      // Alert.alert(
      //   '🎉 ' + t('bingo.complete'), 
      //   `${t('bingo.congratulations')} ${bingoCount} ${t('bingo.congratulations_text')}`,
      //   [{ text: t('common.confirm'), style: 'default' }]
      // );

      // 출석 체크
      await checkAttendance();

    } else if (bingoDifference < 0) {
      // 빙고가 취소되었을 때
      // Alert.alert(
      //   '빙고 취소', 
      //   `${Math.abs(bingoDifference)}줄의 빙고가 취소되었습니다.`,
      //   [{ text: '확인', style: 'default' }]
      // );
    }
    
    // 현재 빙고 수 저장
    setLastBingoCount(bingoCount);
    
    // 점수 업데이트 - 빙고 수 변화에 따라 점수 조정
    if (bingoDifference !== 0) {
      // 빙고 점수 업데이트
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          getDoc(userDocRef).then(docSnapshot => {
            if (docSnapshot.exists) {
              const userData = docSnapshot.data();
              const currentTotalScore = userData?.totalScore || 0;
              
              // 빙고 변화에 따른 점수 조정 (빙고당 100점)
              const scoreChange = bingoDifference * 100;
              const newTotalScore = Math.max(0, currentTotalScore + scoreChange);
              
              // Firebase 업데이트
              updateDoc(userDocRef, {
                totalScore: newTotalScore,
                bingoCount: bingoCount,
                updatedAt: serverTimestamp()
              });
              
              // 로컬 상태 업데이트
              setScoreState(prev => ({
                ...prev,
                totalScore: newTotalScore,
                bingoCount: bingoCount
              }));
              
              console.log('빙고 점수 업데이트:', {
                이전점수: currentTotalScore,
                변화: scoreChange,
                새점수: newTotalScore,
                빙고수: bingoCount
              });
            }
          });
        } catch (error) {
          console.error('점수 업데이트 오류:', error);
        }
      }
    }
  };


  // 출석 체크 함수
  const checkAttendance = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 사용자 문서 참조
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        
        // 기존 점수와 연속 출석 정보 가져오기
        const currentTotalScore = userData?.totalScore || 0;
        let newStreak = userData?.streak || 0;
        const lastAttendanceDate = userData?.lastAttendanceDate;
        
        // 오늘 이미 출석했는지 확인
        if (lastAttendanceDate === today) {
          console.log('오늘 이미 출석 체크됨');
          return;
        }
        
        // 마지막 출석일이 어제인지 확인
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // 출석 보상 계산
        let attendanceBonus = 0;
        
        if (lastAttendanceDate === yesterdayStr) {
          // 연속 출석
          newStreak += 1;
          
          // 연속 출석 보상 계산
          if (newStreak === 1) attendanceBonus = 50;
          else if (newStreak === 2) attendanceBonus = 60;
          else if (newStreak === 3) attendanceBonus = 70;
          else if (newStreak === 4) attendanceBonus = 80;
          else if (newStreak === 5) attendanceBonus = 90;
          else if (newStreak >= 6) attendanceBonus = 100;
        } else {
          // 연속 출석 끊김
          newStreak = 1;
          attendanceBonus = 50; // 첫 출석 보상
        }
        
        // 새로운 총점 계산
        const newTotalScore = currentTotalScore + attendanceBonus;
        
        // Firebase 업데이트
        await updateDoc(userDocRef, {
          totalScore: newTotalScore,
          streak: newStreak,
          lastAttendanceDate: today,
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트
        setScoreState(prev => ({
          ...prev,
          totalScore: newTotalScore,
          streak: newStreak,
          lastAttendanceDate: today
        }));
        
        console.log('출석 체크 완료:', { 
          기존점수: currentTotalScore,
          연속출석: newStreak, 
          보너스점수: attendanceBonus,
          새로운총점: newTotalScore
        });
        
        // 출석 보상 알림
        // Alert.alert(
        //   '출석 보상',
        //   `연속 ${newStreak}일 출석! ${attendanceBonus}점이 적립되었습니다.`,
        //   [{ text: '확인', style: 'default' }]
        // );
      }
    } catch (error) {
      console.error('출석 체크 오류:', error);
    }
  };

  

  const toggleTaskCompletion = async (taskId: number) => {

    // 완료 상태 변경
    const updatedBoard = bingoBoard.map((cell) =>
      cell.id === taskId ? { ...cell, completed: !cell.completed } : cell
    );
    setBingoBoard(updatedBoard);
    
    // 태스크 ID 기준으로 완료 상태 저장
    const completedTasksJson = await AsyncStorage.getItem('completedTasks');
    const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
    
    const updatedTask = updatedBoard.find(cell => cell.id === taskId);
    if (updatedTask) {
      completedTasks[taskId] = updatedTask.completed;
      await AsyncStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }
  
    console.log('완료 상태 변경:', taskId);
  };

  const handleLongPress = (id: number, title: string) => {
    if (id === 9999) {
      setPraiseModalVisible(true);
      return;
    }
    
    // 해당 task 찾기
    const task = bingoBoard.find(task => task.id === id);
    if (task) {
      setSelectedTask(task);
      setTaskModalVisible(true); // TaskModal 열기
    } else {
      // 기존 수정 모달 열기
      setSelectedCell({id, title});
      setEditText(title);
      setModalVisible(true);
    }
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setBingoBoard((prev) =>
        prev.map((cell) =>
          cell.id === selectedCell.id ? { ...cell, title: editText.trim() } : cell
        )
      );
      
      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedCell.id ? { ...task, title: editText.trim() } : task
        )
      );
    }
    
    setModalVisible(false);
  };

  const openTaskModal = (task: Task) => {
    setSelectedTask(task);
    setTaskModalVisible(true);
  };

  const handleTimerComplete = () => {
    if (selectedTask) {
      // 할 일 자동 완료 처리
      console.log(`${selectedTask.title} 완료됨!`);

      // 완료 상태 변경
      toggleTaskCompletion(selectedTask.id);
      checkBingo();
      
      // 타이머 완료 후 선택된 태스크 초기화
      setSelectedTask(null);
    }
  };

  const handleSaveTask = (text: string) => {
    if (selectedTask) {
      setBingoBoard((prev) =>
        prev.map((cell) =>
          cell.id === selectedTask.id ? { ...cell, title: text } : cell
        )
      );
      
      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id ? { ...task, title: text } : task
        )
      );
    }
  };

  useEffect(() => {
    // 로그인 상태일 때만 점수 동기화
    const currentUser = auth.currentUser;
    if (currentUser) {
      updateScore(scoreState);
    }
  }, [scoreState]);

  // 일일 리셋 및 점수 업데이트 함수 수정
  const dailyReset = async () => {
    const today = getCurrentLocalDate();
    // 마지막 리셋 날짜 가져오기
    const lastResetDay = await AsyncStorage.getItem('lastResetDay');
    
    console.log('날짜 확인:', { 현재날짜: today, 마지막리셋날짜: lastResetDay });
    
    // 하루가 지났는지 확인 (lastResetDay가 없거나 today와 다른 경우)
    if (!lastResetDay || lastResetDay !== today) {
      console.log('날짜가 변경되어 빙고보드를 리셋합니다:', lastResetDay, '->', today);
      
      // 완료 상태 리셋
      await AsyncStorage.setItem('completedTasks', JSON.stringify({}));
      
      // 마지막 리셋 날짜 업데이트
      await AsyncStorage.setItem('lastResetDay', today);
      
      // 보드판 상태 리셋 및 새로운 랜덤 배치 적용
      await AsyncStorage.removeItem('lastRandomizeDate');
      
      // 보드 다시 생성
      await syncTasksWithBoard();
      
      // 빙고 카운트 리셋
      setLastBingoCount(0);
      
      // 점수 상태 업데이트 - 빙고 카운트만 리셋
      setScoreState(prev => ({
        ...prev,
        bingoCount: 0
      }));
      
      return true; // 리셋 발생
    }
    
    return false; // 리셋 없음
  };

  // useEffect 훅에 dailyReset 추가
  useEffect(() => {
    dailyReset();
    syncUserScoreFromFirebase();
  }, []); // 컴포넌트 마운트 시 실행

  // 빙고 취소 로직 추가
  const cancelBingo = async (taskId: number) => {
    // 빙고 완료 취소
    const updatedBoard = bingoBoard.map((cell) =>
      cell.id === taskId ? { ...cell, completed: false } : cell
    );
    setBingoBoard(updatedBoard);
    
    // 완료 상태 저장소 업데이트
    const completedTasksJson = await AsyncStorage.getItem('completedTasks');
    const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
    delete completedTasks[taskId];
    await AsyncStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    
    // 빙고 체크 다시 실행
    checkBingo();
  };

  // 점수 업데이트 함수 수정
  const updateScoreAndStreak = async (newScore: number, bingoCount: number) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 사용자 문서 참조
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        
        // 기존 점수 가져오기
        const currentTotalScore = userData?.totalScore || 0;
        
        // 오늘 이미 점수를 업데이트했는지 확인
        //const lastScoreDate = await AsyncStorage.getItem('lastScoreDate');
        
        // 오늘 처음 점수를 업데이트하는 경우에만 누적
        let updatedScore = currentTotalScore;
        //if (lastScoreDate !== today) {
        //  updatedScore = currentTotalScore + newScore;
        //  await AsyncStorage.setItem('lastScoreDate', today);
        //}
        
        updatedScore = currentTotalScore + newScore;
        // 업데이트
        await updateDoc(userDocRef, {
          totalScore: updatedScore,
          bingoCount: bingoCount,
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트
        setScoreState(prev => ({
          ...prev,
          totalScore: updatedScore,  // 로컬에는 오늘의 점수만 표시
          bingoCount: bingoCount
        }));
        
        console.log('점수 업데이트:', { 
          기존점수: currentTotalScore, 
          오늘점수: newScore, 
          누적점수: updatedScore,
          빙고수: bingoCount
        });
      }
    } catch (error) {
      console.error('점수 업데이트 오류:', error);
    }
  };

  // Firebase에서 사용자 점수 동기화
  const syncUserScoreFromFirebase = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        
        // 로컬 상태 업데이트
        setScoreState(prev => ({
          ...prev,
          totalScore: userData?.totalScore || 0,
          streak: userData?.streak || 0,
          lastAttendanceDate: userData?.lastAttendanceDate || null
        }));
        
        console.log('Firebase에서 점수 동기화 완료:', {
          totalScore: userData?.totalScore,
          streak: userData?.streak,
          lastAttendanceDate: userData?.lastAttendanceDate
        });
      }
    } catch (error) {
      console.error('점수 동기화 오류:', error);
    }
  };

  // 컴포넌트 내부에 AppState 리스너 추가
  useEffect(() => {
    // 앱 상태 변경 리스너
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // 앱이 활성화될 때마다 날짜 확인
        dailyReset();
      }
    });
    
    // 컴포넌트 마운트 시 초기 실행
    dailyReset();
    syncUserScoreFromFirebase();
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: (70 + 8) * bingoSize }]}>
        {bingoBoard.map((cell, index) => (
          <BingoCell
            key={index}
            title={cell.title}
            completed={cell.completed}
            onPress={() => toggleTaskCompletion(cell.id)}
            onLongPress={(title) => handleLongPress(cell.id, title)}
          />
        ))}
      </View>

      {/* 모달 컴포넌트 */}
      

      
      <TaskModal
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        onStartTimer={() => {
          setTaskModalVisible(false);
          navigation.navigate('TimerScreen', { task: selectedTask, onComplete: handleTimerComplete });
        }}
        task={selectedTask}
        onSave={handleSaveTask}
      />

      {/* 칭찬하기 전용 모달 */}
      <Modal
  animationType="fade"
  transparent={true}
  visible={praiseModalVisible}
  onRequestClose={() => setPraiseModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>{t('bingo.praise_modal_title')}</Text>
      <View style={styles.praiseContent}>
        <Text style={styles.praiseText}>{t('bingo.praise_modal_text')}</Text>
        <LinearGradient
          colors={['#8EB69B', '#235347']}
          style={styles.praiseIcon}
        >
          <Ionicons name="heart" size={24} color="white" />
        </LinearGradient>
      </View>
      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.cancelButton]} 
          onPress={() => setPraiseModalVisible(false)}
        >
          <Text style={styles.buttonText}>{t('bingo.close')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modalButton, styles.saveButton]} 
          onPress={() => {
            toggleTaskCompletion(9999);
            setPraiseModalVisible(false);
          }}
        >
          <Text style={styles.buttonText}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

      {/* 개발자 모드 UI */}
      {/* <View style={styles.devModeContainer}>
        <TouchableOpacity 
          onPress={toggleDevMode}
          onLongPress={() => simulateDateChange(1)}
          style={[styles.devModeButton, devModeEnabled && styles.devModeButtonActive]}
        >
          <Text style={styles.devModeButtonText}>
            {devModeEnabled ? '개발자 모드 활성화됨' : 'DEV'}
          </Text>
        </TouchableOpacity>
        
        {devModeEnabled && (
          <View style={styles.devModeContainer}>
            <Text style={styles.devModeTitle}>개발자 모드</Text>
            <View style={styles.devModeButtons}>
              <TouchableOpacity 
                style={styles.devButton}
                onPress={() => simulateDateChange(1)}
              >
                <Text style={styles.devButtonText}>1일 경과</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.devButton}
                onPress={() => simulateDateChange(2)}
              >
                <Text style={styles.devButtonText}>2일 경과</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.devButton}
                onPress={() => simulateDateChange(3)}
              >
                <Text style={styles.devButtonText}>3일 경과</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.devButton}
              onPress={checkAttendance}
            >
              <Text style={styles.devButtonText}>출석 체크</Text>
            </TouchableOpacity>
          </View>
        )}
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    board: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginVertical: 24,
      },
      cell: {
        width: 68,
        height: 68,
        margin: 5,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8EB69B',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      completedCell: {
        shadowColor: '#8EB69B',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      },
      text: {
        fontSize: 10,
        textAlign: 'center',
        color: '#fff',
        fontWeight: '400',
        padding: 8,
      },
      completedText: {
        color: '#fff',
        fontWeight: 'bold',
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#8EB69B',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        marginBottom: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#444',
    },
    saveButton: {
        backgroundColor: '#8EB69B',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    praiseContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    praiseText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
    },
    praiseIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    praiseIconText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    devModeContainer: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      alignItems: 'flex-end',
    },
    devModeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    devModeButtonActive: {
      backgroundColor: 'rgba(255, 0, 0, 0.5)',
    },
    devModeButtonText: {
      color: 'white',
      fontSize: 10,
    },
    devModeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 10,
    },
    devModeButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    devButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    devButtonText: {
      color: 'white',
      fontSize: 12,
    },
});