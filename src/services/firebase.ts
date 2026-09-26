import { initializeApp, getApps } from 'firebase/app';
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

let firestore: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let currentUser: any | null = null;

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
      onAuthStateChanged(auth, (u: any | null) => {
        currentUser = u;
      });
    } else {
      firestore = getFirestore();
      auth = getAuth();
      onAuthStateChanged(auth, (u: any | null) => {
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

export function isFirebaseConfigured(): boolean {
  return !!firestore && !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
}

export async function getCurrentUid() {
  return currentUser?.uid ?? null;
}

// Push a transaction to Firestore
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

// Push product to Firestore
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

// Pull all products from Firestore and merge with local Dexie
export async function pullProductsFromFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!firestore) {
    return { success: false, count: 0, error: 'Firebase is not configured with environment variables' };
  }
  try {
    const colRef = collection(firestore, 'products');
    const snapshot = await getDocs(colRef);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Product;
      if (!data.name) continue;

      // Check if product exists by SKU or barcode
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
    return { success: false, count: 0, error: e?.message || 'Failed to pull products' };
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

// Push taxonomy attribute to Firestore
export async function pushAttributeToFirestore(attribute: ProductAttribute): Promise<boolean> {
  if (!firestore) return false;
  try {
    const docId = `${attribute.type}_${attribute.name.toLowerCase().trim().replace(/[/\\#? ]/g, '_')}`;
    const ref = doc(firestore, 'attributes', docId);
    await setDoc(ref, { ...attribute, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to push attribute to Firestore:', e);
    return false;
  }
}

// Pull attributes from Firestore
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
  } catch (e) {
    console.error('Failed to pull attributes from Firestore:', e);
    return { success: false, count: 0 };
  }
}

export { firestore, auth };
