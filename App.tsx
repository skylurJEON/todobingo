import { AppNavigation } from "./src/navigation/AppNavigation";
import { RecoilRoot } from 'recoil';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RecoilRoot>
        <AppNavigation />
      </RecoilRoot>
    </GestureHandlerRootView>
  );
}

