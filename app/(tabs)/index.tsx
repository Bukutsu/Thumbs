import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Text, useTheme, IconButton, Button } from "react-native-paper";
import { generateRandomWords } from "../../utils/words";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function TypingTest() {
  const { user } = useAuth(); // Get the anonymous user

  const [targetText, setTargetText] = useState(() => generateRandomWords());
  const textArray = targetText.split("");

  const [userInput, setUserInput] = useState("");

  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  const focusInput = () => {
    if (!endTime) {
      inputRef.current?.focus();
    }
  };

  const handleInput = (text: string) => {
    if (endTime) return;

    if (!startTime && text.length === 1) {
      setStartTime(Date.now());
    }

    setUserInput(text);

    if (text.length === textArray.length) {
      setEndTime(Date.now());
    }
  };

  // Helper to calculate WPM and Accuracy
  const calculateResults = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0 };

    const timeInMinutes = (endTime - startTime) / 60000;

    let correctChars = 0;
    for (let i = 0; i < textArray.length; i++) {
      if (userInput[i] === textArray[i]) {
        correctChars++;
      }
    }

    const wpm = Math.round(textArray.length / 5 / timeInMinutes);
    const accuracy = Math.round((correctChars / textArray.length) * 100);

    return { wpm, accuracy };
  };

  // 1. Save the score to Firebase when the test ends
  useEffect(() => {
    const saveScore = async () => {
      // Only save if the test is done and we have a valid logged-in user
      if (endTime && user) {
        const { wpm, accuracy } = calculateResults();

        try {
          await addDoc(collection(db, "scores"), {
            uid: user.uid, // Tie the score to this anonymous user
            wpm: wpm,
            accuracy: accuracy,
            createdAt: serverTimestamp(), // Use Firebase's server time
          });
          console.log("Score saved successfully!");
        } catch (error) {
          console.error("Error saving score: ", error);
        }
      }
    };

    saveScore();
  }, [endTime]); // This effect runs every time 'endTime' changes

  const resetTest = () => {
    setUserInput("");
    setTargetText(generateRandomWords());
    setStartTime(null);
    setEndTime(null);

    setTimeout(() => {
      focusInput();
    }, 100);
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
