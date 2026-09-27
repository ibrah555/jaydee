import { useState } from 'react';
import { 
  isSupabaseConfigured, 
  getSupabaseProjectUrl, 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  clearStoredSupabaseConfig, 
  syncCatalogWithSupabase, 
  SupabaseConfig 
} from '../services/supabase';
import { useProductStore } from '../stores/product';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, X, Key, ShieldCheck, Database } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const { loadProducts } = useProductStore();
  const isConnected = isSupabaseConfigured();
  const currentProjectUrl = getSupabaseProjectUrl();
  const storedConfig = getStoredSupabaseConfig();

  const [activeTab, setActiveTab] = useState<'status' | 'setup'>('status');
  const [url, setUrl] = useState(storedConfig?.url || currentProjectUrl || 'https://xhmxgagyydglqgarrocd.supabase.co');
  const [anonKey, setAnonKey] = useState(storedConfig?.anonKey || '');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncCatalogWithSupabase();
      if (res.success) {
        await loadProducts();
        setSyncResult({
          message: `Sync successful! Uploaded ${res.pushed} product(s), downloaded ${res.pulled} product(s).`
        });
      } else {
        setSyncResult({ message: res.error || 'Sync failed', isError: true });
      }
    } catch (e: any) {
      setSyncResult({ message: e?.message || 'Sync failed', isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setSyncResult({ message: 'Project URL and Anon Key are required.', isError: true });
      return;
    }

    const config: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim()
    };

    const saved = saveStoredSupabaseConfig(config);
    if (saved) {
      setSyncResult({ message: 'Supabase configuration saved! Testing connection...' });
      setTimeout(() => {
        handleManualSync();
        setActiveTab('status');
      }, 500);
    } else {
      setSyncResult({ message: 'Failed to save configuration.', isError: true });
    }
  };

  const handleDisconnect = () => {
    if (!confirm('Are you sure you want to reset custom credentials? (Local products on this device will NOT be deleted).')) return;
    clearStoredSupabaseConfig();
    setSyncResult({ message: 'Credentials reset to default.' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">PostgreSQL Cloud Sync</h2>
              <p className="text-xs text-slate-500">Powered by Supabase & Realtime WebSockets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync notification */}
        {syncResult && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            syncResult.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {syncResult.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{syncResult.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-4 flex gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'status' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Database Status
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'setup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            API Credentials
          </button>
        </div>

        {/* Tab 1: Status */}
        {activeTab === 'status' && (
          <div className="mt-4 space-y-4">
            <div className={`p-4 rounded-2xl border ${isConnected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">PostgreSQL Connection</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isConnected ? '● Connected' : '○ Disconnected'}
                </span>
              </div>
              <p className="mt-2 text-xs font-mono font-semibold text-slate-800 break-all">
                {currentProjectUrl || 'Not configured'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                All devices connected to this Supabase project share the exact same PostgreSQL database with real-time automatic syncing.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || !isConnected}
                className="w-full py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Catalog Now (Push & Pull)'}</span>
              </button>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Direct SQL & Table Management:</p>
                <p className="mt-1 text-slate-500">
                  You can view and edit all your products directly in the Supabase Table Editor at:
                  <br />
                  <a
                    href="https://supabase.com/dashboard/project/xhmxgagyydglqgarrocd/editor"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-accent hover:underline break-all"
                  >
                    https://supabase.com/dashboard/project/xhmxgagyydglqgarrocd
                  </a>
                </p>
              </div>

              {storedConfig && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Custom credentials active</span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Reset Credentials
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Credentials Setup */}
        {activeTab === 'setup' && (
          <form onSubmit={handleSaveForm} className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Update your Supabase connection parameters (from Supabase Dashboard → Settings → API):
            </p>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Supabase Project URL *
              <input
                type="url"
                placeholder="https://xyz.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent"
                required
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Anon Public API Key *
              <input
                type="text"
                placeholder="eyJhbGciOi..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save & Connect to Supabase</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
