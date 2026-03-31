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
} from "react-native";
import { useTheme } from "react-native-paper";
import { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WORDS } from "../../utils/words";

type CharacterState = "correct" | "incorrect" | "current" | "untyped";
type TestStatus = "idle" | "running" | "finished";

const TIMER_DURATION = 60;

const TypingTest = () => {
  const theme = useTheme();

  const generateWords = useCallback((): string[] => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
    const selected: string[] = [];
    let i = 0;
    while (selected.join(" ").length < 250 && i < shuffled.length) {
      selected.push(shuffled[i % shuffled.length]);
      i++;
    }
    return selected;
  }, []);

  // --- State ---
  const [targetWords, setTargetWords] = useState<string[]>(() => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
    const selected: string[] = [];
    let i = 0;
    while (selected.join(" ").length < 250 && i < shuffled.length) {
      selected.push(shuffled[i % shuffled.length]);
      i++;
    }
    return selected;
  });
  const targetText = targetWords.join(" ");
  const [userInput, setUserInput] = useState("");
  const [characterStates, setCharacterStates] = useState<CharacterState[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

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
    setTimeRemaining(TIMER_DURATION);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWpm(0);
    setAccuracy(100);
    startTimeRef.current = null;
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
        charStyle = {
          color: theme.colors.onSurface,
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: 2,
        };
        break;
      case "untyped":
      default:
        charStyle = { color: theme.colors.onSurfaceVariant };
        break;
    }

    return (
      <Text key={idx} style={[styles.char, charStyle]}>
        {char}
      </Text>
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
      let spaceStyle: object = { color: theme.colors.onSurfaceVariant };
      if (spaceState === "correct") spaceStyle = { color: theme.colors.primary };
      else if (spaceState === "incorrect") spaceStyle = { color: theme.colors.error, backgroundColor: theme.colors.error + "20" };
      else if (spaceState === "current") spaceStyle = { backgroundColor: theme.colors.primaryContainer };
      charOffset = spaceIdx + 1;
      return (
        <View key={wordIdx} style={styles.wordGroup}>
          {wordChars}
          <Text style={[styles.char, spaceStyle]}> </Text>
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
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
  },
  wordsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
  },
  wordGroup: {
    flexDirection: "row",
    marginRight: 2,
  },
  char: {
    fontSize: 22,
    lineHeight: 32,
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
