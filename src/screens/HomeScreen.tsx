import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BingoBoard from '../components/BingoBoard';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.boardContainer}>
        <BingoBoard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#050505' 
    //backgroundColor: 'red',
    
  },
  boardContainer: {
    flex: 1,
    paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    //backgroundColor: 'blue',

  },
});