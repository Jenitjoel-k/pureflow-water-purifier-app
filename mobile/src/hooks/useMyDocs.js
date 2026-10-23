import { useEffect, useState } from 'react';
import { watchMine } from '../backend';
import { useAuth } from '../context/AuthContext';

export const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

export const fmtDate = (ts, withTime = true) => {
  const d = toDate(ts);
  if (!d) return 'Just now';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

// Live list of the signed-in user's docs in a collection, newest first.
// Sorting happens client-side so no composite Firestore index is needed.
export function useMyDocs(name) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return undefined;
    return watchMine(
      name,
      user.uid,
      (list) => {
        list.sort((a, b) => (toDate(b.createdAt)?.getTime() || Date.now()) - (toDate(a.createdAt)?.getTime() || Date.now()));
        setDocs(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [user, name]);

  return { docs, loading };
}
