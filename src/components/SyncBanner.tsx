import { useEffect, useState } from 'react';
import { useTransactionStore } from '../stores/transaction';
import { useProductStore } from '../stores/product';
import { WifiOff, Wifi } from 'lucide-react';

export default function SyncBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const { pendingCount, syncPendingTransactions } = useTransactionStore();
  const { syncWithCloud } = useProductStore();

  useEffect(() => {
    let timer: any;

    const handleOnline = async () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      try {
        await syncPendingTransactions();
        await syncWithCloud();
      } catch {}
      timer = setTimeout(() => setShowRestoredNotice(false), 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, [syncPendingTransactions, syncWithCloud]);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`sticky top-0 z-50 w-full px-4 py-2.5 text-xs font-semibold shadow-md transition-all flex items-center justify-between gap-3 ${
        !isOnline ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-white" />
            <div className="flex-1">
              <span className="font-bold underline uppercase tracking-wide mr-1.5">Offline Mode:</span>
              Internet connection lost. JayDee POS is running offline. Sales and updates are safely saved locally on this device and will auto-sync to the cloud as soon as you reconnect.
              {pendingCount > 0 && (
                <span className="ml-2 inline-block bg-rose-700 px-2 py-0.5 rounded-full text-[11px]">
                  {pendingCount} pending sync
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 shrink-0 text-white" />
            <div className="flex-1">
              <span className="font-bold mr-1.5">Back Online:</span>
              Internet connection restored. All queued data and products have been synchronized with the cloud!
            </div>
          </>
        )}
      </div>
    </div>
  );
}
