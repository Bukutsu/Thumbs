import { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text, useTheme, IconButton, Button } from "react-native-paper";
import { generateRandomWords } from "../../utils/words";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function TypingTest() {
  // Grab the anonymous user session created when the app started.
  // We need this UID to securely save the user's score to Firestore.
  const { user } = useAuth();

  // STATE: targetText holds the string of words the user needs to type.
  // We initialize it using a lazy function `() => generateRandomWords(50)`
  // so it only generates the words once when the component first mounts.
  const [targetText, setTargetText] = useState(() => generateRandomWords(50));

  // Convert the full string into an array of individual letters.
  // This allows us to map over them and color each letter individually based on input.
  const textArray = targetText.split("");

  // ALGORITHM: Grouping letters into words.
  // If we just wrap individual letters, a word might break in half at the end of a line (e.g., "wo" and "rd").
  // By grouping letters into an array of "Word" arrays, we can wrap the whole word in a row View.
  const wordsWithIndexes: { letter: string; index: number }[][] = [];
  let globalIndex = 0; // Tracks the absolute index of the letter across the entire test

  targetText.split(" ").forEach((word, wordIndex, wordsArr) => {
    const wordObj = [];
    // 1. Push each letter of the current word
    for (let i = 0; i < word.length; i++) {
      wordObj.push({ letter: word[i], index: globalIndex });
      globalIndex++;
    }
    // 2. Add the trailing space after the word (unless it's the very last word)
    if (wordIndex < wordsArr.length - 1) {
      wordObj.push({ letter: " ", index: globalIndex });
      globalIndex++;
    }
    // Push the constructed word array into our main array
    wordsWithIndexes.push(wordObj);
  });

  // STATE: userInput tracks everything the user has typed so far.
  const [userInput, setUserInput] = useState("");

  // STATE: Timestamps to calculate the exact duration of the test.
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  // STATE: The 60-second visual countdown timer.
  const [timeLeft, setTimeLeft] = useState(60);

  // REF: wordYPositions tracks the vertical (Y) position of every word on the screen.
  // We use a useRef instead of useState so that updating these coordinates
  // doesn't trigger 50 simultaneous UI re-renders when the screen first loads.
  const wordYPositions = useRef<{ [key: number]: number }>({});

  // Get the Material You theme to dynamically color the UI
  const theme = useTheme();

  // REF: A direct reference to the hidden TextInput so we can force the mobile keyboard to open.
  const inputRef = useRef<TextInput>(null);

  // Helper function to programmatically open the keyboard, provided the test isn't over.
  const focusInput = () => {
    if (!endTime) {
      inputRef.current?.focus();
    }
  };

  // EFFECT: The countdown timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    // If the test has started (startTime exists), isn't over, and time remains...
    if (startTime && !endTime && timeLeft > 0) {
      // Create a timer that subtracts 1 second every 1000ms
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && !endTime) {
      // If the timer hits zero, force the test to end by setting the endTime.
      setEndTime(Date.now());
    }

    // Cleanup function: clears the interval if the component unmounts or state changes
    return () => clearInterval(interval);
  }, [startTime, endTime, timeLeft]);

  // HANDLER: Processes every keystroke from the hidden TextInput
  const handleInput = (text: string) => {
    if (endTime) return; // Prevent any typing if the test is finished

    // If this is the very first letter typed, start the clock!
    if (!startTime && text.length === 1) {
      setStartTime(Date.now());
    }

    // Update the state with the new string
    setUserInput(text);

    // If the user somehow types all 50 words perfectly before 60 seconds, end the test.
    if (text.length === textArray.length) {
      setEndTime(Date.now());
    }
  };

  // Helper to calculate the final score
  const calculateResults = () => {
    if (!startTime || !endTime) return { wpm: 0, accuracy: 0 };

    // Convert milliseconds to minutes for the WPM formula
    const timeInMinutes = (endTime - startTime) / 60000;

    let correctChars = 0;
    // Iterate only up to what the user actually managed to type
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === textArray[i]) {
        correctChars++;
      }
    }

    // Standard WPM formula: (Total Characters / 5) / Time In Minutes
    const wpm = Math.round(userInput.length / 5 / timeInMinutes);
    // Accuracy: (Correct Characters / Total Typed Characters) * 100
    const accuracy =
      userInput.length > 0
        ? Math.round((correctChars / userInput.length) * 100)
        : 0;

    return { wpm, accuracy };
  };

  // EFFECT: Database write operation.
  // This runs automatically whenever 'endTime' changes.
  useEffect(() => {
    const saveScore = async () => {
      // Ensure the test is actually over and we have a valid anonymous user ID
      if (endTime && user) {
        const { wpm, accuracy } = calculateResults();

        try {
          // Push a new document to the "scores" collection in Firestore
          await addDoc(collection(db, "scores"), {
            uid: user.uid,
            wpm: wpm,
            accuracy: accuracy,
            createdAt: serverTimestamp(), // Use Google's server time, not local phone time
          });
          console.log("Score saved successfully!");
        } catch (error) {
          console.error("Error saving score: ", error);
        }
      }
    };

    saveScore();
  }, [endTime]); // Dependency array: only execute when 'endTime' is updated

  // HANDLER: Resets all state variables back to their defaults for a new test
  const resetTest = () => {
    setUserInput("");
    setTargetText(generateRandomWords(50));
    setStartTime(null);
    setEndTime(null);
    setTimeLeft(60);
    wordYPositions.current = {}; // Clear out the old cached layout coordinates

    // Slight delay to ensure React has finished rendering the new text before focusing the keyboard
    setTimeout(() => {
      focusInput();
    }, 100);
  };

  // UI CONDITIONAL RENDER: Show the Results Screen if the test is over
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

  // --- SCROLLING ALGORITHM ---
  // 1. Figure out which word the user is currently typing by splitting their input by spaces
  const activeWordIndex = userInput.split(" ").length - 1;

  // 2. Look up the exact vertical (Y) coordinate of that word from our layout cache
  const currentY = wordYPositions.current[activeWordIndex] || 0;

  // 3. If the active word drops below the first line (Y > 45px), calculate a negative
  //    translation to pull the entire text container upwards, keeping the active word visible.
  const translateY = currentY > 45 ? -(currentY - 45) : 0;

  // Normal Typing Test Render
  return (
    <Pressable
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onPress={focusInput}
    >
      {/*
        The Invisible Keyboard Hack:
        Mobile phones require an active TextInput to display the digital keyboard.
        We place one here but set opacity to 0 so the user only sees our custom UI.
      */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={userInput}
        onChangeText={handleInput}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={true}
      />

      <Text
        variant="headlineMedium"
        style={[styles.timer, { color: theme.colors.primary }]}
      >
        {timeLeft}s
      </Text>

      {/*
        The Viewport:
        This view is strictly 3 lines tall (135px) and hides overflow.
        This ensures the user only ever sees a small block of text at a time.
      */}
      <View style={styles.textWindow}>
        <View style={[styles.textContainer, { transform: [{ translateY }] }]}>
          {/* Map over our grouped words */}
          {wordsWithIndexes.map((word, wIndex) => (
            <View
              key={wIndex}
              style={styles.wordWrapper}
              onLayout={(e) => {
                // As React Native renders the screen, this fires for every word.
                // We cache its physical Y coordinate so our scrolling algorithm can use it later.
                wordYPositions.current[wIndex] = e.nativeEvent.layout.y;
              }}
            >
              {/* Map over the letters inside each word */}
              {word.map((item) => {
                const { letter, index } = item;
                let color = theme.colors.onSurfaceVariant; // Default gray

                // Check if the cursor is exactly at this letter's position
                const isActive = index === userInput.length;

                // If the user has typed past this index, evaluate if they were right or wrong
                if (index < userInput.length) {
                  const isCorrect = userInput[index] === letter;
                  color = isCorrect
                    ? theme.colors.onSurface // High contrast if correct
                    : theme.colors.error; // Red if wrong
                }

                return (
                  <View key={index} style={styles.letterWrapper}>
                    {/* Render the blinking cursor if this is the active letter */}
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
                      style={{
                        color: color,
                        fontFamily: "monospace",
                        lineHeight: 45, // Hardcoded line height is crucial for the scroll math
                      }}
                    >
                      {letter}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
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
    padding: 20,
    paddingTop: 60, // Push the content down slightly from the very top of the screen
  },
  timer: {
    textAlign: "center",
    marginBottom: 40,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  textWindow: {
    height: 135, // Exactly 3 lines high (45px * 3 lines)
    overflow: "hidden", // Hide any text that falls outside this specific box
    marginBottom: 40,
  },
  textContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  wordWrapper: {
    flexDirection: "row", // Ensure letters in a word stay on the same line
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
