// utils/dataManager.ts
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  setDoc,
  query, 
  QueryConstraint,
  where, 
  getDocs 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LeaderboardEntry, LeaderboardPeriod, TestResult, UserProfile, UserStats, TestDurationFilter, ProgressDataPoint } from '../types';

const STORAGE_KEY = '@thumbs_test_results';
const USER_PROFILE_STORAGE_KEY = '@thumbs_user_profiles';
const LEADERBOARD_LIMIT = 50;
const LOCAL_GUEST_USER_ID = '__local_guest__';

const getEmptyStats = (): UserStats => ({
  testsCompleted: 0,
  highestWpm: 0,
  averageWpm: 0,
  averageAccuracy: 100,
  recentTests: [],
});

const calculateStats = (results: TestResult[]): UserStats => {
  const ordered = [...results].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const testsCompleted = ordered.length;

  if (testsCompleted === 0) {
    return getEmptyStats();
  }

  const highestWpm = Math.max(...ordered.map((t) => t.wpm));
  const averageWpm = Math.round(ordered.reduce((sum, t) => sum + t.wpm, 0) / testsCompleted);
  const averageAccuracy = Math.round(
    ordered.reduce((sum, t) => sum + t.accuracy, 0) / testsCompleted
  );

  return {
    testsCompleted,
    highestWpm,
    averageWpm,
    averageAccuracy,
    recentTests: ordered.slice(0, 10),
  };
};

const readLocalResults = async (): Promise<TestResult[]> => {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  return existing ? (JSON.parse(existing) as TestResult[]) : [];
};

const writeLocalResults = async (results: TestResult[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(results));
};

const getPeriodStartTimestamp = (period: LeaderboardPeriod): number | null => {
  const now = new Date();

  if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.getTime();
  }

  if (period === 'week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek.getTime();
  }

  return null;
};

const readLocalProfiles = async (): Promise<Record<string, UserProfile>> => {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UserProfile>;
  } catch (error) {
    console.error('Failed to read local profiles:', error);
    return {};
  }
};

const saveLocalProfile = async (profile: UserProfile): Promise<void> => {
  const profiles = await readLocalProfiles();
  profiles[profile.userId] = profile;
  await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
};

const getDisplayNameForUser = async (userId: string): Promise<string> => {
  try {
    const profile = await getUserProfile(userId);
    const name = profile.displayName.trim();
    return name.length > 0 ? name : 'Anonymous User';
  } catch {
    return 'Anonymous User';
  }
};

/**
 * Save a test result to Firestore (with local fallback)
 */
export const saveTestResult = async (
  userId: string | null,
  result: Omit<TestResult, 'id' | 'userId' | 'timestamp'>
): Promise<void> => {
  const resolvedUserId = userId || LOCAL_GUEST_USER_ID;
  const testResult: Omit<TestResult, 'id'> = {
    ...result,
    userId: resolvedUserId,
    timestamp: Date.now(),
  };

  if (!userId) {
    const existing = await readLocalResults();
    existing.push({ ...testResult, id: Date.now().toString() });
    await writeLocalResults(existing);
    return;
  }

  try {
    // Save to Firestore
    await addDoc(collection(db, 'testResults'), testResult);

    // Touch profile activity
    const existingProfile = await getUserProfile(userId, Boolean(result.isAnonymous));
    const updatedProfile: UserProfile = {
      ...existingProfile,
      lastActive: testResult.timestamp,
      isAnonymous: Boolean(result.isAnonymous),
    };
    await setDoc(doc(db, 'users', userId), updatedProfile);
    await saveLocalProfile(updatedProfile);
  } catch (error) {
    console.error('Failed to save to Firestore, saving locally:', error);
    
    // Fallback: Save to AsyncStorage
    try {
      const results = await readLocalResults();
      results.push({ ...testResult, id: Date.now().toString() });
      await writeLocalResults(results);
    } catch (localError) {
      console.error('Failed to save locally:', localError);
      throw localError;
    }
  }
};

