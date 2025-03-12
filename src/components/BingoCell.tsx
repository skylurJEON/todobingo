// src/components/BingoCell.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export interface BingoCellProps {
  title: string;
  completed: boolean;
  onPress: () => void;
  onLongPress: (title: string) => void;
}

const BingoCell: React.FC<BingoCellProps> = ({ title, completed, onPress, onLongPress }) => {
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

  const animatedStyle = completed
    ? {
        transform: [
          { rotate: wobbleAnim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
          { scale: scaleAnim },
        ],
      }
    : { transform: [{ scale: scaleAnim }] };

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    onLongPress(title);
  };

  return (
    <Animated.View style={[animatedStyle]}>
      <TouchableOpacity onPress={onPress} onLongPress={handleLongPress} delayLongPress={300}>
        <LinearGradient
          colors={completed ? ['#8EB69B', '#235347'] : ['#000', '#222']}
          locations={[0.2, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[styles.cell, completed && styles.completedCell]}
        >
          <Text style={[styles.text, completed && styles.completedText]}>{title || ' '}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: 68,
    height: 68,
    margin: 5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCell: {
  
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
});

export default BingoCell;