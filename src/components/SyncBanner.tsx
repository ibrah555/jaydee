import { useEffect, useState } from 'react';
import { useTransactionStore } from '../stores/transaction';

export default function SyncBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const { pendingCount, syncPendingTransactions } = useTransactionStore();

  useEffect(() => {
    const update = async () => {
      const nextOnline = navigator.onLine;
      setOnline(nextOnline);
      if (nextOnline) {
        await syncPendingTransactions();
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [syncPendingTransactions]);

  return (
    <div className={`rounded-3xl p-3 text-sm font-medium ${online ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
      {online ? `Online — ${pendingCount} pending sync` : 'Offline — queued sales will sync later'}
    </div>
  );
}
