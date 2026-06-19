import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

let firestore: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let currentUser: any = null;

function initFirebase() {
  try {
    if (getApps().length === 0) {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
      const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      const appId = import.meta.env.VITE_FIREBASE_APP_ID;

      if (!apiKey || !projectId) {
        return null;
      }

      const config = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId
      } as any;

      const app = initializeApp(config);
      firestore = getFirestore(app);
      auth = getAuth(app);

      // attempt anonymous auth so writes have an auth context
      signInAnonymously(auth).catch(() => undefined);
      onAuthStateChanged(auth, (u: any) => {
        currentUser = u;
      });
    } else {
      firestore = getFirestore();
      auth = getAuth();
      onAuthStateChanged(auth, (u: any) => {
        currentUser = u;
      });
    }

    return firestore;
  } catch (e) {
    console.error('Firebase init failed', e);
    return null;
  }
}

initFirebase();

export async function getCurrentUid() {
  return currentUser?.uid ?? null;
}

export async function pushTransactionToFirestore(transaction: any) {
  if (!firestore) return false;
  try {
    const uid = currentUser?.uid ?? null;
    const payload = { ...transaction, pushedBy: uid, pushedAt: Date.now() };
    const ref = doc(firestore, 'transactions', transaction.transactionId);
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (e) {
    console.error('Firestore push failed', e);
    return false;
  }
}

export { firestore, auth };
