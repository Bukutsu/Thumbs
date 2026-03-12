import { useState, useRef } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";

export default function TypingTest() {
  const targetText = "the quick brown fox";
  const textArray = targetText.split("");

  const [userInput, setUserInput] = useState("");

  // 1. Bring in the Material You theme object
  const theme = useTheme();

  const inputRef = useRef<TextInput>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // 2. Function to reset the test
  const resetTest = () => {
    setUserInput("");
    focusInput(); // Automatically reopen the keyboard so they can start right away
  };

  return (
    // Apply the dynamic theme background color to the main container
    <Pressable
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onPress={focusInput}
    >
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={userInput}
        onChangeText={setUserInput}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={true}
      />

      <View style={styles.textContainer}>
        {textArray.map((letter, index) => {
          // Use Material You semantic colors instead of hardcoded hex codes
          let color = theme.colors.onSurfaceVariant; // Muted text color for untyped letters

          const isActive = index === userInput.length;

          if (index < userInput.length) {
            const isCorrect = userInput[index] === letter;
            // High contrast for correct, Error color for incorrect
            color = isCorrect ? theme.colors.onSurface : theme.colors.error;
          }

          return (
            <View key={index} style={styles.letterWrapper}>
              {/* Use the Primary theme color for the cursor */}
              {isActive && (
                <View
                  style={[
                    styles.caret,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}

              <Text
                variant="displaySmall"
                style={{ color: color, fontFamily: "monospace" }}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 3. The Material You Reset Button */}
      <View style={styles.toolbar}>
        <IconButton
          icon="refresh"
          mode="contained-tonal"
          size={32}
          onPress={resetTest}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  textContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center", // Keeps the text block centered
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
  },
  letterWrapper: {
    position: "relative",
  },
  caret: {
    position: "absolute",
    left: 0,
    top: "10%",
    bottom: "10%",
    width: 2,
    zIndex: 1,
  },
  toolbar: {
    marginTop: 40,
    alignItems: "center", // Centers the button horizontally
  },
});
