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

  // Firebase 인스턴스 가져오기
  const auth = getAuth();
  const db = getFirestore();
  
  const { t } = useTranslation();

  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);

  //날짜변경테스트
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const toggleDevMode = () => {
    setDevModeEnabled(!devModeEnabled);
  };

  const simulateDateChange = async (daysToAdd = 1) => {
    if (!devModeEnabled) {
      Alert.alert('개발자 모드를 활성화');
      return;
    }

    try {
      // 현재 앱에서 lastResetDay를 가져와 날짜를 daysToAdd만큼 증가
      const lastResetDay = await AsyncStorage.getItem('lastResetDay');
      const baseDate = lastResetDay
        ? new Date(lastResetDay)
        : new Date(); // 없으면 오늘 날짜

      baseDate.setDate(baseDate.getDate() + daysToAdd);
      const newDateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // 날짜를 변경한 값으로 저장
      await AsyncStorage.setItem('lastResetDay', newDateStr);
      await AsyncStorage.setItem('lastRandomizeDate', newDateStr);

      // 완료 상태도 리셋 (완료 상태 모두 false 처리)
      await AsyncStorage.setItem('completedTasks', JSON.stringify({}));

      // 빙고 보드 다시 불러오기(하루 지났다고 판별)
      await syncTasksWithBoard();

      Alert.alert(
        '개발자 모드',
        `${daysToAdd}일 뒤 시뮬레이션 . (lastResetDay=${newDateStr})`
      );
    } catch (err) {
      console.error('simulateDateChange 오류:', err);
    }
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

    // 마지막 빙고 카운트 불러오기
    const lastBingoCountStr = await AsyncStorage.getItem('lastBingoCount');
    const savedBingoCount = lastBingoCountStr ? parseInt(lastBingoCountStr) : 0;
    setLastBingoCount(savedBingoCount);
    
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
    
    // 점수 업데이트 - 빙고 수 변화에 따라 점수 조정
    if (bingoDifference !== 0) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnapshot = await getDoc(userDocRef);

          if (docSnapshot.exists) {
            const userData = docSnapshot.data();
            //const currentTotalScore = userData?.totalScore || 0;
            const currentTotalScore = scoreState.totalScore || 0;
            const scoreChange = bingoDifference * 100;
            const newTotalScore = Math.max(0, currentTotalScore + scoreChange);
              
            // 로컬 상태 업데이트
            setScoreState(prev => ({
              ...prev,
              totalScore: newTotalScore,
              //bingoCount: bingoCount
            }));

            // Firebase 업데이트
            await updateDoc(userDocRef, {
              totalScore: newTotalScore,
              //bingoCount: bingoCount,
              updatedAt: serverTimestamp()
            });

            // 빙고가 새로 완성되었을 때 출석 체크 증가
            if (bingoCount > lastBingoCount) {
              await checkAttendance();
            }
          }
        } catch (error) {
          console.error('점수 업데이트 오류:', error);
        }
      }
    }
     // 현재 빙고 수 저장
     setLastBingoCount(bingoCount);
  };


