self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('sync', (event) => {
  if (event.tag === 'jaydee-sync') {
    event.waitUntil(handleSyncEvent());
  }
});

async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('JayDeePOS');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingTransactions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readonly');
    const store = tx.objectStore('transactions');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      const pending = all.filter(t => t.syncStatus === 'pending' || t.syncStatus === 'failed');
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

async function updateTransaction(db, id, patch) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve();
      const updated = Object.assign({}, item, patch);
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function handleSyncEvent() {
  try {
    const db = await openIndexedDB();
    const pending = await getPendingTransactions(db);
    if (!pending || pending.length === 0) {
      // notify clients
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of allClients) client.postMessage({ type: 'jaydee-sync-result', synced: 0 });
      return;
    }

    let syncedCount = 0;
    for (const tx of pending) {
      try {
        // POST to serverless endpoint on same origin
        const resp = await fetch('/api/push-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
        if (resp.ok) {
          await updateTransaction(db, tx.id, { syncStatus: 'synced', syncFailureReason: null });
          syncedCount++;
        } else {
          const text = await resp.text();
          const attempts = (tx.pushAttempts || 0) + 1;
          await updateTransaction(db, tx.id, { pushAttempts: attempts, lastAttemptAt: Date.now(), syncFailureReason: `HTTP ${resp.status}: ${text}` });
        }
      } catch (err) {
        const attempts = (tx.pushAttempts || 0) + 1;
        await updateTransaction(db, tx.id, { pushAttempts: attempts, lastAttemptAt: Date.now(), syncFailureReason: String(err) });
      }
    }

    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) client.postMessage({ type: 'jaydee-sync-result', synced: syncedCount });
  } catch (err) {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) client.postMessage({ type: 'jaydee-sync-error', error: String(err) });
  }
}

self.addEventListener('message', (event) => {
  // reserved for future
});
