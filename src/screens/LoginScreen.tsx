import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { signIn, signUp } from '../firebase/firebaseService';
import LinearGradient from 'react-native-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { signInWithApple } from '../firebase/firebaseService';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { useTranslation } from 'react-i18next';

export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
  // 메인 화면으로 이동하는 함수
  const navigateToMain = () => {
    // CommonActions를 사용하여 네비게이션 스택 재설정
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  // 애플 로그인 지원 여부 확인
  useEffect(() => {
    if (Platform.OS === 'ios') {
        setAppleSignInAvailable(true);
        console.log('애플 로그인 지원 여부:', true);
    }
  }, []);

  // 애플 로그인 처리 함수
  const handleAppleSignIn = async () => {
    setLoading(true);
    
    try {
      await signInWithApple();
      navigateToMain();
    } catch (error: any) {
      let errorMessage = t('errors.apple_login_failed');
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('errors.account_exists');
      }
      
      Alert.alert(t('errors.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };


  // 일반 로그인 처리 함수
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('errors.input_error'), t('errors.email_password_required'));
      return;
    }

    if (isSignUp && !displayName) {
      Alert.alert(t('errors.input_error'), t('errors.name_required'));
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        Alert.alert(t('login.success'), t('common.welcome'), [
          { text: t('common.confirm'), onPress: navigateToMain }
        ]);
      } else {
        await signIn(email, password);
        navigateToMain();
      }
    } catch (error: any) {
      let errorMessage = t('errors.login_failed');
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = t('errors.invalid_credentials');
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('errors.email_in_use');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('errors.invalid_email');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('errors.weak_password');
      }
      
      Alert.alert(t('errors.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? t('login.signup_title') : t('login.title')}</Text>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('common.email')}
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder={t('common.password')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder={t('common.name')}
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={setDisplayName}
          />
        )}
        
        
        
        <TouchableOpacity
          disabled={loading}
          onPress={handleAuth}
        >
          <LinearGradient
            colors={['#8EB69B', '#235347']}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? t('common.signup') : t('common.login')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 애플 로그인 버튼 */}
        {appleSignInAvailable && (
          <AppleButton
            buttonStyle={AppleButton.Style.BLACK}
            buttonType={AppleButton.Type.SIGN_IN}
            style={styles.appleAuthButton}
            onPress={handleAppleSignIn}
          />
        )}
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp ? t('login.have_account') : t('login.no_account')}
          </Text>
        </TouchableOpacity>
        
        {loading && (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#8EB69B',
    fontSize: 14,
  },
  appleAuthButton: {
    width: '100%',
    height: 45,
    marginTop: 15,
  },
  loader: {
    marginTop: 20,
  },
});