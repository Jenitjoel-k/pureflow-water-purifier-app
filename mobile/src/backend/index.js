// One data/auth interface for the app with two implementations:
//  - firebase: Firebase Auth + Firestore (when mobile/.env has Firebase keys)
//  - demo:     fully offline store on the device, used for the demo APK
// Every watch* callback receives plain objects: { id, ...data }.
import { DEMO_MODE } from '../config';
import * as demo from './demo';

// The Firebase implementation is loaded lazily so the demo build never
// initialises Firebase without a config.
// eslint-disable-next-line global-require
const backend = DEMO_MODE ? demo : require('./firebase');

export const {
  onAuth, signIn, signUp, signOut, resetPassword, getIdToken,
  watchDoc, watchMine, watchAll, getOnce, setData, add, update, updateMany,
} = backend;

export const isDemo = DEMO_MODE;
