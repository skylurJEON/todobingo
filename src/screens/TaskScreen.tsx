import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';
import { loadTasks, saveTasks } from '../services/taskService';
import LinearGradient from 'react-native-linear-gradient';

export default function TaskScreen() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const bingoSize = useRecoilValue(bingoSizeAtom);
  const [input, setInput] = useState('');

  const totalTasks = bingoSize * bingoSize; // 칭찬하기 포함
  const editableTasksCount = totalTasks - 1; // 사용자가 추가할 수 있는 최대 할 일 수

  useEffect(() => {
    const fetchTasks = async () => {
      const savedTasks = await loadTasks(bingoSize);

      const trimmedTasks = savedTasks.slice(0, editableTasksCount); // 초과 시 자르기
      const emptyTasksNeeded = editableTasksCount - trimmedTasks.length;

      const updatedTasks = [
        ...trimmedTasks,
        ...Array.from({ length: emptyTasksNeeded }, (_, i) => ({
          id: -(i + 1),
          title: '',
          completed: false,
        })),
      ];

      setTasks(updatedTasks);
    };

    fetchTasks();
  }, [bingoSize]);

  useEffect(() => {
    saveTasks(bingoSize, tasks);
  }, [tasks]);

  

  const startEditing = (task: Task) => {
    if (task.title === '칭찬하기') {
      Alert.alert('알림', '칭찬하기는 꼭 해주세요. 거울 속 나 자신에게 칭찬해도 좋아요.');
      return;
    }

    Alert.prompt(
      '할 일 수정',
      '새로운 내용을 입력하세요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: (text) => {
            if (text?.trim()) {
              setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? { ...t, title: text.trim() } : t))
              );
            }
          },
        },
      ],
      'plain-text',
      task.title
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>할 일 목록</Text>
      

      <FlatList
        data={[...tasks, { id: 9999, title: '칭찬하기', completed: false }]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <LinearGradient
              colors={item.completed ? ['#8EB69B','#235347'] : ['#235347','#8EB69B']}
              locations={[0.2, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[styles.taskCard, item.completed && styles.completedTaskCard]}
            >
              <Text style={[styles.taskText, item.completed && styles.completedText]}>
                {item.title || '빈 칸'}
              </Text>
              <TouchableOpacity 
                onPress={() => startEditing(item)} 
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#051F20',
    alignItems: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '500', 
    marginTop: '15%',
    marginBottom: 16, 
    textAlign: 'center', 
    color: '#fff' 
  },
  taskItem: { 
    
    width: '100%',
    height: 40,
    marginBottom: 12, 
    borderRadius: 16, 
    //overflow: 'hidden', 
    //shadowColor: '#000', 
    //shadowOffset: { width: 0, height: 2 }, 
    //shadowOpacity: 0.1, 
    //shadowRadius: 4, 
    //elevation: 3 
  },
  taskCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    
    //borderWidth: 1,
    //borderColor: 'red',
    borderRadius: 16,
    //padding: 10,
  },
  completedTaskCard: {
    
  },
  taskText: { 
    fontSize: 15,
    textAlign: 'center', 
    color: '#fff', 
    fontWeight: '400',
    //padding: 10,
    paddingLeft: 20,
    paddingRight: '60%',
    //flex: 1 
  },
  completedText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  editButton: { 
    backgroundColor: '#0B2B26', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    height: '100%',
    //borderRadius: 16, 
    marginLeft: 8,
  },
  editButtonText: {
    textAlign: 'center',
    color: '#fff', 
    fontWeight: 'bold' 
  },
  
});