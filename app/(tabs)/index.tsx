// app/(tabs)/index.tsx
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import { useTheme, SegmentedButtons } from "react-native-paper";
import { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WORDS } from "../../utils/words";

type CharacterState = "correct" | "incorrect" | "current" | "untyped";
type TestStatus = "idle" | "running" | "finished";

const TypingTest = () => {
  const theme = useTheme();

  const generateWords = useCallback((): string[] => {
    const selected: string[] = [];
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
    let lastWordIndex = -1;

    // Generate enough words for ~60 seconds of typing
    const targetWordCount = 60;

    for (let i = 0; i < targetWordCount; i++) {
      let wordIndex = Math.floor(Math.random() * shuffled.length);
      while (wordIndex === lastWordIndex && shuffled.length > 1) {
        wordIndex = Math.floor(Math.random() * shuffled.length);
      }
      selected.push(shuffled[wordIndex]);
      lastWordIndex = wordIndex;
    }
    return selected;
  }, []);

  // --- State ---
  const [testDuration, setTestDuration] = useState(60);
  const [targetWords, setTargetWords] = useState<string[]>(() => generateWords());
  const targetText = targetWords.join(" ");
  const [userInput, setUserInput] = useState("");
  const [characterStates, setCharacterStates] = useState<CharacterState[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [timeRemaining, setTimeRemaining] = useState(testDuration);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // Update timeRemaining when testDuration changes (only in idle)
  useEffect(() => {
    if (testStatus === "idle") {
      setTimeRemaining(testDuration);
    }
  }, [testDuration, testStatus]);

  // --- Refs ---
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordYPositions = useRef<{ [key: number]: number }>({});
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // --- Cursor Animation ---
  useEffect(() => {
    if (testStatus !== "running") {
      cursorOpacity.setValue(0);
      return;
    }

    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    blinkAnimation.start();
    return () => blinkAnimation.stop();
  }, [testStatus]);

  // --- Auto Scroll ---
  const getCurrentWordIndex = useCallback(() => {
    let charOffset = 0;
    for (let i = 0; i < targetWords.length; i++) {
      const wordLength = targetWords[i].length + 1; // +1 for space
      if (userInput.length >= charOffset && userInput.length < charOffset + wordLength) {
        return i;
      }
      charOffset += wordLength;
    }
    return Math.max(0, targetWords.length - 1);
  }, [targetWords, userInput]);

  useEffect(() => {
    if (testStatus !== "running") return;

    const currentWordIdx = getCurrentWordIndex();
    const targetY = wordYPositions.current[currentWordIdx];

    if (targetY !== undefined && scrollViewRef.current) {
      // Minimal scrolling logic: keep word in view with comfort offset
      scrollViewRef.current.scrollTo({
        y: Math.max(0, targetY - 120),
        animated: true,
      });
    }
  }, [userInput, testStatus, getCurrentWordIndex]);

  // --- Compute character states whenever userInput changes ---
  useEffect(() => {
    const states: CharacterState[] = [];
    for (let i = 0; i < targetText.length; i++) {
      if (i < userInput.length) {
        states.push(userInput[i] === targetText[i] ? "correct" : "incorrect");
      } else if (i === userInput.length) {
        states.push("current");
      } else {
        states.push("untyped");
      }
    }
    setCharacterStates(states);

    let correct = 0;
    let incorrect = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === targetText[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }
    setCorrectCount(correct);
    setIncorrectCount(incorrect);
  }, [userInput, targetText]);

  // --- Live WPM/Accuracy every 500ms while running ---
  useEffect(() => {
    if (testStatus !== "running") return;
    const statsInterval = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed > 0) {
        const liveWpm = Math.round((correctCount / 5) / (elapsed / 60));
        const liveAccuracy =
          userInput.length > 0
            ? Math.round((correctCount / userInput.length) * 100)
            : 100;
        setWpm(Math.max(0, liveWpm));
        setAccuracy(Math.max(0, Math.min(100, liveAccuracy)));
      }
    }, 500);
    return () => clearInterval(statsInterval);
  }, [testStatus, correctCount, userInput]);

  // --- Finish test and compute final stats ---
  const finishTest = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;
    if (elapsed > 0) {
      const finalWpm = Math.round((correctCount / 5) / (elapsed / 60));
      const finalAccuracy =
        userInput.length > 0
          ? Math.round((correctCount / userInput.length) * 100)
          : 100;
      setWpm(Math.max(0, finalWpm));
      setAccuracy(Math.max(0, Math.min(100, finalAccuracy)));
    }
    setTestStatus("finished");
  }, [correctCount, userInput]);

  // --- Handle input change ---
  const handleInputChange = (text: string) => {
    if (testStatus === "finished") return;

    if (testStatus === "idle" && text.length > 0) {
      startTimeRef.current = Date.now();
      setTestStatus("running");
    }

    setUserInput(text);

    if (text.length >= targetText.length) {
      finishTest();
    }
  };

  // --- Timer ---
  useEffect(() => {
    if (testStatus === "running") {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setTestStatus("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [testStatus]);

  // --- Final stats when finished ---
  useEffect(() => {
    if (testStatus !== "finished" || !startTimeRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed > 0) {
      const finalWpm = Math.round((correctCount / 5) / (elapsed / 60));
      const finalAccuracy =
        userInput.length > 0
          ? Math.round((correctCount / userInput.length) * 100)
          : 100;
      setWpm(Math.max(0, finalWpm));
      setAccuracy(Math.max(0, Math.min(100, finalAccuracy)));
    }
  }, [testStatus]);

  // --- Restart ---
  const handleRestart = () => {
    setUserInput("");
    setCharacterStates([]);
    setTestStatus("idle");
    setTimeRemaining(testDuration);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWpm(0);
    setAccuracy(100);
    startTimeRef.current = null;
    wordYPositions.current = {};
    setTargetWords(generateWords());
    inputRef.current?.focus();
  };

  const handlePress = () => {
    if (testStatus === "finished") return;
    inputRef.current?.blur();
    inputRef.current?.focus();
  };

  const renderCharacter = (char: string, idx: number) => {
    const state = characterStates[idx] || "untyped";
    let charStyle: object = {};

    switch (state) {
      case "correct":
        charStyle = { color: theme.colors.primary };
        break;
      case "incorrect":
        charStyle = { color: theme.colors.error, textDecorationLine: "underline" };
        break;
      case "current":
        charStyle = { color: theme.colors.onSurface };
        break;
      case "untyped":
      default:
        charStyle = { color: theme.colors.onSurfaceVariant };
        break;
    }

    const showCursor = idx === userInput.length;

    return (
      <View key={idx} style={styles.charWrapper}>
        {showCursor && (
          <Animated.View
            style={[
              styles.cursor,
              {
                backgroundColor: theme.colors.primary,
                opacity: cursorOpacity,
              },
            ]}
          />
        )}
        <Text style={[styles.char, charStyle]}>{char}</Text>
      </View>
    );
  };

  const renderWords = () => {
    let charOffset = 0;
    return targetWords.map((word, wordIdx) => {
      const wordChars = word.split("").map((char, charIdx) => {
        const globalIdx = charOffset + charIdx;
        return renderCharacter(char, globalIdx);
      });
      const spaceIdx = charOffset + word.length;
      const spaceState = characterStates[spaceIdx] || "untyped";
      const cursorOnSpace = spaceIdx === userInput.length;

      let spaceStyle: object = { color: theme.colors.onSurfaceVariant };
      if (spaceState === "correct") spaceStyle = { color: theme.colors.primary };
      else if (spaceState === "incorrect")
        spaceStyle = {
          color: theme.colors.error,
          backgroundColor: theme.colors.error + "20",
        };

      charOffset = spaceIdx + 1;
      return (
        <View
          key={wordIdx}
          style={styles.wordGroup}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            wordYPositions.current[wordIdx] = y;
          }}
        >
          {wordChars}
          <View style={styles.charWrapper}>
            {cursorOnSpace && (
              <Animated.View
                style={[
                  styles.cursor,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: cursorOpacity,
                  },
                ]}
              />
            )}
            <Text style={[styles.char, spaceStyle]}> </Text>
          </View>
        </View>
      );
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.container}>
        {testStatus === "idle" && (
          <View style={styles.durationSelector}>
            <SegmentedButtons
              value={testDuration.toString()}
              onValueChange={(val) => setTestDuration(parseInt(val))}
              buttons={[
                { value: "15", label: "15s" },
                { value: "30", label: "30s" },
                { value: "60", label: "60s" },
              ]}
              style={styles.segmentedButtons}
              density="medium"
            />
          </View>
        )}

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Time</Text>
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
              {timeRemaining}s
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>WPM</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{wpm}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Accuracy</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{accuracy}%</Text>
          </View>
        </View>

        <Pressable style={styles.typingArea} onPress={handlePress}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            <View style={styles.wordsContainer}>
              {renderWords()}
            </View>
          </ScrollView>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={userInput}
            onChangeText={handleInputChange}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
          />
        </Pressable>

        {testStatus === "finished" && (
          <View style={styles.overlay}>
            <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.resultsTitle, { color: theme.colors.onSurface }]}>
                Test Complete!
              </Text>
              <View style={styles.resultsRow}>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: theme.colors.primary }]}>{wpm}</Text>
                  <Text style={[styles.resultLabel, { color: theme.colors.onSurfaceVariant }]}>
                    WPM
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
                    {accuracy}%
                  </Text>
                  <Text style={[styles.resultLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Accuracy
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: theme.colors.error }]}>
                    {incorrectCount}
                  </Text>
                  <Text style={[styles.resultLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Errors
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.restartButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleRestart}
              >
                <Text style={[styles.restartButtonText, { color: theme.colors.onPrimary }]}>
                  Try Again
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  durationSelector: {
    paddingHorizontal: 40,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "center",
  },
  segmentedButtons: {
    maxWidth: 300,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  typingArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200, // Extra space to ensure bottom words can be scrolled up
  },
  wordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  wordGroup: {
    flexDirection: "row",
    marginRight: 0,
  },
  charWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  char: {
    fontSize: 22,
    lineHeight: 32,
  },
  cursor: {
    position: "absolute",
    left: 0,
    width: 2,
    height: 24,
    borderRadius: 1,
    zIndex: 1,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  resultsCard: {
    borderRadius: 16,
    padding: 32,
    width: "85%",
    alignItems: "center",
    elevation: 8,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
  },
  resultItem: {
    alignItems: "center",
  },
  resultValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  resultLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  restartButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TypingTest;
