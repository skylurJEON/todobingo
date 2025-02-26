import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRecoilState } from 'recoil';
import { tasksAtom, Task } from '../atoms/tasksAtom';

export default function TaskScreen() {
  const [tasks, setTasks] = useRecoilState(tasksAtom);
  const [input, setInput] = useState('');

  const addTask = () => {
    if (!input.trim()) return;

    if (tasks.length >= 16) {
      Alert.alert('빙고판 가득참', '더 이상 할 일을 추가할 수 없습니다.');
      return;
    }

    const newTask: Task = { id: Date.now(), title: input, completed: false };
    setTasks((prev) => [...prev, newTask]); // tasksAtom에 추가하면 자동으로 BingoBoard 반영
    setInput('');
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>할 일 목록</Text>
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="할 일을 입력하세요"
          style={styles.input}
          
        />
        <TouchableOpacity onPress={addTask} style={styles.addButton}>
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <TouchableOpacity onPress={() => toggleTask(item.id)}>
              <Text style={[styles.taskText, item.completed && styles.completedText]}>
                {item.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTask(item.id)}>
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>할 일을 추가해보세요!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#F9FAFB' 
  },
  title: { 
    marginTop: 24, 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    marginBottom: 16 
  },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 12 
  },
  addButton: { 
    backgroundColor: '#4F46E5', 
    paddingHorizontal: 16, 
    justifyContent: 'center', 
    marginLeft: 8, 
    borderRadius: 8 
  },
  addButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  taskItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  taskText: { 
    fontSize: 16 
  },
  completedText: { 
    textDecorationLine: 'line-through', 
    color: 'gray' 
  },
  deleteText: { 
    color: 'red' 
  },
  emptyText: { 
    textAlign: 'center', 
    color: 'gray' 
  },
});