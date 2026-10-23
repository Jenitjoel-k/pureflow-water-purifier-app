// Offline demo backend: everything lives on the phone (AsyncStorage), so the
// demo APK needs no Firebase project or internet for its data.
// A small "store staff" simulator plays the admin's role so every flow can be
// seen end to end: orders get confirmed → shipped → delivered, service tickets
// get a technician, and pending dealers are approved, each with a notification.
import AsyncStorage from '@react-native-async-storage/async-storage';
import catalog from '../demo/catalog.json';
import productImages from '../demo/images';

const KEY = 'pureflow-demo-db-v1';
const now = () => new Date().toISOString();
const ago = (days, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------------------------------------------------------------- seed data
function seed() {
  const products = Object.fromEntries(catalog.map((p) => [p.id, { ...p }]));
  const address = { line1: '42, 12th Main, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', lat: 12.9719, lng: 77.6412 };
  const dealerAddress = { line1: 'Shop 7, Lamington Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400007', lat: 18.9596, lng: 72.8196 };
  const users = {
    'demo-customer': { role: 'customer', name: 'Priya Nair', email: 'customer@pureflow.test', phone: '9876543210', address, createdAt: ago(40) },
    'demo-dealer': { role: 'dealer', dealerStatus: 'approved', name: 'Rahul Mehta', email: 'dealer@pureflow.test', phone: '9822012345', businessName: 'Mehta Water Solutions', gstin: '27AAPFM1234C1Z5', address: dealerAddress, createdAt: ago(60) },
    'demo-newdealer': { role: 'dealer', dealerStatus: 'pending', name: 'Kavita Rao', email: 'newdealer@pureflow.test', phone: '9845098450', businessName: 'Rao Aqua Traders', gstin: '29AAKFR5678D1Z2', address: { city: 'Mysuru' }, createdAt: ago(1) },
  };
  const accounts = {
    'customer@pureflow.test': { uid: 'demo-customer', password: 'Customer@123' },
    'dealer@pureflow.test': { uid: 'demo-dealer', password: 'Dealer@123' },
    'newdealer@pureflow.test': { uid: 'demo-newdealer', password: 'Dealer@123' },
  };

  const order = (no, uid, channel, items, status, days, payment) => {
    const u = users[uid];
    const lines = items.map(([id, qty]) => {
      const p = products[id];
      return { productId: id, name: p.name, category: p.category, price: channel === 'dealer' ? p.dealerPrice : p.price, qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const rate = channel === 'dealer' ? (subtotal >= 100000 ? 0.05 : subtotal >= 50000 ? 0.03 : 0) : 0;
    const discount = Math.round(subtotal * rate);
    const shipping = channel === 'dealer' || subtotal >= 999 ? 0 : 79;
    const total = subtotal - discount + shipping;
    const flow = ['placed', 'confirmed', 'shipped', 'delivered'];
    return [`seed-${no}`, {
      orderNo: `PF${no}`, userId: uid, customerName: u.name, customerEmail: u.email, customerPhone: u.phone,
      businessName: u.businessName || null, channel, items: lines, itemCount: lines.reduce((s, l) => s + l.qty, 0),
      subtotal, discount, discountRate: rate, shipping, total, gst: Math.round(total - total / 1.18),
      address: u.address, note: '', payment, status, seeded: true,
      statusHistory: flow.slice(0, flow.indexOf(status) + 1).map((s, i) => ({ status: s, at: ago(Math.max(days - i, 0), 10 + i) })),
      ...(['shipped', 'delivered'].includes(status) ? { tracking: { carrier: 'Delhivery', number: `DLV${no}IN` } } : {}),
      createdAt: ago(days),
    }];
  };
  const paid = (n) => ({ method: 'razorpay', status: 'paid', razorpayPaymentId: `pay_demo${n}`, mode: 'test' });
  const orders = Object.fromEntries([
    order('10000101', 'demo-customer', 'retail', [['pur-elite-ro-uv-uf', 1], ['spr-tds-meter', 1]], 'delivered', 12, paid(101)),
    order('10000102', 'demo-customer', 'retail', [['flt-service-kit', 1]], 'shipped', 2, { method: 'cod', status: 'pending' }),
    order('10000201', 'demo-dealer', 'dealer', [['flt-ro-membrane-80', 50], ['flt-sediment-10', 100], ['spr-smps-24v', 50]], 'delivered', 9, paid(201)),
    order('10000202', 'demo-dealer', 'dealer', [['pur-classic-ro-7l', 10], ['pmp-ro-booster-100', 20]], 'confirmed', 1, { method: 'credit', status: 'credit' }),
  ]);

  const serviceRequests = {
    'seed-sr1': {
      ticketNo: 'SR1000001', userId: 'demo-customer', name: 'Priya Nair', email: 'customer@pureflow.test', phone: '9876543210', role: 'customer',
      type: 'Installation', product: 'PureFlow Elite RO+UV+UF 10L', issue: '', preferredDate: ago(11).slice(0, 10), slot: '12 PM - 3 PM', address,
      status: 'resolved', technician: { name: 'Ravi Kumar', phone: '9876500011' }, adminNote: 'Installed and demoed. Output TDS 45 ppm.',
      history: [{ status: 'open', at: ago(12) }, { status: 'resolved', at: ago(11, 15) }], seeded: true, createdAt: ago(12),
    },
  };

  const notifications = {
    'seed-n1': { userId: 'demo-customer', title: 'Welcome to PureFlow 💧', body: 'Free installation on every purifier and free delivery above ₹999.', data: {}, read: false, createdAt: ago(0, 9) },
    'seed-n2': { userId: 'demo-dealer', title: 'Order PF10000202 confirmed', body: 'Your bulk order is being packed and will ship within 2 days.', data: { orderId: 'seed-10000202' }, read: false, createdAt: ago(0, 9) },
  };

  return { users, accounts, products, orders, serviceRequests, notifications, session: null };
}

// ---------------------------------------------------------------- store
let db = null;
const listeners = new Set();
let saveTimer = null;

// Product images are bundled assets (numbers); re-attach them after loading
// because the stored JSON may come from an older build.
function attachImages() {
  for (const [id, p] of Object.entries(db.products)) p.image = productImages[id] ?? null;
  for (const o of Object.values(db.orders)) for (const it of o.items) it.image = productImages[it.productId] ?? null;
}

const ready = (async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : seed();
  } catch {
    db = seed();
  }
  // Keep the catalog in sync with the app version.
  for (const p of catalog) db.products[p.id] = { ...p, ...(db.products[p.id] ? { stock: db.products[p.id].stock } : {}) };
  attachImages();
})();

function changed() {
  listeners.forEach((fn) => fn());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => {}), 300);
}

