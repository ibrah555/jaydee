import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { LogOut, Users, Settings, Sliders, Cloud } from 'lucide-react';
import CloudSyncModal from '../components/CloudSyncModal';
import { isSupabaseConfigured } from '../services/supabase';

export default function More() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const isCloudConnected = isSupabaseConfigured();

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="mb-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Settings and tools</p>
              <h1 className="mt-2 text-2xl font-semibold text-accent">More</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Logged in as</p>
              <p className="mt-1 font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {['owner', 'manager', 'superadmin'].includes(user?.role || '') && (
          <>
            <Link to="/admin/users" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-accent hover:bg-accent/5 transition flex items-center gap-3">
              <Users className="h-6 w-6 text-accent" />
              <div>
                <p className="font-medium text-slate-900">User Management</p>
                <p className="text-sm text-slate-500">Create, edit, and manage user accounts</p>
              </div>
            </Link>

            <Link to="/admin/attributes" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-accent hover:bg-accent/5 transition flex items-center gap-3">
              <Sliders className="h-6 w-6 text-accent" />
              <div>
                <p className="font-medium text-slate-900">Categories & Attributes</p>
                <p className="text-sm text-slate-500">Manage custom categories, product types, concerns, and tags</p>
              </div>
            </Link>
          </>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">Shop Profile</p>
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </div>
        </div>




        <button
          type="button"
          onClick={() => setIsCloudModalOpen(true)}
          className="w-full text-left rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-accent hover:bg-accent/5 transition flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 text-accent" />
            <div>
              <p className="font-medium text-slate-900">Cloud Database & Multi-Device Sync</p>
              <p className="text-sm text-slate-500">Sync products and sales across all phones and computers</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
            isCloudConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isCloudConnected ? 'Connected' : 'Setup Required'}
          </span>
        </button>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-6 w-6 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">Database Backup</p>
              <p className="text-sm text-slate-500">Download or restore your POS data</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => {
                try {
                  const { exportDB } = await import('dexie-export-import');
                  const { db } = await import('../db/schema');
                  const blob = await exportDB(db, { prettyJson: true });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `JayDee_Backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  alert('Backup downloaded successfully!');
                } catch (error) {
                  alert('Failed to export database.');
                  console.error(error);
                }
              }}
              className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition text-center"
            >
              Export Backup
            </button>
            
            <label className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition text-center cursor-pointer">
              Import Backup
              <input 
                type="file" 
                accept=".json" 
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!confirm('WARNING: Restoring will overwrite all current data on this device. Continue?')) return;
                  
                  try {
                    const { importDB } = await import('dexie-export-import');
                    const { db } = await import('../db/schema');
                    await db.delete();
                    await db.open();
                    await importDB(file);
                    alert('Backup restored successfully! Please refresh the page.');
                    window.location.reload();
                  } catch (error) {
                    alert('Failed to restore backup. Please ensure it is a valid JayDee POS backup file.');
                    console.error(error);
                  }
                  
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-8 pt-8 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full rounded-3xl bg-rose-50 border border-rose-200 px-4 py-3 font-semibold text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-2 transition"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <Link to="/" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="h-6 w-6 rounded-full bg-slate-200" />
            <span className="text-xs">New Sale</span>
          </Link>
          <Link to="/products" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="h-6 w-6 rounded-full bg-slate-200" />
            <span className="text-xs">Products</span>
          </Link>
          <Link to="/history" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="h-6 w-6 rounded-full bg-slate-200" />
            <span className="text-xs">History</span>
          </Link>
          <Link to="/more" className="flex flex-col items-center gap-1 text-accent">
            <span className="h-6 w-6 rounded-full bg-primary" />
            <span className="text-xs">More</span>
          </Link>
        </div>
      </nav>
      <CloudSyncModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} />
    </div>
  );
}
