import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true });

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState({ user: null, profile: null, loading: false });
    const snap = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
    const profile = snap?.exists() ? snap.data() : null;
    if (profile?.role !== 'admin') {
      await signOut(auth);
      return setState({ user: null, profile: null, loading: false, error: 'This account does not have admin access.' });
    }
    setState({ user, profile, loading: false });
  }), []);

  const login = async (email, password) => {
    setState((s) => ({ ...s, error: null }));
    await signInWithEmailAndPassword(auth, email, password);
  };

  return <Ctx.Provider value={{ ...state, login, logout: () => signOut(auth) }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
