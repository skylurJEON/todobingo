import { Pressable, Text, StyleSheet } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';


export default function EditTodo() {
  return (
    <Pressable>
      <Ionicons name="pencil" size={24} color="black" />
    </Pressable>
  );
}
