import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, Product, ProductAttribute } from '../db/schema';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

let firestore: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let currentUser: any | null = null;
let activeProjectId: string | null = null;

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem('jaydee_firebase_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem('jaydee_firebase_config', JSON.stringify(config));
    initFirebase(true);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredFirebaseConfig() {
  try {
    localStorage.removeItem('jaydee_firebase_config');
    initFirebase(true);
  } catch {}
}

export function initFirebase(force = false) {
  try {
    const stored = getStoredFirebaseConfig();
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || stored?.apiKey;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || stored?.authDomain;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || stored?.projectId;
    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || stored?.storageBucket;
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || stored?.messagingSenderId;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID || stored?.appId;

    if (!apiKey || !projectId) {
      firestore = null;
      auth = null;
      activeProjectId = null;
      return null;
    }

    if (force && getApps().length > 0) {
      const existingApp = getApps()[0];
      deleteApp(existingApp).catch(() => undefined);
    }

    if (getApps().length === 0) {
      const config = {
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: storageBucket || `${projectId}.appspot.com`,
        messagingSenderId: messagingSenderId || '',
        appId: appId || ''
      } as any;

      const app = initializeApp(config);
      firestore = getFirestore(app);
      auth = getAuth(app);
      activeProjectId = projectId;

      signInAnonymously(auth).catch(() => undefined);
      onAuthStateChanged(auth, (u: any | null) => {
        currentUser = u;
      });
    } else {
      firestore = getFirestore();
      auth = getAuth();
      activeProjectId = projectId;
      onAuthStateChanged(auth, (u: any | null) => {
        currentUser = u;
      });
    }

    return firestore;
  } catch (e) {
    console.error('Firebase init failed', e);
    firestore = null;
    auth = null;
    activeProjectId = null;
    return null;
  }
}

initFirebase();

export function isFirebaseConfigured(): boolean {
  return !!firestore && !!activeProjectId;
}

export function getFirebaseProjectId(): string | null {
  return activeProjectId;
}

export async function getCurrentUid() {
  return currentUser?.uid ?? null;
}

// Push a single transaction
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

// Push a single product
export async function pushProductToFirestore(product: Product): Promise<boolean> {
  if (!firestore) return false;
  try {
    const docId = product.sku ? product.sku.replace(/[/\\#?]/g, '_') : `prod_${product.id || Date.now()}`;
    const ref = doc(firestore, 'products', docId);
    const payload = {
      ...product,
      updatedAt: Date.now(),
      pushedAt: Date.now()
    };
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to push product to Firestore:', e);
    return false;
  }
}

// Delete product from Firestore
export async function deleteProductFromFirestore(skuOrId: string | number): Promise<boolean> {
  if (!firestore) return false;
  try {
    const docId = String(skuOrId).replace(/[/\\#?]/g, '_');
    const ref = doc(firestore, 'products', docId);
    await deleteDoc(ref);
    return true;
  } catch (e) {
    console.error('Failed to delete product from Firestore:', e);
    return false;
  }
}

// Push ALL local products to Firestore
export async function pushAllProductsToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!firestore) {
    return { success: false, count: 0, error: 'Firebase Cloud Database is not connected.' };
  }
  try {
    const localProducts = await db.products.toArray();
    let count = 0;
    for (const p of localProducts) {
      const docId = p.sku ? p.sku.replace(/[/\\#?]/g, '_') : `prod_${p.id || Date.now()}`;
      const ref = doc(firestore, 'products', docId);
      await setDoc(ref, { ...p, updatedAt: p.updatedAt || Date.now() }, { merge: true });
      count++;
    }
    return { success: true, count };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Failed to upload products' };
  }
}

// Pull all products from Firestore and merge into local Dexie
export async function pullProductsFromFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!firestore) {
    return { success: false, count: 0, error: 'Firebase Cloud Database is not connected.' };
  }
  try {
    const colRef = collection(firestore, 'products');
    const snapshot = await getDocs(colRef);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Product;
      if (!data.name) continue;

      const existing = data.sku
        ? await db.products.where('sku').equals(data.sku).first()
        : data.barcode
        ? await db.products.where('barcode').equals(data.barcode).first()
        : null;

      if (existing && existing.id) {
        await db.products.update(existing.id, {
          ...data,
          id: existing.id
        });
      } else {
        const { id, ...toAdd } = data;
        await db.products.add(toAdd as Product);
      }
      count++;
    }

    return { success: true, count };
  } catch (e: any) {
    console.error('Failed to pull products from Firestore:', e);
    return { success: false, count: 0, error: e?.message || 'Failed to download products' };
  }
}

// Push all local attributes to Firestore
export async function pushAllAttributesToFirestore(): Promise<{ success: boolean; count: number }> {
  if (!firestore) return { success: false, count: 0 };
  try {
    const attrs = await db.productAttributes.toArray();
    let count = 0;
    for (const a of attrs) {
      const docId = `${a.type}_${a.name.toLowerCase().trim().replace(/[/\\#? ]/g, '_')}`;
      const ref = doc(firestore, 'attributes', docId);
      await setDoc(ref, { ...a, updatedAt: Date.now() }, { merge: true });
      count++;
    }
    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}

// Pull all attributes from Firestore
export async function pullAttributesFromFirestore(): Promise<{ success: boolean; count: number }> {
  if (!firestore) return { success: false, count: 0 };
  try {
    const colRef = collection(firestore, 'attributes');
    const snapshot = await getDocs(colRef);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as ProductAttribute;
      if (!data.name || !data.type) continue;

      const existing = await db.productAttributes
        .where('type')
        .equals(data.type)
        .filter((a) => a.name.toLowerCase() === data.name.toLowerCase())
        .first();

      if (!existing) {
        const { id, ...toAdd } = data;
        await db.productAttributes.add(toAdd as ProductAttribute);
        count++;
      }
    }

    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}

// Complete two-way sync: uploads local items, downloads cloud items
export async function syncCatalogWithCloud(): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}> {
  if (!firestore) {
    return { 
      success: false, 
      pushed: 0, 
      pulled: 0, 
      error: 'Firebase Cloud Database is not connected.' 
    };
  }

  try {
    // 1. Push local products to cloud
    const pushRes = await pushAllProductsToFirestore();
    if (!pushRes.success && pushRes.error) {
      return { success: false, pushed: 0, pulled: 0, error: pushRes.error };
    }

    // 2. Push local attributes to cloud
    await pushAllAttributesToFirestore();

    // 3. Pull cloud products to local
    const pullRes = await pullProductsFromFirestore();

    // 4. Pull cloud attributes to local
    await pullAttributesFromFirestore();

    return {
      success: true,
      pushed: pushRes.count,
      pulled: pullRes.count
    };
  } catch (e: any) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: e?.message || 'Sync failed'
    };
  }
}

