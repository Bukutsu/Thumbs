import { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  useTheme,
  Card,
  Avatar,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
// useFocusEffect is a specialized hook for mobile navigation.
// It runs every time this specific tab/screen comes into the user's view.
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Helper component: StatBox
 * Displays a single metric (like WPM) with a label and a bold colored value.
 */
const StatBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <View style={styles.statBox}>
    <Text variant="headlineMedium" style={{ color: color, fontWeight: "bold" }}>
      {value}
    </Text>
    <Text variant="bodyMedium" style={{ color: "#757575", marginTop: 4 }}>
      {label}
    </Text>
  </View>
);

export default function ProfileScreen() {
  // Grab the current user session
  const { user } = useAuth();
  // Grab the Material You theme
  const theme = useTheme();

  // STATE: loading tracks if we are currently talking to the database
  const [loading, setLoading] = useState(true);

  // STATE: stats holds the aggregated math for the user's typing history
  const [stats, setStats] = useState({
    testsCompleted: 0,
    highestWpm: 0,
    averageWpm: 0,
    averageAccuracy: 0,
  });

  /**
   * HOOK: useFocusEffect
   * Why not useEffect?
   * In tab navigation, screens stay "alive" in the background. useEffect only runs once.
   * useFocusEffect runs every time you click the "Profile" tab, ensuring scores
   * from the most recent test are included.
   */
  useFocusEffect(
    // We wrap our logic in useCallback to prevent unnecessary re-runs
    useCallback(() => {
      const fetchUserStats = async () => {
        if (!user) return;

        try {
          // 1. Query Firestore for every document in "scores" that belongs to this user's UID
          const q = query(
            collection(db, "scores"),
            where("uid", "==", user.uid),
          );
          const querySnapshot = await getDocs(q);

          let highestWpm = 0;
          let totalWpm = 0;
          let totalAccuracy = 0;
          const testsCompleted = querySnapshot.size;

          // 2. Loop through every score document found
          querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Track the single highest WPM seen
            if (data.wpm > highestWpm) highestWpm = data.wpm;

            // Add to totals for average calculation
            totalWpm += data.wpm;
            totalAccuracy += data.accuracy;
          });

          // 3. Perform the math and update the UI state
          setStats({
            testsCompleted,
            highestWpm,
            averageWpm:
              testsCompleted > 0 ? Math.round(totalWpm / testsCompleted) : 0,
            averageAccuracy:
              testsCompleted > 0
                ? Math.round(totalAccuracy / testsCompleted)
                : 0,
          });
        } catch (error) {
          console.error("Error fetching stats:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserStats();

      // No cleanup needed for this specific effect
      return () => {};
    }, [user]), // Re-run if the user object changes
  );

  // Loading State UI: Show a spinner while the database query is running
  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* HEADER SECTION: User identity information */}
      <View style={styles.header}>
        <Avatar.Icon
          size={80}
          icon="account"
          style={{ backgroundColor: theme.colors.primaryContainer }}
        />
        <View style={styles.headerText}>
          <Text
            variant="headlineMedium"
            style={{ color: theme.colors.onSurface, fontWeight: "bold" }}
          >
            Anonymous User
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            ID: {user?.uid.substring(0, 8)}...
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* STATISTICS GRID: A 2x2 layout of Material Cards */}
      <Text
        variant="titleLarge"
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
      >
        Statistics
      </Text>

      <View style={styles.grid}>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <StatBox
              label="Tests Completed"
              value={stats.testsCompleted}
              color={theme.colors.primary}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="contained">
          <Card.Content>
            <StatBox
              label="Highest WPM"
              value={stats.highestWpm}
              color={theme.colors.tertiary}
            />
          </Card.Content>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <StatBox
              label="Average WPM"
              value={stats.averageWpm}
              color={theme.colors.secondary}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="contained">
          <Card.Content>
            <StatBox
              label="Avg Accuracy"
              value={`${stats.averageAccuracy}%`}
              color={theme.colors.error}
            />
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  headerText: {
    marginLeft: 20,
  },
  divider: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
});
