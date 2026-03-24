// app/(tabs)/index.tsx
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WORDS } from "../../utils/words";

const TypingTest = () => {
  const [userInput, setUserInput] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.blur(); // Force unfocus
    inputRef.current?.focus(); // Re-focus
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <Pressable style={styles.typingArea} onPress={handlePress}>
          <TextInput
            ref={inputRef}
            style={{ position: "absolute", opacity: 0 }}
            value={userInput}
            onChangeText={setUserInput}
            // Remove autoFocus={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {WORDS.map((word, wordIdx) => (
            <View key={`${word}-${wordIdx}`} style={styles.word}>
              {word.split("").map((char, charIdx) => (
                <Text key={charIdx}>{char}</Text>
              ))}
            </View>
          ))}
        </Pressable>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // Or your theme color
  },
  // This style goes on the Pressable that holds the words
  typingArea: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "center",
    padding: 20,
  },
  word: {
    flexDirection: "row",
    marginRight: 10,
    marginBottom: 5, // Add a little space between lines
  },
});
export default TypingTest;
