import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRecoilState } from 'recoil';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';

export default function SettingsScreen() {
  const [bingoSize, setBingoSize] = useRecoilState(bingoSizeAtom);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>빙고 크기 선택</Text>
      {[3, 5].map((size) => (
        <TouchableOpacity
          key={size}
          onPress={() => setBingoSize(size)}
          style={[styles.button, bingoSize === size && styles.selectedButton]}
        >
          <Text style={styles.buttonText}>{size} x {size}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: { padding: 12, marginVertical: 8, backgroundColor: '#E5E7EB', borderRadius: 8, width: 200, alignItems: 'center' },
  selectedButton: { backgroundColor: '#4F46E5' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});