// Real-time listener for products across devices
export function subscribeToCloudProducts(onSync?: () => void): (() => void) | null {
  if (!firestore) return null;
  try {
    const colRef = collection(firestore, 'products');
    const unsubscribe = onSnapshot(colRef, async (snapshot: any) => {
      let hasChanges = false;
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as Product;
        if (!data.name) continue;

        if (change.type === 'added' || change.type === 'modified') {
          const existing = data.sku
            ? await db.products.where('sku').equals(data.sku).first()
            : data.barcode
            ? await db.products.where('barcode').equals(data.barcode).first()
            : null;

          if (existing && existing.id) {
            await db.products.update(existing.id, {
              ...data,
              id: existing.id
            });
          } else {
            const { id, ...toAdd } = data;
            await db.products.add(toAdd as Product);
          }
          hasChanges = true;
        } else if (change.type === 'removed') {
          if (data.sku) {
            const existing = await db.products.where('sku').equals(data.sku).first();
            if (existing && existing.id) {
              await db.products.delete(existing.id);
              hasChanges = true;
            }
          }
        }
      }

      if (hasChanges && onSync) {
        onSync();
      }
    });

    return unsubscribe;
  } catch (e) {
    console.error('Failed to subscribe to cloud products:', e);
    return null;
  }
}

export { firestore, auth };