/**
 * Fetch user stats from Firestore
 */
export const getUserStats = async (userId: string): Promise<UserStats> => {
  try {
    // Query all test results for this user
    const q = query(
      collection(db, 'testResults'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const allTests: TestResult[] = [];

    querySnapshot.forEach((doc) => {
      allTests.push({ id: doc.id, ...doc.data() } as TestResult);
    });

    return calculateStats(allTests);
  } catch (error) {
    console.error('Failed to fetch stats from Firestore, trying local:', error);
    
    // Fallback: Try AsyncStorage
    try {
      const results = await readLocalResults();
      const userResults = results.filter(r => r.userId === userId);
      return calculateStats(userResults);
    } catch (localError) {
      console.error('Failed to fetch local stats:', localError);
      return getEmptyStats();
    }
  }
};

export const getGuestStats = async (): Promise<UserStats> => {
  try {
    const results = await readLocalResults();
    const guestResults = results.filter((result) => result.userId === LOCAL_GUEST_USER_ID);
    return calculateStats(guestResults);
  } catch (error) {
    console.error('Failed to fetch guest local stats:', error);
    return getEmptyStats();
  }
};

export const syncLocalResultsToCloud = async (userId: string): Promise<void> => {
  const localResults = await readLocalResults();
  const guestResults = localResults.filter((result) => result.userId === LOCAL_GUEST_USER_ID);

  if (guestResults.length === 0) {
    return;
  }

  for (const localResult of guestResults) {
    const { id, ...payload } = localResult;
    await addDoc(collection(db, 'testResults'), {
      ...payload,
      userId,
      isAnonymous: false,
      timestamp: payload.timestamp || Date.now(),
    });
  }

  const remaining = localResults.filter((result) => result.userId !== LOCAL_GUEST_USER_ID);
  await writeLocalResults(remaining);

  const profile = await getUserProfile(userId, false);
  await setDoc(doc(db, 'users', userId), {
    ...profile,
    isAnonymous: false,
    lastActive: Date.now(),
  });
};

export const getUserProfile = async (userId: string, isAnonymous?: boolean): Promise<UserProfile> => {
  const now = Date.now();
  const defaultProfile: UserProfile = {
    userId,
    displayName: 'Anonymous User',
    createdAt: now,
    lastActive: now,
    isAnonymous: isAnonymous ?? true,
  };

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;

      if (typeof isAnonymous === 'boolean' && profile.isAnonymous !== isAnonymous) {
        const syncedProfile: UserProfile = {
          ...profile,
          isAnonymous,
        };
        await setDoc(userRef, syncedProfile);
        await saveLocalProfile(syncedProfile);
        return syncedProfile;
      }

      await saveLocalProfile(profile);
      return profile;
    }

    await setDoc(userRef, defaultProfile);
    await saveLocalProfile(defaultProfile);
    return defaultProfile;
  } catch (error) {
    console.error('Failed to fetch profile from Firestore, trying local:', error);
    const localProfiles = await readLocalProfiles();
    return localProfiles[userId] || defaultProfile;
  }
};

export const updateUserDisplayName = async (
  userId: string,
  displayName: string,
  isAnonymous?: boolean
): Promise<void> => {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    throw new Error('Display name cannot be empty.');
  }

  const currentProfile = await getUserProfile(userId, isAnonymous);
  const updatedProfile: UserProfile = {
    ...currentProfile,
    displayName: trimmedName,
    lastActive: Date.now(),
  };

  try {
    await setDoc(doc(db, 'users', userId), updatedProfile);
    await saveLocalProfile(updatedProfile);
  } catch (error) {
    console.error('Failed to update display name in Firestore, saving locally:', error);
    await saveLocalProfile(updatedProfile);
  }
};

