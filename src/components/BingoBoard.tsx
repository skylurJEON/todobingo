import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import DraggableGrid from 'react-native-draggable-grid';
import { useRecoilState } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';

interface GridItem extends Task {
  key: string;
}

export default function BingoBoard() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const [gridData, setGridData] = useState<GridItem[]>([]);

  // ✅ tasksAtom 변경 시 gridData 업데이트
  useEffect(() => {
    const totalCells = 16;

    // tasks를 기반으로 그리드 구성
    const taskItems: GridItem[] = tasks.map((task) => ({
      ...task,
      key: task.id.toString(),
    }));

    // 빈 칸 생성
    const emptyCells = Array.from({ length: totalCells - taskItems.length }, (_, i) => ({
      key: `empty-${i}`,
      id: -1 * (i + 1),
      title: '',
      completed: false,
    }));

    setGridData([...taskItems, ...emptyCells]);
  }, [tasks]);

  return (
    <View style={styles.board}>
      <DraggableGrid
        data={gridData}
        renderItem={(item) => (
          <View style={[styles.cell, item.completed && styles.completedCell]}>
            <Text style={[styles.text, item.completed && styles.completedText]}>
              {item.title || ' '}
            </Text>
          </View>
        )}
        onDragRelease={( data ) => {
          setGridData(data); // 그리드 상태 업데이트

          // ✅ 순서 변경된 유효한 할 일만 tasksAtom에 반영
          const updatedTasks = data
            .filter((item) => item.title) // 빈 칸 제거
            .map(({ id, title, completed }) => ({ id, title, completed }));

          setTasks(updatedTasks); // 순서만 업데이트, 데이터 손실 방지
        }}
        numColumns={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  board: { width: (70 + 8) * 4, marginVertical: 20 },
  cell: {
    width: 70,
    height: 70,
    margin: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  completedCell: { backgroundColor: '#4F46E5' },
  text: { fontSize: 12, textAlign: 'center' },
  completedText: { color: '#fff', fontWeight: 'bold' },
});