// All values come from mobile/.env (see .env.example). EXPO_PUBLIC_* vars are
// inlined at build time by Expo, so they are safe only for public client keys.
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Without Firebase keys the app runs as a self-contained offline demo
// (see src/backend/demo.js). Force it with EXPO_PUBLIC_DEMO_MODE=true.
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true' || !firebaseConfig.apiKey;

// Razorpay test key (rzp_test_...). Test mode needs no KYC.
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

// Base URL of the deployed admin panel on Vercel; its /api/notify function
// sends FCM push, SMS (TextBee) and email (EmailJS).
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || '').replace(/\/$/, '');

export const STORE_NAME = 'PureFlow';
export const SUPPORT_PHONE = '+91 98765 43210';
