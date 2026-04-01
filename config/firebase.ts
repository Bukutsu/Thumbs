// config/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2uRf3V0mX44K-r-WA7DAvCahH7y4pQDc",

  authDomain: "thumbs-d3651.firebaseapp.com",

  projectId: "thumbs-d3651",

  storageBucket: "thumbs-d3651.firebasestorage.app",

  messagingSenderId: "944054974096",

  appId: "1:944054974096:web:0fe026cda30977b3238a15",

  measurementId: "G-F6Y8PXLRJ1",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);
