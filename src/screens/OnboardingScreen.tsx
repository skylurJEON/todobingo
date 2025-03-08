import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;

//const { t } = useTranslation();



export default function OnboardingScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    { id: '1', text: t('onboarding.welcome') },
    { id: '2', image: require('../assets/slide1.jpg') ,text: t('onboarding.slide1')},
    { id: '3', image: require('../assets/slide2.jpg') ,text: t('onboarding.slide2')},
    { id: '4', image: require('../assets/slide3.jpg') ,text: t('onboarding.slide3')},
    { id: '5', image: require('../assets/slide4.jpg') ,text: t('onboarding.slide4')},
  ];

  useEffect(() => {
    // 이미 온보딩을 봤는지 확인
    const checkOnboardingStatus = async () => {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding) {
        navigation.replace('Main'); // 바로 메인 화면으로 이동
      }
    };
    checkOnboardingStatus();
  }, []);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 온보딩 완료 후 AsyncStorage에 저장하고 메인으로 이동
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Main');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        {slides[currentIndex].image && (
          <Image source={slides[currentIndex].image} resizeMode="contain" style={styles.image} />
        )}
        {slides[currentIndex].text && (
          <Text style={styles.text}>{slides[currentIndex].text}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {currentIndex === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
  },
  nextButton: {
    position: 'absolute',
    bottom: 50,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#8EB69B',
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  image: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
  },
});
