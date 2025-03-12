import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchRankings, fetchMyRanking, subscribeMyRanking } from '../firebase/firebaseService';
import { getAuth } from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

// 랭킹 데이터 타입 정의
interface RankingData {
    id: string;
    rank: number;
    displayName: string;
    totalScore: number;
    streak: number;
  }

// 네비게이션 타입 정의
type RootStackParamList = {
  Main: undefined;
  Login: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;


export default function RankScreen() {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [myRanking, setMyRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
    });
  
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      // 구독을 통해 내 랭킹 데이터를 실시간으로 업데이트
      const currentUser = auth.currentUser;
      if (currentUser) {
        const unsubscribeRanking = subscribeMyRanking(currentUser.uid, (data) => {
          setMyRanking({
            id: currentUser.uid,
            rank: data.rank,
            displayName: data.displayName,
            totalScore: data.totalScore,
            streak: data.streak,
          });
        });
        return () => unsubscribeRanking();
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadRankings();
  }, [isLoggedIn]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const rankingsData = await fetchRankings();
      setRankings(rankingsData as RankingData[]);
      
      if (isLoggedIn) {
        const myRankingData = await fetchMyRanking();
        setMyRanking(myRankingData as RankingData);
      }
    } catch (error) {
      console.error('랭킹 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRankItem = ({ item }: { item: RankingData }) => {
    const currentUser = auth.currentUser;
    const isMe = currentUser && item.id === currentUser.uid;
    
    return (
      <LinearGradient
        colors={isMe ? ['#8EB69B', '#235347'] : ['#222', '#333']}
        style={styles.rankItem}
      >
        <Text style={[styles.rankText, isMe && styles.myRankText]}>{item.rank}</Text>
        <Text style={[styles.nameText, isMe && styles.myRankText]}>{item.displayName}</Text>
        <Text style={[styles.scoreText, isMe && styles.myRankText]}>{item.totalScore} {t('common.points')}</Text>
        <Text style={[styles.streakText, isMe && styles.myRankText]}>🔥 {item.streak}
        <Text style={styles.dayText}>{t('common.day')}</Text></Text>
      </LinearGradient>
    );
  };

  // 화면이 포커스될 때마다 랭킹 새로고침
  useFocusEffect(
    useCallback(() => {
      loadRankings();
      return () => {}; // 클린업 함수
    }, [isLoggedIn])
  );
  
  // 새로고침 기능 추가
  const handleRefresh = () => {
    loadRankings();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8EB69B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('rank.title')}</Text>
      
      {!isLoggedIn ? (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>{t('rank.login_to_see')}</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>{t('common.login')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {myRanking && (
            <View style={styles.myRankContainer}>
              <Text style={styles.myRankTitle}>{t('rank.my_rank')}</Text>
              <LinearGradient
                colors={['#8EB69B', '#235347']}
                style={styles.myRankItem}
              >
                <Text style={styles.myRankText}>{myRanking.rank}</Text>
                <Text style={styles.myRankText}>{myRanking.displayName}</Text>
                <Text style={styles.myRankText}>{myRanking.totalScore} {t('common.points')}</Text>
                <Text style={styles.myRankText}>🔥 {myRanking.streak} {t('common.day')}</Text>
              </LinearGradient>
            </View>
          )}
          
          <Text style={styles.rankingsTitle}>{t('rank.all_rank')}</Text>
          <FlatList
            data={rankings}
            renderItem={renderRankItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.rankingsList}
            refreshing={loading}
            onRefresh={handleRefresh}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
    marginTop: 50,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#8EB69B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  myRankContainer: {
    marginBottom: 24, 
  },
  myRankTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,

  },
  myRankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 30,
    width: '100%',
    borderRadius: 8,
  },
  myRankText: {
    marginLeft: 10,
    marginRight: 10,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  rankingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  rankingsList: {
    paddingBottom: 16,
    //marginRight: 10,
  },
  rankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 30,
    borderRadius: 8,
    marginBottom: 8,
  },
  rankText: {
    marginLeft: 10,
    padding: 1,
    color: '#fff',
    width: 40,
    marginRight: 0,

  },
  nameText: {
    color: '#fff',
    flex: 1,
  },
  scoreText: {
    color: '#fff',
    width: 80,
    textAlign: 'right',
    marginRight: 20,
  },
  streakText: {
    color: '#fff',
    width: 60,
    textAlign: 'right',
    marginRight: 10,
  },
  dayText: {
    color: '#fff',
    fontSize: 10,
  },
});
