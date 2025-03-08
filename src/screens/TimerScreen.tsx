import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

export default function TimerScreen({ route, navigation }: { route: any, navigation: any }) {
  const { task, onComplete } = route.params;
  const { t } = useTranslation();
  // 타이머 시간 옵션 (초 단위)
  const timeOptions = [
    { label: '1'+t('timer.time_options'), value: 60 },
    { label: '5'+t('timer.time_options'), value: 5 * 60 },
    { label: '10'+t('timer.time_options'), value: 10 * 60 },
  ];
  
  // 선택된 시간 (기본값: 아직 선택 안함)
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  // 남은 시간
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // 타이머 실행 중 여부
  const [isRunning, setIsRunning] = useState(false);

  // 스톱워치 모드 여부
  const [isStopwatchMode, setIsStopwatchMode] = useState(false);
  // 스톱워치 시간
  const [stopwatchTime, setStopwatchTime] = useState(0);

  // 타이머 시작 함수
  const startTimer = (seconds: number) => {
    setSelectedTime(seconds);
    setTimeLeft(seconds);
    setIsRunning(true);
  };

  // 타이머 실행 효과
  useEffect(() => {
    if (!isRunning || timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          
          // 비동기적으로 처리
          setTimeout(() => {
            if (task) {
              onComplete();
              navigation.goBack();
            }
          }, 0);
          
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);



    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // 스톱워치 실행 효과
  useEffect(() => {
    if (!isStopwatchMode) return ;

    const stopwatch = setInterval(() => {
      setStopwatchTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(stopwatch);
  }, [isStopwatchMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
        <View style={styles.backButtonContainer}>
            <TouchableOpacity onPress={() => {
              if (isRunning || isStopwatchMode) {
                // 타이머나 스톱워치 실행 중일 때 확인 메시지 표시
                Alert.alert(
                  isRunning ? t('timer.stop') : t('timer.stop'),
                  isRunning ? t('timer.confirm_stop_timer') : t('timer.confirm_stop_stopwatch'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { 
                      text: t('timer.stop'), 
                      onPress: () => {
                        if (isStopwatchMode) {
                          // 스톱워치 모드에서는 완료 처리
                          setTimeout(() => {
                            if (task) {
                              onComplete();
                            }
                          }, 0);
                        }
                        navigation.goBack() 
                      }
                    }
                  ]
                );
              } else {
                navigation.goBack();
              }
            }}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
        </View>
      <Text style={styles.title}>⏳ {task.title} {t('onboarding.start')}</Text>
      
      {!isRunning && !isStopwatchMode ? (
        // 타이머 선택 화면
        <View style={styles.optionsContainer}>
          <Text style={styles.selectText}>{t('timer.select_time')}</Text>
          <View style={styles.buttonGroup}>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.timeButton}
                onPress={() => startTimer(option.value)}
              >
                <LinearGradient
                  colors={['#235347', '#8EB69B']}
                  locations={[0.2, 1]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.timeButtonGradient}
                >
                  <Text style={styles.timeButtonText}>{option.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.stopwatchButton}
            onPress={() => setIsStopwatchMode(true)}
          >
            <Text style={styles.stopwatchButtonText}>{t('timer.stopwatch_mode')}</Text>
          </TouchableOpacity>
        </View>
      ) : isStopwatchMode ? (
        // 스톱워치 실행 화면
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(stopwatchTime)}</Text>
          <TouchableOpacity 
            onPress={() => {
              // 스톱워치 실행 중일 때 확인 메시지 표시
              Alert.alert(
                t('timer.stop'),
                t('timer.confirm_stop_stopwatch'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { 
                    text: t('timer.stop'), 
                    onPress: () => {
                      setIsStopwatchMode(false);
                      
                      // 비동기적으로 처리
                      setTimeout(() => {
                        if (task) {
                          onComplete();
                          navigation.goBack();
                        }
                      }, 0);
                    } 
                  }
                ]
              );
            }} 
            style={styles.cancelButton}
          >
            <Text style={styles.buttonText}>{t('timer.stop')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // 타이머 실행 화면
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{timeLeft !== null ? formatTime(timeLeft) : '0:00'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.buttonText}>{t('timer.stop')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#050505',
    padding: 20
  },
  backButtonContainer: {
    position: 'absolute',
    top: 70,
    left: 20
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 40, 
    color: '#fff',
    textAlign: 'center'
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    //backgroundColor: '#0B2B26'
  },
  selectText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20
  },
  buttonGroup: {
    //width: '100%',
    //height: 100,
    flexDirection: 'row',
    marginTop: 10,
    //backgroundColor: 'red'
  },
  timeButton: {
    width: '30%',
    //height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    //justifyContent: 'center'
  },
  timeButtonGradient: {
    //padding: 15,
    width: '80%',
    height: 45,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 5
  },
  timeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    //justifyContent: 'center',
    //alignItems: 'center'
  },
  timerContainer: {
    alignItems: 'center',
    //justifyContent: 'center'
  },
  timer: { 
    fontSize: 60, 
    fontWeight: 'bold', 
    color: '#8EB69B',
    marginBottom: 40
  },
  cancelButton: { 
    padding: 15, 
    backgroundColor: '#444', 
    borderRadius: 12, 
    alignItems: 'center',
    width: 120
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  stopwatchButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#444',
    borderRadius: 12,
    alignItems: 'center',
    width: '80%'
  },
  stopwatchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
});