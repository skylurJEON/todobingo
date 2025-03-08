import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HomeScreen from "../screens/HomeScreen";
import TaskScreen from "../screens/TaskScreen";
import RankScreen from "../screens/RankScreen";
import SettingScreen from "../screens/SettingScreen";
import TimerScreen from "../screens/TimerScreen";
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();



// 온보딩 스크린
function InitialScreen({navigation}: {navigation: any}) {
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
            if (hasSeen) {
                navigation.replace('Main');
            } else {
                navigation.replace('Onboarding');
            }
        };
        checkOnboardingStatus();
    }, []);

    return null;
}

// 홈 스크린과 타이머 스크린을 포함하는 스택 네비게이터
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
    </Stack.Navigator>
  );
}

export const AppNavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Initial" component={InitialScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const MainTabs = () => {
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'black',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          borderColor: '#111',
        },
        tabBarActiveTintColor: '#8EB69B',
        tabBarInactiveTintColor: '#fff',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            //case 'Task': iconName = focused ? 'people' : 'people-outline'; break;
            case 'Rank': iconName = focused ? 'trophy' : 'trophy-outline'; break;
            case 'Setting': iconName = focused ? 'settings' : 'settings-outline'; break;
            default: iconName = 'ellipse';
          }
          
          return <Ionicons name={iconName as any} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Rank" component={RankScreen} options={{title:t('common.rank')}} />
      <Tab.Screen name="Home" component={HomeStack} options={{title:t('common.home')}} />
      <Tab.Screen name="Setting" component={SettingScreen} options={{title:t('common.settings')}} />
    </Tab.Navigator>
  );
};
