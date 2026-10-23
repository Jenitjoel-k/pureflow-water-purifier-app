// Exercises firestore.rules against the local emulator with real client
// sign-ins. Run after `firebase emulators:start` and `npm run seed`
// (with FIRESTORE_EMULATOR_HOST set):  node scripts/test-rules.mjs
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where,
} from 'firebase/firestore';

let pass = 0;
let fail = 0;
const results = [];

async function client(email, password, create) {
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-pureflow' }, email || `anon-${Math.random()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  let uid = null;
  if (email) {
    const cred = create ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
  }
  return { app, db, uid };
}

async function expect(name, allowed, fn) {
  let ok;
  try {
    await fn();
    ok = allowed;
    if (!allowed) results.push("    (succeeded unexpectedly)");
  } catch (e) {
    ok = !allowed && (e.code === 'permission-denied' || /permission/i.test(e.message));
    if (!ok) results.push(`    ${e.message}`);
  }
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${allowed ? 'allow' : 'deny '}  ${name}`);
  ok ? pass++ : fail++;
}

const order = (uid, channel) => ({
  orderNo: 'PFTEST', userId: uid, channel, status: 'placed', items: [], total: 100, statusHistory: [],
});

const stamp = Date.now();
const anon = await client();
await expect('anonymous reads products', true, () => getDocs(collection(anon.db, 'products')));
await expect('anonymous writes products', false, () => setDoc(doc(anon.db, 'products/x'), { name: 'x' }));

const c = await client(`c${stamp}@t.dev`, 'secret123', true);
await expect('customer self-registers as admin', false, () => setDoc(doc(c.db, `users/${c.uid}`), { role: 'admin', name: 'x' }));
await expect('customer self-registers as approved dealer', false, () => setDoc(doc(c.db, `users/${c.uid}`), { role: 'dealer', dealerStatus: 'approved' }));
await expect('customer registers as customer', true, () => setDoc(doc(c.db, `users/${c.uid}`), { role: 'customer', name: 'C', email: 'c@t.dev' }));
await expect('customer edits own name', true, () => updateDoc(doc(c.db, `users/${c.uid}`), { name: 'New' }));
await expect('customer promotes self to admin', false, () => updateDoc(doc(c.db, `users/${c.uid}`), { role: 'admin' }));
await expect('customer places retail order', true, () => addDoc(collection(c.db, 'orders'), order(c.uid, 'retail')));
await expect('customer places dealer-priced order', false, () => addDoc(collection(c.db, 'orders'), order(c.uid, 'dealer')));
await expect('customer places order for someone else', false, () => addDoc(collection(c.db, 'orders'), order('someone-else', 'retail')));
await expect('customer places already-delivered order', false, () => addDoc(collection(c.db, 'orders'), { ...order(c.uid, 'retail'), status: 'delivered' }));
const mine = await addDoc(collection(c.db, 'orders'), order(c.uid, 'retail'));
await expect('customer changes order total', false, () => updateDoc(mine, { total: 1 }));
await expect('customer cancels own order', true, () => updateDoc(mine, { status: 'cancelled', statusHistory: [{ status: 'cancelled' }] }));
await expect('customer lists own orders', true, () => getDocs(query(collection(c.db, 'orders'), where('userId', '==', c.uid))));
await expect('customer lists all orders', false, () => getDocs(collection(c.db, 'orders')));
await expect('customer reads sample order of another user', false, () => getDoc(doc(c.db, 'orders/sample-10000101')));
await expect('customer books service', true, () => addDoc(collection(c.db, 'serviceRequests'), { userId: c.uid, status: 'open', type: 'Repair' }));
await expect('customer books pre-assigned service', false, () => addDoc(collection(c.db, 'serviceRequests'), { userId: c.uid, status: 'assigned' }));
await expect('customer notifies self (inbox)', true, () => addDoc(collection(c.db, 'notifications'), { userId: c.uid, title: 't', read: false }));
await expect('customer notifies another user', false, () => addDoc(collection(c.db, 'notifications'), { userId: 'x', title: 't' }));

const d = await client(`d${stamp}@t.dev`, 'secret123', true);
await expect('dealer registers as pending', true, () => setDoc(doc(d.db, `users/${d.uid}`), { role: 'dealer', dealerStatus: 'pending', businessName: 'B' }));
await expect('dealer self-approves', false, () => updateDoc(doc(d.db, `users/${d.uid}`), { dealerStatus: 'approved' }));
await expect('pending dealer places bulk order', false, () => addDoc(collection(d.db, 'orders'), order(d.uid, 'dealer')));

const a = await client('admin@pureflow.test', 'Admin@123');
await expect('admin lists all orders', true, () => getDocs(collection(a.db, 'orders')));
await expect('admin approves dealer', true, () => updateDoc(doc(a.db, `users/${d.uid}`), { dealerStatus: 'approved' }));
await expect('approved dealer places bulk order', true, () => addDoc(collection(d.db, 'orders'), order(d.uid, 'dealer')));
await expect('approved dealer places retail order', false, () => addDoc(collection(d.db, 'orders'), order(d.uid, 'retail')));
await expect('admin ships an order', true, () => updateDoc(doc(a.db, mine.path), { status: 'shipped' }));
await expect('admin edits product price', true, () => setDoc(doc(a.db, 'products/test-item'), { name: 'Test', price: 1 }));
await expect('admin notifies a user', true, () => addDoc(collection(a.db, 'notifications'), { userId: c.uid, title: 'Hi', read: false }));

const ad = await client('dealer@pureflow.test', 'Dealer@123');
await expect('seeded dealer reads own sample order', true, () => getDoc(doc(ad.db, 'orders/sample-10000201')));

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
await Promise.all([anon, c, d, a, ad].map((x) => deleteApp(x.app)));
process.exit(fail ? 1 : 0);
