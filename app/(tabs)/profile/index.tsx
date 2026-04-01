import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, Card, Avatar, Chip, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { getGuestStats, getUserProfile, getUserStats, updateUserDisplayName, getProgressData } from '../../../utils/dataManager';
import { UserProfile, UserStats, ProgressDataPoint } from '../../../types';
import { LineChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const ProfileScreen = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: authLoading, isAnonymous, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'local'>('cloud');
  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        const guestStats = await getGuestStats();
        setStats(guestStats);
        setProfile(null);
        setDisplayNameInput('Anonymous User');
        setSyncStatus('local');
      } else {
        const [userStats, userProfile, userProgress] = await Promise.all([
          getUserStats(user.uid),
          getUserProfile(user.uid, isAnonymous),
          getProgressData(user.uid, 7),
        ]);

        setStats(userStats);
        setProfile(userProfile);
        setProgressData(userProgress);
        setDisplayNameInput(userProfile.displayName);
        setSyncStatus('cloud');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      setSyncStatus('local');
    } finally {
      setLoading(false);
    }
  }, [user, isAnonymous]);

  // Fetch stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state
  if (authLoading || (loading && !stats)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = isAnonymous 
    ? profile?.displayName || 'Anonymous User'
    : profile?.displayName || user?.email?.split('@')[0] || 'User';

  const handleSaveDisplayName = async () => {
    if (!user) return;

    const trimmedName = displayNameInput.trim();

    if (!trimmedName) {
      setNameError('Display name cannot be empty.');
      return;
    }

    setSavingName(true);
    setNameError(null);

    try {
      await updateUserDisplayName(user.uid, trimmedName, isAnonymous);
      const updatedProfile = await getUserProfile(user.uid, isAnonymous);
      setProfile(updatedProfile);
      setDisplayNameInput(updatedProfile.displayName);
      setEditingName(false);
    } catch (error: any) {
      setNameError(error?.message || 'Failed to update display name.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar.Icon 
            size={80} 
            icon={isAnonymous ? "account" : "account-check"} 
            style={{ backgroundColor: theme.colors.primaryContainer }}
          />
          <Text style={[styles.userName, { color: theme.colors.onSurface }]}> 
            {displayName}
          </Text>
          <Button
            mode="text"
            icon="pencil"
            disabled={!user}
            onPress={() => {
              setNameError(null);
              setDisplayNameInput(displayName);
              setEditingName(true);
            }}
            style={styles.editNameButton}
          >
            Edit display name
          </Button>
          <Chip 
            icon={syncStatus === 'cloud' ? 'cloud-check' : 'database'}
            mode="outlined"
            style={styles.syncChip}
          >
            {user ? (syncStatus === 'cloud' ? 'Synced to cloud' : 'Stored locally') : 'Stored locally until sign in'}
          </Chip>
        </View>

        {/* Auth Button */}
        <View style={styles.authButtonContainer}>
          {isAnonymous ? (
            <Button
              mode="contained"
              icon="login"
              onPress={() => router.push('/login')}
              style={styles.authButton}
            >
              Sign In
            </Button>
          ) : (
            <Button
              mode="outlined"
              icon="logout"
              onPress={signOut}
              style={styles.authButton}
            >
              Sign Out
            </Button>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats?.testsCompleted || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Tests
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats?.highestWpm || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Best WPM
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats?.averageWpm || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Avg WPM
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {stats?.averageAccuracy || 100}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Avg Accuracy
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Progress Chart */}
        {user && progressData.some(d => d.wpm > 0) && (
          <View style={styles.chartSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              WPM Progress (Last 7 Days)
            </Text>
            <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <LineChart
                  data={progressData.map(d => ({ value: d.wpm, label: d.date }))}
                  height={120}
                  width={screenWidth - 80}
                  initialSpacing={20}
                  color={theme.colors.primary}
                  thickness={3}
                  dataPointsColor={theme.colors.primary}
                  hideRules
                  hideYAxisText
                  yAxisThickness={0}
                  xAxisThickness={0}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                  curved
                  animateOnDataChange
                  isAnimated
                />
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Recent Tests */}
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Recent Tests
          </Text>
          
          {stats && stats.recentTests.length > 0 ? (
            stats.recentTests.map((test) => (
              <Card 
                key={test.id || test.timestamp.toString()} 
                style={[
                  styles.testCard, 
                  { backgroundColor: theme.colors.surface }
                ]}
              >
                <Card.Content>
                  <View style={styles.testRow}>
                    <View style={styles.testInfo}>
                      <Text style={[styles.testWpm, { color: theme.colors.primary }]}>
                        {test.wpm} WPM
                      </Text>
                      <Text style={[styles.testDate, { color: theme.colors.onSurfaceVariant }]}>
                        {formatDate(test.timestamp)}
                      </Text>
                    </View>
                    <View style={styles.testStats}>
                      <Text style={[styles.testStat, { color: theme.colors.onSurface }]}>
                        {test.accuracy}% acc
                      </Text>
                      <Text style={[styles.testStat, { color: theme.colors.onSurfaceVariant }]}>
                        {test.testDuration}s
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No tests yet. Complete your first typing test!
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={editingName} onDismiss={() => setEditingName(false)}>
          <Dialog.Title>Set Display Name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Display Name"
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              maxLength={24}
              error={Boolean(nameError)}
            />
            {nameError ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{nameError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditingName(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveDisplayName} loading={savingName}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
  },
  syncChip: {
    marginTop: 8,
  },
  editNameButton: {
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  statCard: {
    width: '45%',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartCard: {
    borderRadius: 16,
    paddingVertical: 10,
  },
  testCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testInfo: {
    flex: 1,
  },
  testWpm: {
    fontSize: 20,
    fontWeight: '700',
  },
  testDate: {
    fontSize: 12,
    marginTop: 2,
  },
  testStats: {
    alignItems: 'flex-end',
  },
  testStat: {
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 12,
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  authButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  authButton: {
    borderRadius: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
  },
});

export default ProfileScreen;
