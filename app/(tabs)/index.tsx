import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Text, useTheme, IconButton, Button } from "react-native-paper";
import { generateRandomWords } from "../../utils/words";

export default function TypingTest() {
  const [targetText, setTargetText] = useState(() => generateRandomWords());
  const textArray = targetText.split("");

  const [userInput, setUserInput] = useState("");

  // 1. New states for tracking time
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const focusInput = () => {
    // Only focus if the test isn't over
    if (!endTime) {
      inputRef.current?.focus();
    }
  };

  // 2. Custom input handler to catch the first keystroke and the last keystroke
  const handleInput = (text: string) => {
    if (endTime) return; // Prevent typing if test is done

    // Start the timer on the very first keystroke
    if (!startTime && text.length === 1) {
      setStartTime(Date.now());
    }

    setUserInput(text);

    // End the test when the user types the last character
    if (text.length === textArray.length) {
      setEndTime(Date.now());
    }
  };

  const resetTest = () => {
    setUserInput("");
    setTargetText(generateRandomWords());
    setStartTime(null);
    setEndTime(null);

    // Slight delay to ensure the input is rendered before focusing
    setTimeout(() => {
      focusInput();
    }, 100);
  };

  // 3. Helper to calculate WPM and Accuracy
  const calculateResults = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0 };

    const timeInMinutes = (endTime - startTime) / 60000;

    // Calculate how many characters were correct
    let correctChars = 0;
    for (let i = 0; i < textArray.length; i++) {
      if (userInput[i] === textArray[i]) {
        correctChars++;
      }
    }

    // Standard WPM formula: (total characters / 5) / time in minutes
    // We use total textArray length because finishing implies they typed everything
    const wpm = Math.round(textArray.length / 5 / timeInMinutes);
    const accuracy = Math.round((correctChars / textArray.length) * 100);

    return { wpm, accuracy };
  };

  // 4. Render the Results Screen if the test is finished
  if (endTime) {
    const { wpm, accuracy } = calculateResults();

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.resultsContainer}>
          <Text
            variant="displayLarge"
            style={{ color: theme.colors.primary, fontWeight: "bold" }}
          >
            {wpm} WPM
          </Text>
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}
          >
            {accuracy}% Accuracy
          </Text>

          <Button
            mode="contained"
            onPress={resetTest}
            style={styles.nextButton}
            icon="arrow-right"
          >
            Next Test
          </Button>
        </View>
      </View>
    );
  }

  // 5. Normal Typing Test Render
  return (
    <Pressable
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onPress={focusInput}
    >
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={userInput}
        onChangeText={handleInput} // Use our custom handler instead of directly setting state
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={true}
      />

      <View style={styles.textContainer}>
        {textArray.map((letter, index) => {
          let color = theme.colors.onSurfaceVariant;

          const isActive = index === userInput.length;

          if (index < userInput.length) {
            const isCorrect = userInput[index] === letter;
            color = isCorrect ? theme.colors.onSurface : theme.colors.error;
          }

          return (
            <View key={index} style={styles.letterWrapper}>
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
    justifyContent: "center",
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
    alignItems: "center",
  },
  resultsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
});
