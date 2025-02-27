import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeScreen from "../screens/HomeScreen";
import TaskScreen from "../screens/TaskScreen";
import RankScreen from "../screens/RankScreen";
import SettingScreen from "../screens/SettingScreen";

const Tab = createBottomTabNavigator();

export const AppNavigation = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
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
        
    
        <Tab.Screen name="Rank" component={RankScreen} options={{title:'랭킹'}} />
        <Tab.Screen name="Home" component={HomeScreen} options={{title:'홈'}} />
        <Tab.Screen name="Setting" component={SettingScreen} options={{title:'설정'}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
