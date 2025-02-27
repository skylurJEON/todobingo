import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Animated, Modal, TextInput } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

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

const RANDOMIZE_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

const randomizeTasks = (tasks: Task[]) => {
  const shuffled = tasks
    .map((task) => ({ ...task, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort, ...task }) => task);
  return shuffled;
};

export default function BingoBoard() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const bingoSize = useRecoilValue(bingoSizeAtom);
  const [bingoBoard, setBingoBoard] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{id: number, title: string}>({id: 0, title: ''});
  const [editText, setEditText] = useState('');
  const [praiseModalVisible, setPraiseModalVisible] = useState(false);

  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);

  const syncTasksWithBoard = async () => {
    const lastRandomizeDate = await AsyncStorage.getItem('lastRandomizeDate');
    const now = new Date().getTime();

    if (!lastRandomizeDate || now - parseInt(lastRandomizeDate, 10) > RANDOMIZE_INTERVAL) {
      const existingTasks = tasks.slice(0, totalCells - 1); // '칭찬하기' 제외
      const randomizedTasks = randomizeTasks(existingTasks);
      setTasks(randomizedTasks);
      await AsyncStorage.setItem('lastRandomizeDate', now.toString());
    }

    const existingTasks = tasks.slice(0, totalCells - 1); // '칭찬하기' 제외
    const emptyCellsNeeded = totalCells - 1 - existingTasks.length;

    // 현재 빙고 보드에서 칭찬하기 셀의 완료 상태 확인
    const praiseCell = bingoBoard.find(cell => cell.id === 9999);
    const praiseCellCompleted = praiseCell ? praiseCell.completed : false;

    const filledBoard = Array.from({ length: totalCells }, (_, i) => {
      if (i === centerIndex) 
        return { id: 9999, title: '칭찬하기', completed: praiseCellCompleted };

      // 중앙 셀을 제외한 인덱스 계산
      let taskIndex = i;
      if (i > centerIndex) taskIndex = i - 1;

      // 해당 인덱스의 할 일 가져오기 (없으면 빈 셀)
      return tasks[taskIndex] || { id: -(i + 1), title: '', completed: false };
    });

    setBingoBoard(filledBoard);
  };

  useEffect(() => {
    syncTasksWithBoard();
  }, [tasks, bingoSize]);

  const toggleTaskCompletion = (id: number) => {
    setBingoBoard((prev) =>
      prev.map((cell) =>
        cell.id === id ? { ...cell, completed: !cell.completed } : cell
      )
    );
    if (id !== 9999) { // ✅ '칭찬하기'도 선택 가능하지만 수정 금지
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task
          )
        );
      }
  };

  const handleLongPress = (id: number, title: string) => {
    if (id === 9999) {
      setPraiseModalVisible(true);
      return;
    }
    
    setSelectedCell({id, title});
    setEditText(title);
    setModalVisible(true);
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
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>할 일 수정</Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              placeholder="할 일을 입력하세요"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={saveEdit}
              >
                <Text style={styles.buttonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* 칭찬하기 전용 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={praiseModalVisible}
        onRequestClose={() => setPraiseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>칭찬하기</Text>
            <View style={styles.praiseContent}>
              <Text style={styles.praiseText}>
                칭찬하기는 꼭 해주세요. 거울 속 나 자신에게 칭찬해도 좋아요.
              </Text>
              <LinearGradient
                colors={['#8EB69B', '#235347']}
                locations={[0.2, 1]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.praiseIcon}
              >
                <Text style={styles.praiseIconText}>♥</Text>
              </LinearGradient>
            </View>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton, {marginTop: 16}]} 
              onPress={() => setPraiseModalVisible(false)}
            >
              <Text style={styles.buttonText}>확인</Text>
            </TouchableOpacity>
          </Animated.View>
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
        fontSize: 12,
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
});