function listen(fn) {
  let active = true;
  ready.then(() => active && fn());
  const wrapped = () => active && fn();
  listeners.add(wrapped);
  return () => {
    active = false;
    listeners.delete(wrapped);
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const withImages = (col, row) => {
  if (col === 'products') row.image = productImages[row.id] ?? null;
  if (col === 'orders') row.items.forEach((it) => (it.image = productImages[it.productId] ?? null));
  return row;
};
const row = (col, id) => (db[col][id] ? withImages(col, { id, ...clone(db[col][id]) }) : null);
const stampNow = (data) => {
  const out = { ...data };
  for (const k of ['createdAt', 'updatedAt']) if (out[k] === 'now') out[k] = now();
  return out;
};
const fail = (msg) => {
  const e = new Error(msg);
  e.code = 'auth/invalid-credential';
  return e;
};

// ---------------------------------------------------------------- auth
const authListeners = new Set();
const currentUser = () => (db?.session ? { uid: db.session, email: db.users[db.session]?.email } : null);
const authChanged = () => authListeners.forEach((fn) => fn(currentUser()));

export function onAuth(cb) {
  authListeners.add(cb);
  ready.then(() => authListeners.has(cb) && cb(currentUser()));
  return () => authListeners.delete(cb);
}

export async function signIn(email, password) {
  await ready;
  const acc = db.accounts[email.toLowerCase()];
  if (!acc || acc.password !== password) throw fail('Incorrect email or password.');
  db.session = acc.uid;
  // Pending dealers are "reviewed" by the simulator shortly after signing in.
  const u = db.users[acc.uid];
  if (u.role === 'dealer' && u.dealerStatus === 'pending') u.pendingSince = now();
  changed();
  authChanged();
  return acc.uid;
}

export async function signUp(email, password) {
  await ready;
  const key = email.toLowerCase();
  if (db.accounts[key]) {
    const e = new Error('exists');
    e.code = 'auth/email-already-in-use';
    throw e;
  }
  if (password.length < 6) {
    const e = new Error('weak');
    e.code = 'auth/weak-password';
    throw e;
  }
  const uid = `u-${newId()}`;
  db.accounts[key] = { uid, password };
  db.session = uid;
  changed();
  return uid; // auth listeners fire once the profile is written (setData)
}

export async function signOut() {
  await ready;
  db.session = null;
  changed();
  authChanged();
}

export async function resetPassword(email) {
  await ready;
  if (!db.accounts[email.toLowerCase()]) throw fail('No account with this email.');
}

export const getIdToken = async () => null;

// ---------------------------------------------------------------- data
export const watchDoc = (col, id, cb) => listen(() => cb(row(col, id)));

export const watchMine = (col, uid, cb) =>
  listen(() => cb(Object.keys(db[col]).filter((id) => db[col][id].userId === uid).map((id) => row(col, id))));

export const watchAll = (col, cb) => listen(() => cb(Object.keys(db[col]).map((id) => row(col, id))));

export async function getOnce(col, id) {
  await ready;
  return row(col, id);
}

export async function setData(col, id, data) {
  await ready;
  db[col][id] = stampNow(data);
  if (col === 'users' && data.role === 'dealer' && data.dealerStatus === 'pending') db[col][id].pendingSince = now();
  changed();
  if (col === 'users' && id === db.session) authChanged();
}

export async function add(col, data) {
  await ready;
  const id = newId();
  db[col][id] = stampNow(data);
  if (col === 'orders') {
    for (const it of data.items) if (db.products[it.productId]) db.products[it.productId].stock = Math.max(0, db.products[it.productId].stock - it.qty);
  }
  changed();
  return id;
}

export async function update(col, id, patch) {
  await ready;
  if (!db[col][id]) throw new Error('Not found');
  Object.assign(db[col][id], stampNow(patch));
  changed();
}

export async function updateMany(col, ids, patch) {
  await ready;
  ids.forEach((id) => db[col][id] && Object.assign(db[col][id], stampNow(patch)));
  changed();
}

// ---------------------------------------------------------------- simulator
// Seconds after the previous step before the "store" takes the next action.
const ORDER_STEPS = { placed: ['confirmed', 15], confirmed: ['shipped', 40], shipped: ['delivered', 60] };
const TECHS = [
  { name: 'Ravi Kumar', phone: '9876500011' },
  { name: 'Anita Sharma', phone: '9876500022' },
  { name: 'Mohammed Irfan', phone: '9876500033' },
];
const since = (iso) => (Date.now() - new Date(iso).getTime()) / 1000;

function notify(userId, title, body, data) {
  db.notifications[newId()] = { userId, title, body, data, read: false, createdAt: now() };
}

function tick() {
  if (!db) return;
  let dirty = false;

  for (const [id, o] of Object.entries(db.orders)) {
    const step = ORDER_STEPS[o.status];
    if (o.seeded || !step) continue;
    const last = o.statusHistory[o.statusHistory.length - 1]?.at || o.createdAt;
    if (since(last) < step[1]) continue;
    const [next] = step;
    o.status = next;
    o.statusHistory.push({ status: next, at: now(), by: 'store' });
    if (next === 'shipped') o.tracking = { carrier: 'Delhivery', number: `DLV${o.orderNo.slice(2)}IN` };
    if (next === 'delivered' && o.payment?.method === 'cod') o.payment.status = 'paid';
    const msg = {
      confirmed: 'has been confirmed and is being packed.',
      shipped: `has been shipped via Delhivery (${o.tracking?.number}).`,
      delivered: 'has been delivered. Thank you for shopping with PureFlow!',
    }[next];
    notify(o.userId, `Order ${next}`, `Your order #${o.orderNo} ${msg}`, { orderId: id });
    dirty = true;
  }

  for (const [id, t] of Object.entries(db.serviceRequests)) {
    if (t.seeded || t.status !== 'open' || since(t.createdAt) < 20) continue;
    const tech = TECHS[Math.floor(Math.random() * TECHS.length)];
    t.status = 'assigned';
    t.technician = tech;
    t.history.push({ status: 'assigned', at: now(), by: 'store' });
    notify(t.userId, `Service #${t.ticketNo}: Assigned`, `Technician ${tech.name} (${tech.phone}) will visit on ${new Date(t.preferredDate).toDateString()} (${t.slot}).`, { ticketId: id });
    dirty = true;
  }

  for (const [uid, u] of Object.entries(db.users)) {
    if (u.role !== 'dealer' || u.dealerStatus !== 'pending' || !u.pendingSince || since(u.pendingSince) < 25) continue;
    u.dealerStatus = 'approved';
    u.reviewedAt = now();
    notify(uid, 'Dealer account approved 🎉', `Welcome aboard, ${u.businessName}! Wholesale prices and bulk ordering are now unlocked.`, { dealer: 'approved' });
    dirty = true;
  }

  if (dirty) changed();
}

setInterval(tick, 3000);

export async function resetDemo() {
  db = seed();
  attachImages();
  changed();
  authChanged();
}
