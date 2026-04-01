import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, SegmentedButtons, useTheme } from 'react-native-paper';
import { getLeaderboard } from '../../../utils/dataManager';
import { LeaderboardEntry, LeaderboardPeriod } from '../../../types';

const periodButtons = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'all', label: 'All Time' },
];

const LeaderboardScreen = () => {
  const theme = useTheme();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const nextEntries = await getLeaderboard(period);
      setEntries(nextEntries);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      void loadLeaderboard();
    }, [loadLeaderboard])
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Leaderboard</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Top 50 by highest WPM</Text>
      </View>

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}
          buttons={periodButtons}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading leaderboard...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content>
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No scores yet for this period.</Text>
              </Card.Content>
            </Card>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <Card
                  key={`${entry.userId}-${entry.timestamp}`}
                  style={[
                    styles.entryCard,
                    {
                      backgroundColor: isTopThree ? theme.colors.primaryContainer : theme.colors.surface,
                    },
                  ]}
                >
                  <Card.Content>
                    <View style={styles.entryRow}>
                      <View style={styles.rankColumn}>
                        <Text style={[styles.rankText, { color: theme.colors.primary }]}>#{rank}</Text>
                      </View>

                      <View style={styles.nameColumn}>
                        <Text style={[styles.nameText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                          {entry.displayName}
                        </Text>
                        <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                          {entry.bestAccuracy}% accuracy · {formatDate(entry.timestamp)}
                        </Text>
                      </View>

                      <View style={styles.scoreColumn}>
                        <Text style={[styles.wpmText, { color: theme.colors.primary }]}>{entry.bestWpm}</Text>
                        <Text style={[styles.wpmLabel, { color: theme.colors.onSurfaceVariant }]}>WPM</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}

          <Button mode="text" onPress={() => void loadLeaderboard()} style={styles.refreshButton}>
            Refresh
          </Button>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  entryCard: {
    borderRadius: 12,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankColumn: {
    width: 48,
    alignItems: 'flex-start',
  },
  rankText: {
    fontSize: 20,
    fontWeight: '700',
  },
  nameColumn: {
    flex: 1,
    paddingRight: 10,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreColumn: {
    alignItems: 'flex-end',
  },
  wpmText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  wpmLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  refreshButton: {
    marginTop: 6,
    alignSelf: 'center',
  },
});

export default LeaderboardScreen;
