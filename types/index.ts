// types/index.ts
export interface TestResult {
  id: string;                    // Unique ID for the test
  wpm: number;                   // Words per minute
  accuracy: number;              // Percentage (0-100)
  correctCount: number;          // Number of correct characters
  incorrectCount: number;        // Number of incorrect characters
  testDuration: number;          // Test duration in seconds (15, 30, 60)
  timestamp: number;             // Unix timestamp
  userId: string;                // Firebase user ID
  isAnonymous?: boolean;
}

export interface UserStats {
  testsCompleted: number;        // Total tests completed
  highestWpm: number;            // Best WPM score
  averageWpm: number;            // Average WPM across all tests
  averageAccuracy: number;       // Average accuracy across all tests
  recentTests: TestResult[];     // Last 10 tests
}

export interface UserProfile {
  userId: string;
  displayName: string;
  createdAt: number;             // Account creation timestamp
  lastActive: number;            // Last test timestamp
  isAnonymous?: boolean;
}

export type LeaderboardPeriod = 'today' | 'week' | 'all';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  bestWpm: number;
  bestAccuracy: number;
  timestamp: number;
}

export type TestDurationFilter = 15 | 30 | 60 | 'all';

export interface ProgressDataPoint {
  date: string;
  wpm: number;
}
