import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as backend from '../backend';

const AuthContext = createContext(null);

const friendlyError = (e) => {
  const code = e?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Incorrect email or password.';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('network')) return 'Network error. Check your connection.';
  return e?.message || 'Something went wrong.';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => backend.onAuth((u) => {
    setUser((prev) => (prev?.uid === u?.uid ? prev : u));
    if (!u) {
      setProfile(null);
      setLoading(false);
    }
  }), []);

  // Live profile so dealer approval / role changes apply instantly.
  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    return backend.watchDoc(
      'users',
      user.uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user]);

  const value = useMemo(() => {
    const role = profile?.role;
    return {
      user,
      profile,
      loading,
      role,
      isDemo: backend.isDemo,
      isDealer: role === 'dealer' && profile?.dealerStatus === 'approved',
      dealerStatus: profile?.dealerStatus,

      async signIn(email, password, expectedRole) {
        try {
          const uid = await backend.signIn(email.trim(), password);
          const actual = (await backend.getOnce('users', uid))?.role;
          if (actual !== expectedRole) {
            await backend.signOut();
            const where = actual === 'admin' ? 'the web admin panel' : `the ${actual || 'customer'} login`;
            throw new Error(`This account is registered as ${actual || 'unknown'}. Please use ${where}.`);
          }
        } catch (e) {
          throw new Error(friendlyError(e));
        }
      },

      async signUp({ role, name, email, password, phone, businessName, gstin, city }) {
        try {
          const uid = await backend.signUp(email.trim(), password, name);
          const data = {
            role,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            address: city ? { city: city.trim() } : null,
            createdAt: 'now',
          };
          if (role === 'dealer') {
            Object.assign(data, {
              dealerStatus: 'pending',
              businessName: businessName.trim(),
              gstin: (gstin || '').trim().toUpperCase(),
            });
          }
          await backend.setData('users', uid, data);
        } catch (e) {
          throw new Error(friendlyError(e));
        }
      },

      resetPassword: (email) => backend.resetPassword(email.trim()).catch((e) => {
        throw new Error(friendlyError(e));
      }),

      updateProfile: (patch) => backend.update('users', user.uid, { ...patch, updatedAt: 'now' }),

      signOut: () => backend.signOut(),
    };
  }, [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
