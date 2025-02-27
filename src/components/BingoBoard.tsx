import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Animated} from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

interface BingoCellProps {
  title: string;
  completed: boolean;
  onPress: () => void;
}

function BingoCell({ title, completed, onPress }: BingoCellProps) {
    const wobbleAnim = useRef(new Animated.Value(0)).current;

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
      ],
    } : {};
  
    return (
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity onPress={onPress}>
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

export default function BingoBoard() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const bingoSize = useRecoilValue(bingoSizeAtom);
  const [bingoBoard, setBingoBoard] = useState<Task[]>([]);

  const totalCells = bingoSize * bingoSize;
  const centerIndex = Math.floor(totalCells / 2);

  const syncTasksWithBoard = () => {
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

  return (
    <View style={[styles.board, { width: (70 + 8) * bingoSize }]}>
      {bingoBoard.map((cell, index) => (
        <BingoCell
          key={index}
          title={cell.title}
          completed={cell.completed}
          onPress={() => toggleTaskCompletion(cell.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});