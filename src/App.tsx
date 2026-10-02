import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Products from './pages/Products';
import History from './pages/History';
import More from './pages/More';
import AdminUsers from './pages/AdminUsers';
import AdminAttributes from './pages/AdminAttributes';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Sale from './pages/Sale';
import Home from './pages/Home';
import Sidebar from './components/Sidebar';
import { useAuthStore } from './stores/auth';
import SyncBanner from './components/SyncBanner';
import { useTransactionStore } from './stores/transaction';
import { syncCatalogWithSupabase, isSupabaseConfigured } from './services/supabase';

export default function App() {
  const { user, signOut } = useAuthStore();
  const { pendingCount, syncPendingTransactions, loadTransactions } = useTransactionStore();



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

  useEffect(() => {
    // Automatic recurring background cloud sync when online
    const runAutoSync = async () => {
      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await syncCatalogWithSupabase();
          await syncPendingTransactions();
        } catch {
          // background sync fails gracefully if connection dropped
        }
      }
    };

    runAutoSync();
    const interval = setInterval(runAutoSync, 60000); // sync every 60 seconds
    return () => clearInterval(interval);
  }, [syncPendingTransactions]);

  return (
    <div className="min-h-screen bg-secondary text-body">
      <SyncBanner />
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sale" element={<RoleRoute allowedRoles={['cashier']} element={<Sale />} />} />
          <Route path="/dashboard" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<Dashboard />} />} />
          <Route path="/reports" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<Reports />} />} />
          <Route path="/products" element={<RoleRoute allowedRoles={['owner','manager','inventory','superadmin']} element={<Products />} />} />
          <Route path="/history" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<History />} />} />
          <Route path="/more" element={<RoleRoute allowedRoles={['owner','manager','inventory','superadmin']} element={<More />} />} />
          <Route path="/admin/users" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<AdminUsers />} />} />
          <Route path="/admin/attributes" element={<RoleRoute allowedRoles={['owner','manager','superadmin']} element={<AdminAttributes />} />} />
          <Route path="/suppliers" element={<RoleRoute allowedRoles={['owner','manager','inventory','superadmin']} element={<Suppliers />} />} />
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
