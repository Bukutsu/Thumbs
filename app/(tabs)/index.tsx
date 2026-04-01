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
import { useTheme as usePaperTheme, SegmentedButtons } from "react-native-paper";
import { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WORDS } from "../../utils/words";
import { useAuth } from "../../hooks/useAuth";
import { saveTestResult } from "../../utils/dataManager";
import { useTheme } from "../../contexts/ThemeContext";

type CharacterState = "correct" | "incorrect" | "current" | "untyped";
type TestStatus = "idle" | "running" | "finished";

const TypingTest = () => {
  const paperTheme = usePaperTheme();
  const { fontSizeValue } = useTheme();

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

  // --- Auth ---
  const { user, isAnonymous } = useAuth();

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
      lastDisplayedSecondRef.current = testDuration;
    }
  }, [testDuration, testStatus]);

  // --- Refs ---
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordYPositions = useRef<{ [key: number]: number }>({});
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const isFinishingRef = useRef(false);
  const finishTestRef = useRef<() => void>(() => {});
  const lastDisplayedSecondRef = useRef<number>(testDuration);
  const lastAutoScrollWordRef = useRef<number>(-1);

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
    if (currentWordIdx === lastAutoScrollWordRef.current) return;
    lastAutoScrollWordRef.current = currentWordIdx;
    const targetY = wordYPositions.current[currentWordIdx];

    if (targetY !== undefined && scrollViewRef.current) {
      // Minimal scrolling logic: keep word in view with comfort offset
      scrollViewRef.current.scrollTo({
        y: Math.max(0, targetY - 120),
        animated: false,
      });
    }
  }, [userInput, testStatus, getCurrentWordIndex]);

  // --- Compute character states whenever userInput changes ---
  useEffect(() => {
    const states: CharacterState[] = new Array(targetText.length).fill("untyped");
    let correct = 0;
    let incorrect = 0;

    for (let idx = 0; idx < targetText.length; idx++) {
      if (idx < userInput.length) {
        const isCorrect = userInput[idx] === targetText[idx];
        states[idx] = isCorrect ? "correct" : "incorrect";
        if (isCorrect) correct++;
        else incorrect++;
      } else if (idx === userInput.length) {
        states[idx] = "current";
      }
    }

    if (userInput.length > targetText.length) {
      incorrect += userInput.length - targetText.length;
    }

    setCharacterStates(states);
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
  const finishTest = useCallback(async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;

    let finalWpm = 0;
    let finalAccuracy = 100;

    if (elapsed > 0) {
      finalWpm = Math.round(correctCount / 5 / (elapsed / 60));
      finalAccuracy =
        userInput.length > 0
          ? Math.round((correctCount / userInput.length) * 100)
          : 100;
      setWpm(Math.max(0, finalWpm));
      setAccuracy(Math.max(0, Math.min(100, finalAccuracy)));
    }
    setTestStatus("finished");

    try {
      await saveTestResult(user?.uid ?? null, {
        wpm: finalWpm,
        accuracy: finalAccuracy,
        correctCount,
        incorrectCount,
        testDuration,
        isAnonymous,
      });
    } catch (error) {
      console.error("Failed to save test result:", error);
    }
  }, [correctCount, userInput, user, testDuration, incorrectCount, isAnonymous]);

  useEffect(() => {
    finishTestRef.current = () => {
      void finishTest();
    };
  }, [finishTest]);

  // --- Timer ---
  useEffect(() => {
    if (testStatus !== "running") return;
    if (!endTimeRef.current) return;

    timerRef.current = setInterval(() => {
      const msLeft = endTimeRef.current ? endTimeRef.current - Date.now() : 0;
      const nextRemaining = Math.max(0, Math.ceil(msLeft / 1000));

      if (nextRemaining !== lastDisplayedSecondRef.current) {
        lastDisplayedSecondRef.current = nextRemaining;
        setTimeRemaining(nextRemaining);
      }

      if (nextRemaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        finishTestRef.current();
      }
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [testStatus]);

  // --- Handle input change ---
  const handleInputChange = (text: string) => {
    if (testStatus === "finished") return;

    if (testStatus === "idle" && text.length > 0) {
      const now = Date.now();
      startTimeRef.current = now;
      endTimeRef.current = now + testDuration * 1000;
      lastDisplayedSecondRef.current = testDuration;
      lastAutoScrollWordRef.current = -1;
      setTestStatus("running");
    }

    setUserInput(text);

    if (text.length >= targetText.length) {
      finishTest();
    }
  };

  // --- Restart ---
  const handleRestart = () => {
    isFinishingRef.current = false;
    setUserInput("");
    setCharacterStates([]);
    setTestStatus("idle");
    setTimeRemaining(testDuration);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWpm(0);
    setAccuracy(100);
    startTimeRef.current = null;
    endTimeRef.current = null;
    lastDisplayedSecondRef.current = testDuration;
    lastAutoScrollWordRef.current = -1;
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
    let wrapperStyle: object = {};

    switch (state) {
      case "correct":
        charStyle = { color: paperTheme.colors.primary };
        break;
      case "incorrect":
        charStyle = { color: paperTheme.colors.error, textDecorationLine: "underline" };
        // Add background for spaces to make them visible when incorrect
        if (char === " ") {
          wrapperStyle = { backgroundColor: paperTheme.colors.error + "20" };
        }
        break;
      case "current":
        charStyle = { color: paperTheme.colors.onSurface };
        break;
      case "untyped":
      default:
        charStyle = { color: paperTheme.colors.onSurfaceVariant };
        break;
    }

    const showCursor = idx === userInput.length;

    return (
      <View key={idx} style={[styles.charWrapper, wrapperStyle]}>
        {showCursor && (
          <Animated.View
            style={[
              styles.cursor,
              {
                backgroundColor: paperTheme.colors.primary,
                opacity: cursorOpacity,
              },
            ]}
          />
        )}
        <Text style={[styles.char, charStyle, { fontSize: fontSizeValue, lineHeight: fontSizeValue * 1.45 }]}>{char}</Text>
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
          {renderCharacter(" ", spaceIdx)}
        </View>
      );
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
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
            <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Time</Text>
            <Text style={[styles.statValue, { color: paperTheme.colors.onSurface }]}>
              {timeRemaining}s
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>WPM</Text>
            <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>{wpm}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: paperTheme.colors.onSurfaceVariant }]}>Accuracy</Text>
            <Text style={[styles.statValue, { color: paperTheme.colors.primary }]}>{accuracy}%</Text>
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
            <View style={[styles.resultsCard, { backgroundColor: paperTheme.colors.surface }]}>
              <Text style={[styles.resultsTitle, { color: paperTheme.colors.onSurface }]}>
                Test Complete!
              </Text>
              <View style={styles.resultsRow}>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: paperTheme.colors.primary }]}>{wpm}</Text>
                  <Text style={[styles.resultLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    WPM
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: paperTheme.colors.primary }]}>
                    {accuracy}%
                  </Text>
                  <Text style={[styles.resultLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Accuracy
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultValue, { color: paperTheme.colors.error }]}>
                    {incorrectCount}
                  </Text>
                  <Text style={[styles.resultLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Errors
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.restartButton, { backgroundColor: paperTheme.colors.primary }]}
                onPress={handleRestart}
              >
                <Text style={[styles.restartButtonText, { color: paperTheme.colors.onPrimary }]}>
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
