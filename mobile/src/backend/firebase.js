import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export const onAuth = (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function signUp(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user.uid;
}

export const signOut = () => fbSignOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const getIdToken = () => auth.currentUser?.getIdToken();

export const watchDoc = (col, id, cb, onError) =>
  onSnapshot(doc(db, col, id), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), onError);

export const watchMine = (col, uid, cb, onError) =>
  onSnapshot(query(collection(db, col), where('userId', '==', uid)), (s) => cb(rows(s)), onError);

export const watchAll = (col, cb, onError) => onSnapshot(collection(db, col), (s) => cb(rows(s)), onError);

export async function getOnce(col, id) {
  const s = await getDoc(doc(db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

const stamp = (data) => {
  const out = { ...data };
  for (const k of ['createdAt', 'updatedAt']) if (out[k] === 'now') out[k] = serverTimestamp();
  return out;
};

export const setData = (col, id, data) => setDoc(doc(db, col, id), stamp(data));

export async function add(col, data) {
  const ref = await addDoc(collection(db, col), stamp(data));
  return ref.id;
}

export const update = (col, id, patch) => updateDoc(doc(db, col, id), stamp(patch));

export async function updateMany(col, ids, patch) {
  const b = writeBatch(db);
  ids.forEach((id) => b.update(doc(db, col, id), stamp(patch)));
  await b.commit();
}
