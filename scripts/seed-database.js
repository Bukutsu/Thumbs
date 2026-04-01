// scripts/seed-database.js
// Usage: node scripts/seed-database.js
// Requires: service-account-key.json in project root

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('../private-keys/thumbs-d3651-firebase-adminsdk-fbsvc-aa0171eae7.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const MOCK_USER_COUNT = 50;
const RESULTS_PER_USER = 5;

const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Sage', 'River', 'Phoenix', 'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie', 'Kendall', 'Lane', 'Logan', 'Mackenzie', 'Parker', 'Peyton', 'Reese', 'Rowan', 'Skyler', 'Spencer', 'Sydney'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function generateDisplayName() {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

function generateWpm() {
  const base = randomInt(40, 90);
  const variance = randomInt(-10, 20);
  return Math.max(20, Math.min(120, base + variance));
}

function generateAccuracy() {
  return randomInt(85, 100);
}

function generateTimestamp(daysAgo) {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const randomOffset = randomInt(0, msPerDay * daysAgo);
  return now - randomOffset;
}

async function createMockUsers() {
  console.log(`Creating ${MOCK_USER_COUNT} mock users...`);
  
  const users = [];
  
  for (let i = 1; i <= MOCK_USER_COUNT; i++) {
    const userId = `mock_user_${i.toString().padStart(3, '0')}`;
    const displayName = generateDisplayName();
    const createdAt = generateTimestamp(30);
    const lastActive = generateTimestamp(7);
    
    const userProfile = {
      userId,
      displayName,
      createdAt,
      lastActive,
      isAnonymous: false,
    };
    
    await db.collection('users').doc(userId).set(userProfile);
    users.push({ userId, displayName });
    
    console.log(`  Created user ${i}/${MOCK_USER_COUNT}: ${displayName}`);
  }
  
  return users;
}

async function createMockResults(users) {
  console.log(`\nCreating test results for ${users.length} users...`);
  
  let totalResults = 0;
  
  for (let i = 0; i < users.length; i++) {
    const { userId, displayName } = users[i];
    const resultCount = randomInt(3, RESULTS_PER_USER);
    
    for (let j = 0; j < resultCount; j++) {
      const wpm = generateWpm();
      const accuracy = generateAccuracy();
      const correctCount = randomInt(200, 400);
      const incorrectCount = Math.round(correctCount * (100 - accuracy) / accuracy);
      const testDuration = randomElement([15, 30, 60]);
      const timestamp = generateTimestamp(14);
      
      const testResult = {
        userId,
        wpm,
        accuracy,
        correctCount,
        incorrectCount,
        testDuration,
        timestamp,
        isAnonymous: false,
      };
      
      await db.collection('testResults').add(testResult);
      totalResults++;
    }
    
    console.log(`  User ${i + 1}/${users.length} (${displayName}): ${resultCount} results`);
  }
  
  console.log(`\nTotal results created: ${totalResults}`);
}

async function main() {
  try {
    console.log('=== Seed Database Script ===\n');
    
    const users = await createMockUsers();
    await createMockResults(users);
    
    console.log('\n=== Seeding Complete ===');
    console.log(`Created ${users.length} users with test results.`);
    console.log('You can now view the leaderboard at http://localhost:8080 (or your deployed URL)');
    
    process.exit(0);
  } catch (error) {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  }
}

main();
