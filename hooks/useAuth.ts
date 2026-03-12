import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for changes in authentication state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is already signed in (even anonymously)
        setUser(currentUser);
        setLoading(false);
      } else {
        // 2. No user found? Sign them in anonymously in the background!
        try {
          await signInAnonymously(auth);
          // We don't need to manually setUser here, because onAuthStateChanged
          // will fire again once signInAnonymously finishes!
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          setLoading(false);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
