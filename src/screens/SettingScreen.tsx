import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { useRecoilState } from 'recoil';
import { bingoSizeAtom } from '../atoms/bingoSettingsAtom';
import { getAuth } from '@react-native-firebase/auth';
import { signOut, updateUserProfile } from '../firebase/firebaseService';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';

// Firebase 인스턴스 가져오기
const auth = getAuth();

// 네비게이션 타입 정의
type RootStackParamList = {
  Main: undefined;
  Login: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const LANGUAGES = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' }
];

export default function SettingsScreen() {
  const [bingoSize, setBingoSize] = useRecoilState(bingoSizeAtom);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18next.language || 'ko');
  const navigation = useNavigation<NavigationProp>();

  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
      if (user) {
        setDisplayName(user.displayName || '');
      }
    });

    return () => unsubscribe();
  }, []);

  const changeLanguage = async (lng: string) => {
    try {
      if (selectedLang === lng) {
        return;
      }
      
      await i18next.changeLanguage(lng);
      
      setSelectedLang(lng);
      await AsyncStorage.setItem('user-language', lng);
      
      console.log('언어 변경 성공:', lng, '현재 i18next 언어:', i18next.language);
      
      // 빙고 사이즈를 변경하여 태스크를 새로 로드하도록 함
      const currentSize = bingoSize;
      setBingoSize(currentSize === 3 ? 5 : 3); // 임시로 다른 값으로 변경
      
      // 약간의 지연 후 원래 값으로 복원
      setTimeout(() => {
        setBingoSize(currentSize);
      }, 100);
    } catch (error) {
      console.error('언어 변경 오류:', error);
      Alert.alert('오류', '언어 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('로그아웃', '로그아웃되었습니다.');
    } catch (error) {
      Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateName = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('오류', '이름을 입력해주세요.');
      return;
    }

    const specialCharsRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    if (specialCharsRegex.test(newDisplayName)) {
      Alert.alert(
        t('errors.input_error'), 
        t('errors.name_special_chars')
      );
      return;
    }

    try {
      await updateUserProfile(newDisplayName );
      setDisplayName(newDisplayName);
      setNameModalVisible(false);
      Alert.alert('성공', '이름이 변경되었습니다.');
    } catch (error) {
      Alert.alert('오류', '이름 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.bingo_size')}</Text>
        <View style={styles.bingoSizeContainer}>
          {[3, 5].map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setBingoSize(size)}
              style={[styles.sizeButton, bingoSize === size && styles.selectedButton]}
            >
              <Text style={styles.buttonText}>{size} x {size}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.languageContainer}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                selectedLang === lang.code && styles.selectedLanguageButton
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[
                styles.languageButtonText,
                selectedLang === lang.code && styles.selectedLanguageButtonText
              ]}>
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        
        {isLoggedIn ? (
          <>
            <View style={styles.profileContainer}>
              <Text style={styles.profileLabel}>{t('common.name')}:</Text>
              <Text style={styles.profileValue}>{displayName}</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  setNewDisplayName(displayName);
                  setNameModalVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#8EB69B', '#235347']}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>{t('common.login')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      
      {/* 이름 변경 모달 */}
      <Modal
        visible={nameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.change_name')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder={t('setting.enterNewName')}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={handleUpdateName}
              >
                <Text style={styles.modalPrimaryButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
    padding: 16,
  },
  title: {
    marginTop: 50,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  bingoSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  sizeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    width: 100,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#8EB69B',
    borderColor: '#8EB69B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  profileLabel: {
    color: '#999',
    width: 60,
  },
  profileValue: {
    color: '#fff',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#333',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  loginButton: {
    height: 45,
    width: '100%',
    borderRadius: 8,
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center',
  },
  loginButtonText: { 
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginLeft: 10,
    borderRadius: 4,
  },
  modalButtonText: {
    color: '#999',
  },
  modalPrimaryButton: {
    backgroundColor: '#8EB69B',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  languageButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedLanguageButton: {
    backgroundColor: '#8EB69B',
    borderColor: '#8EB69B',
  },
  selectedLanguageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
