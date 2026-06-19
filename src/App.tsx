import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Products from './pages/Products';
import History from './pages/History';
import More from './pages/More';
import Sale from './pages/Sale';
import { useAuthStore } from './stores/auth';
import SyncBanner from './components/SyncBanner';
import { useTransactionStore } from './stores/transaction';

export default function App() {
  const { user, signOut } = useAuthStore();
  const { pendingCount, syncPendingTransactions } = useTransactionStore();

  useEffect(() => {
    if (!user) return;

    let timeoutId: number | undefined;

    const resetTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        signOut();
      }, 5 * 60 * 1000);
    };

    const handleActivity = () => resetTimer();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        signOut();
      }
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    document.addEventListener('visibilitychange', handleVisibility);

    resetTimer();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, signOut]);

  useEffect(() => {
    // register lightweight service worker for background sync requests
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});

      const onMessage = (ev: MessageEvent) => {
        if (ev.data?.type === 'jaydee-sync') {
          syncPendingTransactions();
        }
      };

      navigator.serviceWorker.addEventListener('message', onMessage as any);

      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage as any);
      };
    }
    return;
  }, [syncPendingTransactions]);

  useEffect(() => {
    // when there are pending transactions, try to register a sync
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    if (pendingCount <= 0) return;

    navigator.serviceWorker.ready
      .then((reg: any) => reg.sync.register('jaydee-sync').catch(() => undefined))
      .catch(() => undefined);
  }, [pendingCount]);

  return (
    <div className="min-h-screen bg-secondary text-body">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={user ? <AppRoutes /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <SyncBanner />
      <Routes>
        <Route path="/" element={<Sale />} />
        <Route path="/products" element={<Products />} />
        <Route path="/history" element={<History />} />
        <Route path="/more" element={<More />} />
      </Routes>
    </>
  );
}