export const getLeaderboard = async (
  period: LeaderboardPeriod,
  duration: TestDurationFilter = 'all'
): Promise<LeaderboardEntry[]> => {
  const startTimestamp = getPeriodStartTimestamp(period);

  try {
    const constraints: QueryConstraint[] = [];
    if (startTimestamp !== null) {
      constraints.push(where('timestamp', '>=', startTimestamp));
    }

    if (duration !== 'all') {
      constraints.push(where('testDuration', '==', duration));
    }

    const leaderboardQuery = query(collection(db, 'testResults'), ...constraints);
    const querySnapshot = await getDocs(leaderboardQuery);

    const bestByUser = new Map<string, Omit<LeaderboardEntry, 'displayName'>>();
    const nonAnonymousUsers = new Set<string>();

    const profilesSnapshot = await getDocs(collection(db, 'users'));
    profilesSnapshot.forEach((snapshotDoc) => {
      const profile = snapshotDoc.data() as UserProfile;
      if (profile.isAnonymous === false) {
        nonAnonymousUsers.add(profile.userId);
      }
    });

    querySnapshot.forEach((snapshotDoc) => {
      const result = snapshotDoc.data() as TestResult;

      if (!result.userId || typeof result.wpm !== 'number') {
        return;
      }

      const isExplicitlyNonAnonymous = result.isAnonymous === false;
      const isKnownNonAnonymousUser = nonAnonymousUsers.has(result.userId);

      if (!isExplicitlyNonAnonymous && !isKnownNonAnonymousUser) {
        return;
      }

      const existing = bestByUser.get(result.userId);
      const candidate = {
        userId: result.userId,
        bestWpm: result.wpm,
        bestAccuracy: typeof result.accuracy === 'number' ? result.accuracy : 0,
        timestamp: result.timestamp || 0,
      };

      if (!existing) {
        bestByUser.set(result.userId, candidate);
        return;
      }

      const isBetterWpm = candidate.bestWpm > existing.bestWpm;
      const isSameWpmBetterAccuracy =
        candidate.bestWpm === existing.bestWpm && candidate.bestAccuracy > existing.bestAccuracy;
      const isSameStatsEarlier =
        candidate.bestWpm === existing.bestWpm &&
        candidate.bestAccuracy === existing.bestAccuracy &&
        candidate.timestamp < existing.timestamp;

      if (isBetterWpm || isSameWpmBetterAccuracy || isSameStatsEarlier) {
        bestByUser.set(result.userId, candidate);
      }
    });

    const entriesWithoutNames = Array.from(bestByUser.values());
    const names = await Promise.all(
      entriesWithoutNames.map((entry) => getDisplayNameForUser(entry.userId))
    );

    const entries: LeaderboardEntry[] = entriesWithoutNames.map((entry, index) => ({
      ...entry,
      displayName: names[index],
    }));

    entries.sort((a, b) => {
      if (b.bestWpm !== a.bestWpm) return b.bestWpm - a.bestWpm;
      if (b.bestAccuracy !== a.bestAccuracy) return b.bestAccuracy - a.bestAccuracy;
      return a.timestamp - b.timestamp;
    });

    return entries.slice(0, LEADERBOARD_LIMIT);
  } catch (error) {
    console.error('Failed to fetch leaderboard from Firestore:', error);
    return [];
  }
};

export const getProgressData = async (
  userId: string,
  days: number = 14
): Promise<ProgressDataPoint[]> => {
  const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

  try {
    const q = query(
      collection(db, 'testResults'),
      where('userId', '==', userId),
      where('timestamp', '>=', startDate)
    );

    const snapshot = await getDocs(q);
    const results: TestResult[] = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as TestResult);
    });

    // Group by day and calculate average WPM
    const byDay = new Map<string, number[]>();
    results.forEach((r) => {
      const date = new Date(r.timestamp);
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r.wpm);
    });

    const data: ProgressDataPoint[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const wpms = byDay.get(key) || [];
      const avgWpm = wpms.length > 0 ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : 0;
      data.push({ date: key, wpm: avgWpm });
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch progress data:', error);
    return [];
  }
};
