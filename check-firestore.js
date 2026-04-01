// check-firestore.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkData() {
  const snapshot = await db.collection('testResults').limit(10).get();
  
  if (snapshot.empty) {
    console.log('No test results found');
    return;
  }

  console.log('Found', snapshot.size, 'test results:');
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('---');
    console.log('ID:', doc.id);
    console.log('UserID:', data.userId);
    console.log('WPM:', data.wpm);
    console.log('Accuracy:', data.accuracy);
    console.log('Timestamp:', new Date(data.timestamp).toISOString());
  });
}

checkData().catch(console.error);
