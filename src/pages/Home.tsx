import { useAuthStore } from '../stores/auth';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuthStore();

  const isCashier = user?.role === 'cashier';
  const canSeeDashboard = ['owner', 'manager', 'superadmin'].includes(user?.role || '');
  const canSeeProducts = ['owner', 'manager', 'inventory', 'superadmin'].includes(user?.role || '');
  const canSeeHistory = ['owner', 'manager', 'superadmin'].includes(user?.role || '');

  return (
    <div className="min-h-screen p-6 bg-secondary text-body">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-3xl font-bold text-accent">Welcome back, {user?.name ?? 'User'}!</h1>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isCashier && (
            <Link
              to="/sale"
              className="rounded-3xl bg-gradient-to-br from-accent to-primary p-6 text-white shadow-lg hover:scale-[1.01] transition"
            >
              <h2 className="text-lg font-semibold">Open Cashier</h2>
              <p className="mt-2 text-sm text-white/80">Start a new sale session and scan items.</p>
            </Link>
          )}
          {canSeeDashboard && (
            <Link
              to="/dashboard"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">View Dashboard</h2>
              <p className="mt-2 text-sm text-slate-500">See sales performance and inventory alerts.</p>
            </Link>
          )}
          {canSeeProducts && (
            <Link
              to="/products"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">Manage Products</h2>
              <p className="mt-2 text-sm text-slate-500">Browse products and update stock levels.</p>
            </Link>
          )}
          {canSeeHistory && (
            <Link
              to="/history"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">Transaction History</h2>
              <p className="mt-2 text-sm text-slate-500">Review receipts and sync status.</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
