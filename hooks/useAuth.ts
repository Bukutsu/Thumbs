// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { syncLocalResultsToCloud } from '../utils/dataManager';

export type AuthMode = 'signin' | 'signup';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getIsAnonymous = useCallback(() => {
    return !user;
  }, [user]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setLoading(true);
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          await syncLocalResultsToCloud(credential.user.uid);
        }
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setLoading(true);
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (credential.user) {
          await syncLocalResultsToCloud(credential.user.uid);
        }
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    error,
    isAnonymous: getIsAnonymous(),
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError: () => setError(null),
  };
};
