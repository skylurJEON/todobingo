import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BingoBoard from '../components/BingoBoard';
import { useRecoilValue } from 'recoil';
import { scoreAtom } from '../atoms/scoreAtom';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const scoreState = useRecoilValue(scoreAtom);
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>  {scoreState.totalScore}
                <Text style={styles.scoreLabel}>  {t('common.points')}</Text>
            </Text>
        </View>
        <View style={styles.streakBox}>
           <Text style={styles.scoreLabel}>  
            <Text style={styles.scoreValue}>  {scoreState.streak}</Text>
            <Text style={styles.dayText}>  {t('common.day')}</Text></Text>
        </View>
      </View>
      <BingoBoard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    padding: 20,
  },

  progressBarContainer: {
    marginTop: 50,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsContainer: {
    marginTop: 50,
    //flexDirection: 'row',
    //justifyContent: 'space-between',
    marginBottom: 0,
    gap: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    //backgroundColor: '#010101',
  },

  scoreBox: {
    //backgroundColor: '#8EB69B',
    //padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 18,
    color: '#DAF1DE',
    fontWeight: '300',
  },


  scoreValue: {
    fontSize: 38,
    fontWeight: '400',
    color: '#8EB69B',
  },

  streakBox: {
    alignItems: 'center',
  },
  streakText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 12,
  },        
  dayText: {
    color: '#DAF1DE',
    fontWeight: '400',
    fontSize: 16,
  },
});