// 출석 체크 로직 (streak 증가)
const checkAttendance = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const today = getCurrentLocalDate(); // OS 날짜
  try {
    const userDocRef = doc(getFirestore(), 'users', currentUser.uid);
    const docSnapshot = await getDoc(userDocRef);
    if (!docSnapshot.exists) return;

    const userData = docSnapshot.data();
    const lastAttendanceDate = userData?.lastAttendanceDate;
    let newStreak = userData?.streak || 0;
    let currentTotalScore = userData?.totalScore || 0;

    // 이미 오늘 출석했다면 패스
    if (lastAttendanceDate === today) {
      console.log('이미 오늘 출석했습니다.');
      return;
    }

    // 어제 출석했다면 streak++, 그 외는 streak=1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastAttendanceDate === yesterdayStr) {
      newStreak += 1; 
    } else {
      newStreak = 1;
    }

    // 출석 보너스 (예: 첫날 50, 2일차 60, ...)
    let attendanceBonus = 0;
    if (newStreak === 1) attendanceBonus = 50;
    else if (newStreak === 2) attendanceBonus = 60;
    else if (newStreak === 3) attendanceBonus = 70;
    else if (newStreak === 4) attendanceBonus = 80;
    else if (newStreak === 5) attendanceBonus = 90;
    else if (newStreak >= 6) attendanceBonus = 100;

    // 누적 점수 합산
    const newTotalScore = currentTotalScore + attendanceBonus;

    // 로컬 scoreState도 갱신
    setScoreState(prev => ({
      ...prev,
      totalScore: newTotalScore,
      streak: newStreak,
      lastAttendanceDate: today,
    }));

    // Firestore 업데이트
    await updateDoc(userDocRef, {
      totalScore: newTotalScore,
      streak: newStreak,
      lastAttendanceDate: today,
      updatedAt: serverTimestamp(),
    });

    //Alert.alert('출석 체크', `${newStreak}일 연속 출석! +${attendanceBonus}점`);
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

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'active') {
      await dailyReset();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnapshot = await getDoc(userDocRef);
          
          if (docSnapshot.exists) {
            const userData = docSnapshot.data();
            // 현재 상태와 비교하여 실제로 변경된 경우에만 업데이트
            if (
              userData?.totalScore !== scoreState.totalScore ||
              userData?.streak !== scoreState.streak ||
              userData?.lastAttendanceDate !== scoreState.lastAttendanceDate
            ) {
              await updateDoc(userDocRef, {
                totalScore: scoreState.totalScore,
                streak: scoreState.streak,
                lastAttendanceDate: scoreState.lastAttendanceDate,
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (error) {
          console.error('앱 상태 변경 시 데이터 저장 오류:', error);
        }
      }
    }
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
      
      // 빙고 카운트 리셋
      await AsyncStorage.setItem('lastBingoCount', '0');

      // 마지막 리셋 날짜 업데이트
      await AsyncStorage.setItem('lastResetDay', today);
      
      // 보드판 상태 리셋 및 새로운 랜덤 배치 적용
      await AsyncStorage.removeItem('lastRandomizeDate');
      
      // 보드 다시 생성
      await syncTasksWithBoard();
      
      // 점수 상태 업데이트 - 빙고 카운트만 리셋
      setScoreState(prev => ({
        ...prev,
        bingoCount: 0
      }));
    }
  };

  // 점수 업데이트 함수 
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
        
        const updatedScore = currentTotalScore + newScore;

        // firebase업데이트
        await updateDoc(userDocRef, {
          totalScore: updatedScore,
          bingoCount: bingoCount,
          updatedAt: serverTimestamp()
        });
        
        // 로컬 상태 업데이트
        setScoreState(prev => ({
          ...prev,
          totalScore: updatedScore,  
          bingoCount: bingoCount
        }));
        
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
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    // 컴포넌트 마운트 시 초기 실행
    dailyReset();
    syncUserScoreFromFirebase();
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    syncTasksWithBoard();
  }, [tasks, bingoSize]);

  // 빙고 체크 
  useEffect(() => {
    checkBingo();
  }, [bingoBoard]);

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

      {/* 개발자 모드 토글 */}
      <View style={styles.devModeContainer}>
        <TouchableOpacity 
          style={[styles.devModeButton, devModeEnabled && styles.devModeButtonActive]}
          onPress={toggleDevMode}
        >
          <Text style={styles.devModeButtonText}>
            {devModeEnabled ? '개발자 모드 ON' : 'DEV'}
          </Text>
        </TouchableOpacity>
        
        {/* 개발자 모드가 켜져 있을 때만 보이게 할 수 있는 예시 UI */}
        {devModeEnabled && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity 
              style={styles.devButton}
              onPress={() => simulateDateChange(1)}
            >
              <Text style={styles.devButtonText}>+1일</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.devButton}
              onPress={() => simulateDateChange(2)}
            >
              <Text style={styles.devButtonText}>+2일</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.devButton}
              onPress={() => simulateDateChange(7)}
            >
              <Text style={styles.devButtonText}>+7일</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    // [개발자 모드 전용]
  devModeContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  devModeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  devModeButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.5)', // Dev 모드일 때 색 강조
  },
  devModeButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  devButton: {
    backgroundColor: '#444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 5,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});