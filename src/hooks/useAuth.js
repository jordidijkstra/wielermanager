import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { auth } from '../firebase/config';
import { db } from '../firebase/config';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        // Uitgelogd
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      // 🔹 User bestaat nog niet in Firestore → aanmaken
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: firebaseUser.email,
          role: 'user',
          createdAt: serverTimestamp()
        });
        setRole('user');
      } else {
        setRole(snap.data().role ?? 'user');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isLoggedIn: !!user,
    loading
  };
};