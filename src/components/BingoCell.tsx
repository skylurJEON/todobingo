import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface BingoCellProps {
  task: string;
  completed: boolean;
  onLongPress: () => void;
}

export default function BingoCell({ task, completed, onLongPress }: BingoCellProps) {
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={200}
      style={[styles.cell, completed && styles.completedCell]}
    >
      <Text style={[styles.text, completed && styles.completedText]}>{task || ' '}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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