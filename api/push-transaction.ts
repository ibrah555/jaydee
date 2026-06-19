import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Vercel provides environment variables; expect FIREBASE_SERVICE_ACCOUNT as JSON string
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT || '';

function initAdmin() {
  if (admin.apps.length) return admin.app();
  let cred: admin.ServiceAccount | undefined;
  try {
    cred = JSON.parse(serviceAccountString);
  } catch (e) {
    // fallback to application default
  }
  return admin.initializeApp({ credential: cred ? admin.credential.cert(cred) : admin.credential.applicationDefault() });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const app = initAdmin();
  const firestore = app.firestore();
  const tx = req.body;
  if (!tx || !tx.transactionId) {
    return res.status(400).json({ error: 'Missing transaction payload or transactionId' });
  }

  try {
    const docRef = firestore.collection('transactions').doc(tx.transactionId);
    // Attach server metadata
    const serverPayload = Object.assign({}, tx, { pushedAt: admin.firestore.FieldValue.serverTimestamp() });
    await docRef.set(serverPayload, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('push-transaction error', err);
    return res.status(500).json({ error: String(err) });
  }
}
