import { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  useTheme,
  Card,
  Avatar,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { useAuth } from "../../../hooks/useAuth";
import { db } from "../../../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Helper component for displaying a stat box
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
  const { user } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    testsCompleted: 0,
    highestWpm: 0,
    averageWpm: 0,
    averageAccuracy: 0,
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;

      try {
        // 1. Query the database for ONLY this user's scores
        const q = query(collection(db, "scores"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);

        let highestWpm = 0;
        let totalWpm = 0;
        let totalAccuracy = 0;
        const testsCompleted = querySnapshot.size;

        // 2. Loop through all their scores to calculate aggregates
        querySnapshot.forEach((doc) => {
          const data = doc.data();

          if (data.wpm > highestWpm) highestWpm = data.wpm;
          totalWpm += data.wpm;
          totalAccuracy += data.accuracy;
        });

        // 3. Update the local state with the math
        setStats({
          testsCompleted,
          highestWpm,
          averageWpm:
            testsCompleted > 0 ? Math.round(totalWpm / testsCompleted) : 0,
          averageAccuracy:
            testsCompleted > 0 ? Math.round(totalAccuracy / testsCompleted) : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user]);

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
      {/* 4. Top Profile Section */}
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

      {/* 5. Statistics Grid */}
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
