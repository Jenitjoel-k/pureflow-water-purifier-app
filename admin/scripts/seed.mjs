// Seeds Firestore with the 52-product catalog, demo accounts and sample
// orders / service tickets.
//
// Usage (from admin/):
//   1. Put your Firebase service-account key at admin/serviceAccount.json
//      (Firebase console > Project settings > Service accounts > Generate key).
//   2. IMAGE_BASE_URL=https://<your-admin>.vercel.app npm run seed
//      (images are served from admin/public/products/<id>.jpg on Vercel;
//       if scripts/image-urls.json exists, e.g. from a Cloudinary upload, it wins.)
//   Flags: --products-only  skip demo users / sample data
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(here, '..', 'serviceAccount.json');
const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
if (!useEmulator && !fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}`);
  process.exit(1);
}
const IMAGE_BASE_URL = (process.env.IMAGE_BASE_URL || '').replace(/\/$/, '');
const urlMapPath = path.join(here, 'image-urls.json');
const urlMap = fs.existsSync(urlMapPath) ? JSON.parse(fs.readFileSync(urlMapPath, 'utf8')) : {};
if (!IMAGE_BASE_URL && !Object.keys(urlMap).length) {
  console.error('Set IMAGE_BASE_URL (your Vercel URL) or create scripts/image-urls.json first.');
  process.exit(1);
}

initializeApp(useEmulator
  ? { projectId: process.env.GCLOUD_PROJECT || 'demo-pureflow' }
  : { credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();
const auth = getAuth();

const imageFor = (id) => urlMap[id] || `${IMAGE_BASE_URL}/products/${id}.jpg`;

async function seedProducts() {
  const batch = db.batch();
  for (const { look, ...p } of catalog) {
    batch.set(db.doc(`products/${p.id}`), {
      ...p,
      image: imageFor(p.id),
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  console.log(`✓ ${catalog.length} products`);
}

async function ensureUser({ email, password, name, ...profile }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, displayName: name, emailVerified: true });
  }
  await db.doc(`users/${user.uid}`).set({ name, email, ...profile, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`✓ ${profile.role.padEnd(8)} ${email} / ${password}`);
  return user.uid;
}

const daysAgo = (n, h = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 15, 0, 0);
  return d;
};

async function seedSamples(ids) {
  const byId = Object.fromEntries(catalog.map((p) => [p.id, p]));
  const address = { line1: '42, 12th Main, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', lat: 12.9719, lng: 77.6412 };
  const dealerAddress = { line1: 'Shop 7, Lamington Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400007', lat: 18.9596, lng: 72.8196 };

  const makeOrder = (no, uid, who, channel, items, status, ago, payment) => {
    const lines = items.map(([id, qty]) => {
      const p = byId[id];
      return { productId: id, name: p.name, image: imageFor(id), category: p.category, price: channel === 'dealer' ? p.dealerPrice : p.price, qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const rate = channel === 'dealer' ? (subtotal >= 100000 ? 0.05 : subtotal >= 50000 ? 0.03 : 0) : 0;
    const discount = Math.round(subtotal * rate);
    const shipping = channel === 'dealer' || subtotal >= 999 ? 0 : 79;
    const total = subtotal - discount + shipping;
    const flow = ['placed', 'confirmed', 'shipped', 'delivered'];
    const history = status === 'cancelled'
      ? [{ status: 'placed', at: daysAgo(ago).toISOString() }, { status: 'cancelled', at: daysAgo(ago, 15).toISOString(), by: 'customer' }]
      : flow.slice(0, flow.indexOf(status) + 1).map((s, i) => ({ status: s, at: daysAgo(Math.max(ago - i, 0), 10 + i).toISOString() }));
    return {
      id: `sample-${no}`,
      orderNo: `PF${no}`,
      userId: uid,
      customerName: who.name,
      customerEmail: who.email,
      customerPhone: who.phone,
      businessName: who.businessName || null,
      channel,
      items: lines,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      subtotal, discount, discountRate: rate, shipping, total, gst: Math.round(total - total / 1.18),
      address: channel === 'dealer' ? dealerAddress : address,
      note: '',
      payment,
      status,
      statusHistory: history,
      ...(status === 'shipped' || status === 'delivered' ? { tracking: { carrier: 'Delhivery', number: `DLV${no}IN` } } : {}),
      createdAt: Timestamp.fromDate(daysAgo(ago)),
    };
  };

  const cust = { name: 'Priya Nair', email: 'customer@pureflow.test', phone: '9876543210' };
  const deal = { name: 'Rahul Mehta', email: 'dealer@pureflow.test', phone: '9822012345', businessName: 'Mehta Water Solutions' };
  const paid = (id) => ({ method: 'razorpay', status: 'paid', razorpayPaymentId: `pay_demo${id}`, mode: 'test' });
  const orders = [
    makeOrder('10000101', ids.customer, cust, 'retail', [['pur-elite-ro-uv-uf', 1], ['spr-tds-meter', 1]], 'delivered', 6, paid('101')),
    makeOrder('10000102', ids.customer, cust, 'retail', [['flt-service-kit', 1]], 'shipped', 2, { method: 'cod', status: 'pending' }),
    makeOrder('10000103', ids.customer, cust, 'retail', [['dis-electric-bottle-pump', 2]], 'placed', 0, paid('103')),
    makeOrder('10000201', ids.dealer, deal, 'dealer', [['flt-ro-membrane-80', 50], ['flt-sediment-10', 100], ['spr-smps-24v', 50]], 'delivered', 5, paid('201')),
    makeOrder('10000202', ids.dealer, deal, 'dealer', [['pur-classic-ro-7l', 10], ['pmp-ro-booster-100', 20]], 'confirmed', 1, { method: 'credit', status: 'credit' }),
    makeOrder('10000203', ids.dealer, deal, 'dealer', [['pur-aqua-max-ro-copper', 5]], 'placed', 0, paid('203')),
    makeOrder('10000104', ids.customer, cust, 'retail', [['pur-gravity-classic-23l', 1]], 'cancelled', 3, { method: 'cod', status: 'pending' }),
  ];

  const tickets = [
    { id: 'sample-sr1', ticketNo: 'SR1000001', type: 'Installation', product: 'PureFlow Elite RO+UV+UF 10L', issue: '', status: 'resolved', ago: 5, technician: { name: 'Ravi Kumar', phone: '9876500011' }, adminNote: 'Installed and demoed. TDS 45 ppm.' },
    { id: 'sample-sr2', ticketNo: 'SR1000002', type: 'Repair', product: 'PureFlow Elite RO+UV+UF 10L', issue: 'Water flow has become very slow.', status: 'open', ago: 0 },
    { id: 'sample-sr3', ticketNo: 'SR1000003', type: 'AMC / Annual service', product: 'PureFlow Classic RO 7L', issue: 'Yearly maintenance', status: 'assigned', ago: 1, technician: { name: 'Anita Sharma', phone: '9876500022' } },
  ];

  const batch = db.batch();
  for (const { id, ...o } of orders) batch.set(db.doc(`orders/${id}`), o);
  for (const { id, ago, ...t } of tickets) {
    const pref = daysAgo(-(2 - Math.min(ago, 2)));
    batch.set(db.doc(`serviceRequests/${id}`), {
      ...t,
      userId: ids.customer, name: cust.name, email: cust.email, phone: cust.phone, role: 'customer',
      preferredDate: pref.toISOString().slice(0, 10), slot: '12 PM - 3 PM', address,
      history: [{ status: 'open', at: daysAgo(ago).toISOString() }, ...(t.status !== 'open' ? [{ status: t.status, at: daysAgo(ago, 16).toISOString(), by: 'admin' }] : [])],
      createdAt: Timestamp.fromDate(daysAgo(ago)),
    });
  }
  batch.set(db.doc('notifications/sample-welcome'), {
    userId: ids.customer, title: 'Welcome to PureFlow 💧', body: 'Enjoy free installation on every purifier and free delivery above ₹999.', data: {}, read: false, createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  console.log(`✓ ${orders.length} sample orders, ${tickets.length} service tickets`);
}

await seedProducts();
if (!process.argv.includes('--products-only')) {
  const ids = {};
  await ensureUser({ email: 'admin@pureflow.test', password: 'Admin@123', name: 'Store Admin', role: 'admin', phone: '9000000001' });
  ids.customer = await ensureUser({ email: 'customer@pureflow.test', password: 'Customer@123', name: 'Priya Nair', role: 'customer', phone: '9876543210', address: { line1: '42, 12th Main, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', lat: 12.9719, lng: 77.6412 } });
  ids.dealer = await ensureUser({ email: 'dealer@pureflow.test', password: 'Dealer@123', name: 'Rahul Mehta', role: 'dealer', dealerStatus: 'approved', businessName: 'Mehta Water Solutions', gstin: '27AAPFM1234C1Z5', phone: '9822012345', address: { line1: 'Shop 7, Lamington Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400007' } });
  await ensureUser({ email: 'newdealer@pureflow.test', password: 'Dealer@123', name: 'Kavita Rao', role: 'dealer', dealerStatus: 'pending', businessName: 'Rao Aqua Traders', gstin: '29AAKFR5678D1Z2', phone: '9845098450', address: { city: 'Mysuru' } });
  await seedSamples(ids);
}
console.log('Done.');
process.exit(0);
