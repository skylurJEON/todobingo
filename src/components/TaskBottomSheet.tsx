import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

interface Props {
  onSubmit: (tasks: string[]) => void;
}

export default function TaskBottomSheet({ onSubmit }: Props) {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['25%', '50%', '75%'], []);

  const addTask = () => {
    if (task.trim()) {
      setTasks([...tasks, task.trim()]);
      setTask('');
    }
  };

  const handleSubmit = () => { 
    onSubmit(tasks);
    setTasks([]);
    bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints}>
      <View style={styles.content}>
        <Text style={styles.title}>할 일 추가</Text>
        <TextInput
          style={styles.input}
          placeholder="할 일을 입력하세요"
          value={task}
          onChangeText={setTask}
          onSubmitEditing={addTask}
        />
        <Button title="추가" onPress={addTask} />

        <FlatList
          data={tasks}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <Text style={styles.taskItem}>• {item}</Text>}
          style={styles.taskList}
        />

        <Button title="완료 및 랜덤 배치" onPress={handleSubmit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 },
  taskList: { marginTop: 10 },
  taskItem: { fontSize: 16, marginVertical: 4 },
});
