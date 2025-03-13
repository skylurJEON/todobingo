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

import { syncTasksWithBoard } from '../services/boardService';
import { checkAttendance, dailyReset, initializeAttendance } from '../services/attendanceService';
import { getCurrentLocalDate } from '../utils/dateUtils';
import BingoCell from './BingoCell';
import { syncUserScoreFromFirebase } from '../services/scoreService';

// 네비게이션 타입 정의
type RootStackParamList = {
    Home: undefined;
    TimerScreen: { task: Task | null; onComplete: () => void };
  };
  
type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;


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
  const latestScoreRef = useRef(scoreState.totalScore);

  // Firebase 인스턴스 가져오기
  const auth = getAuth();
  const db = getFirestore();
  const { t } = useTranslation();

  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);

  // 동기화: 보드 데이터 불러오기
  const syncBoard = async () => {
    try {
      // 현재 점수 백업
      const currentScore = scoreState.totalScore;
      
      // boardService의 syncTasksWithBoard 함수 활용
      const boardTasks = await syncTasksWithBoard(tasks, bingoSize, t);
      
      // 완료된 태스크 로드
      const completedTasksJson = await AsyncStorage.getItem(`completedTasks_${bingoSize}`);
      const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
      
      // 빙고 보드 초기화
      const lastBingoCountStr = await AsyncStorage.getItem(`lastBingoCount_${bingoSize}`);
      const savedLastBingoCount = lastBingoCountStr ? parseInt(lastBingoCountStr) : 0;
      setLastBingoCount(savedLastBingoCount);
      
      // 빙고 보드 설정 (완료 상태 적용)
      const newBoard = boardTasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: completedTasks[task.id] === true || task.completed
      }));
      
      console.log('빙고 보드 생성:', newBoard.length, '개 셀');
      setBingoBoard(newBoard);
      
      // 점수 복원
      if (currentScore > 0) {
        setTimeout(() => {
          setScoreState(prev => ({
            ...prev,
            totalScore: currentScore
          }));
          console.log('빙고 보드 초기화 후 점수 복원:', currentScore);
        }, 500);
      }
    } catch (error) {
      console.error('빙고 보드 동기화 오류:', error);
    }
  };

  const syncScore = async () => {
    await syncUserScoreFromFirebase(setScoreState);
  };

  const checkBingo = async () => {
    // 2차원 그리드 생성
    const grid = Array(bingoSize)
      .fill(null)
      .map(() => Array(bingoSize).fill(false));
    bingoBoard.forEach((cell, index) => {
      const row = Math.floor(index / bingoSize);
      const col = index % bingoSize;
      grid[row][col] = cell.completed;
    });
  
    const checkRow = (row: number) => grid[row].every(cell => cell);
    const checkCol = (col: number) => grid.every(row => row[col]);
    const checkDiagonal1 = () => grid.every((_, i) => grid[i][i]);
    const checkDiagonal2 = () => grid.every((_, i) => grid[i][bingoSize - 1 - i]);
  
    let bingoCount = 0;
    for (let i = 0; i < bingoSize; i++) {
      if (checkRow(i)) bingoCount++;
      if (checkCol(i)) bingoCount++;
    }
    if (checkDiagonal1()) bingoCount++;
    if (checkDiagonal2()) bingoCount++;
  
    // 이전 빙고 수와 비교하여 증가분만 점수에 반영
    const bingoDifference = bingoCount - lastBingoCount;
    if (bingoDifference !== 0) { //취소 포함
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // 현재 점수에 빙고 증가분만큼 점수 추가
          const scoreChange = bingoDifference * 100;
          const newTotalScore = scoreState.totalScore + scoreChange;
            
          setScoreState(prev => ({
            ...prev,
            totalScore: newTotalScore,
          }));
    
          // 캐시된 누적 점수 업데이트
          await AsyncStorage.setItem('cachedTotalScore', newTotalScore.toString());
          console.log('빙고 증가로 점수 업데이트:', {
            이전점수: scoreState.totalScore,
            증가: scoreChange,
            새점수: newTotalScore
          });
    
          // Firebase 업데이트는
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // 빙고 완성 시 출석 체크 실행
          const attendanceResult = await checkAttendance(newTotalScore, scoreState.streak);
          setScoreState(prev => ({
            ...prev,
            totalScore: attendanceResult.newTotalScore,
            streak: attendanceResult.newStreak,
            lastAttendanceDate: attendanceResult.lastAttendanceDate
          }));
          
          // Firebase 업데이트
          await updateDoc(userDocRef, {
            totalScore: attendanceResult.newTotalScore,
            streak: attendanceResult.newStreak,
            lastAttendanceDate: attendanceResult.lastAttendanceDate,
            updatedAt: serverTimestamp()
          });
          
          await AsyncStorage.setItem('cachedTotalScore', attendanceResult.newTotalScore.toString());
        } catch (error) {
          console.error('점수 업데이트 오류:', error);
        }
      }
    }
    
    setLastBingoCount(bingoCount);
    await AsyncStorage.setItem(`lastBingoCount_${bingoSize}`, bingoCount.toString());
  };
  

  const toggleTaskCompletion = async (taskId: number) => {
    // 완료 상태 변경
    const updatedBoard = bingoBoard.map((cell) =>
      cell.id === taskId ? { ...cell, completed: !cell.completed } : cell
    );
    setBingoBoard(updatedBoard);
    
    // 태스크 ID 기준으로 완료 상태 저장
    const completedTasksJson = await AsyncStorage.getItem(`completedTasks_${bingoSize}`);
    const completedTasks = completedTasksJson ? JSON.parse(completedTasksJson) : {};
    
    const updatedTask = updatedBoard.find(cell => cell.id === taskId);
    if (updatedTask) {
      completedTasks[taskId] = updatedTask.completed;
      await AsyncStorage.setItem(`completedTasks_${bingoSize}`, JSON.stringify(completedTasks));
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
      // 앱이 활성화될 때 먼저 로컬 캐시 확인
      const cachedScore = await AsyncStorage.getItem("cachedTotalScore");
      if (cachedScore) {
        const cachedScoreNum = parseInt(cachedScore, 10);
        if (cachedScoreNum > scoreState.totalScore) {
          setScoreState(prev => ({ ...prev, totalScore: cachedScoreNum }));
          console.log("앱 활성화 시 최신 점수 반영:", cachedScoreNum);
        }
      }
      
      // 날짜 확인 및 리셋 처리
      const today = getCurrentLocalDate();
      const lastResetDay = await AsyncStorage.getItem('lastResetDay');
      if(!lastResetDay || lastResetDay !== today){
        await dailyReset([3, 5], setScoreState);
        await syncBoard();
        
        // 중요: 리셋 후 Firebase 동기화는 한 번만 수행
        await syncScore();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setTimeout(async () => {
          console.log("백그라운드 전환 시 저장 전 최신 점수:", latestScoreRef.current);
          await AsyncStorage.setItem("cachedTotalScore", latestScoreRef.current.toString());
          console.log("백그라운드로 전환 시 최신 점수 캐싱:", latestScoreRef.current);
        }, 500); // 500ms 지연
    }
  };

  useEffect(() => {
    latestScoreRef.current = scoreState.totalScore; // 점수 변경될 때 최신 값 저장
  }, [scoreState.totalScore]);

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

  // AppState 리스너 설정: 앱 활성화 시 출석 및 리셋 처리
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    // 컴포넌트 마운트 시 초기 실행
    const initialize = async () => {
      // 먼저 로컬 캐시에서 점수 확인
      const cachedTotalScoreStr = await AsyncStorage.getItem('cachedTotalScore');
      if (cachedTotalScoreStr) {
        const cachedTotalScore = parseInt(cachedTotalScoreStr);
        if (cachedTotalScore > 0) {
          setScoreState(prev => ({
            ...prev,
            totalScore: cachedTotalScore
          }));
          console.log('로컬 캐시에서 점수 복원:', cachedTotalScore);
        }
      }
      
      // Firebase에서 점수 동기화
      await syncScore();
      
      // 로컬 캐시에 저장된 출석 정보 적용
      await initializeAttendance();
      
      // 날짜 확인 및 리셋 처리
      const today = getCurrentLocalDate();
      const lastResetDay = await AsyncStorage.getItem('lastResetDay');
      if(!lastResetDay || lastResetDay !== today){
        await dailyReset([3, 5], setScoreState);
        await syncBoard();
        // 리셋 후 다시 점수 동기화
        await syncScore();
      } else {
        await syncBoard();
      }
    };
    initialize();

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    syncBoard();
  }, [tasks, bingoSize]);

  useEffect(() => {
    //AsyncStorage.setItem('lastBingoCount', '0');
    setLastBingoCount(0);
    syncBoard();
  }, [bingoSize]);

  // 빙고 체크 
  useEffect(() => {
    checkBingo();
  }, [bingoBoard]);

  useEffect(() => {
    const restoreScore = async () => {
        const cachedScore = await AsyncStorage.getItem("cachedTotalScore");
        if (cachedScore) {
            const cachedScoreNum = parseInt(cachedScore, 10);
            if (cachedScoreNum > scoreState.totalScore) {
                setScoreState(prev => ({ ...prev, totalScore: cachedScoreNum }));
                console.log("앱 시작 시 점수 복원:", cachedScoreNum);
            }
        }
    };
    restoreScore();
  }, []);

  useEffect(() => {
    // 점수 변경 감지
    console.log('점수 상태 변경:', scoreState.totalScore);
    
    // 점수가 변경될 때마다 로컬 캐시 업데이트 (0이 아닌 경우에만)
    const updateCache = async () => {
      if (scoreState.totalScore > 0) {
        await AsyncStorage.setItem('cachedTotalScore', scoreState.totalScore.toString());
        console.log('점수 캐시 업데이트:', scoreState.totalScore);
      }
    };
    
    updateCache();
  }, [scoreState.totalScore]);

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
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
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