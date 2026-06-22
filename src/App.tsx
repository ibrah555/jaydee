import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Products from './pages/Products';
import History from './pages/History';
import More from './pages/More';
import AdminUsers from './pages/AdminUsers';
import Sale from './pages/Sale';
import Home from './pages/Home';
import Sidebar from './components/Sidebar';
import { useAuthStore } from './stores/auth';
import SyncBanner from './components/SyncBanner';
import { useTransactionStore } from './stores/transaction';

export default function App() {
  const { user, signOut } = useAuthStore();
  const { pendingCount, syncPendingTransactions, loadTransactions } = useTransactionStore();

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
      .then((reg: any) => reg.sync?.register('jaydee-sync').catch(() => undefined))
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
    <div className="min-h-screen flex bg-secondary text-body">
      <Sidebar />
      <div className="flex-1">
        <SyncBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sale" element={<RoleRoute allowedRoles={['cashier']} element={<Sale />} />} />
          <Route path="/dashboard" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<Dashboard />} />} />
          <Route path="/products" element={<RoleRoute allowedRoles={['owner','manager','inventory','superadmin']} element={<Products />} />} />
          <Route path="/history" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<History />} />} />
          <Route path="/more" element={<RoleRoute allowedRoles={['owner','manager','inventory','superadmin']} element={<More />} />} />
          <Route path="/admin/users" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<AdminUsers />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function RoleRoute({ allowedRoles, element }: { allowedRoles: string[]; element: JSX.Element }) {
  const { user } = useAuthStore();

  console.log('RoleRoute: user =', user?.username, 'role =', user?.role, 'allowedRoles =', allowedRoles);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return allowedRoles.includes(user.role) ? element : <Navigate to="/" replace />;
}
