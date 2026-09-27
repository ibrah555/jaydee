import { useState } from 'react';
import { 
  isFirebaseConfigured, 
  getFirebaseProjectId, 
  getStoredFirebaseConfig, 
  saveStoredFirebaseConfig, 
  clearStoredFirebaseConfig, 
  syncCatalogWithCloud, 
  FirebaseConfig 
} from '../services/firebase';
import { useProductStore } from '../stores/product';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, X, Download, Upload, Key, ShieldCheck } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const { loadProducts } = useProductStore();
  const isConnected = isFirebaseConfigured();
  const currentProjectId = getFirebaseProjectId();
  const storedConfig = getStoredFirebaseConfig();

  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'json'>('status');
  const [projectId, setProjectId] = useState(storedConfig?.projectId || '');
  const [apiKey, setApiKey] = useState(storedConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(storedConfig?.authDomain || '');
  const [appId, setAppId] = useState(storedConfig?.appId || '');
  const [jsonConfig, setJsonConfig] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncCatalogWithCloud();
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
    if (!projectId.trim() || !apiKey.trim()) {
      setSyncResult({ message: 'Project ID and API Key are required.', isError: true });
      return;
    }

    const config: FirebaseConfig = {
      projectId: projectId.trim(),
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim()
    };

    const saved = saveStoredFirebaseConfig(config);
    if (saved) {
      setSyncResult({ message: 'Firebase configuration saved! Connecting...' });
      setTimeout(() => {
        handleManualSync();
        setActiveTab('status');
      }, 500);
    } else {
      setSyncResult({ message: 'Failed to save configuration.', isError: true });
    }
  };

  const handleParseJson = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find JSON block or extract variables
      let cleaned = jsonConfig.trim();
      if (cleaned.includes('{') && cleaned.includes('}')) {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        cleaned = cleaned.substring(start, end + 1);
        // Replace unquoted keys
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        // Replace single quotes with double quotes
        cleaned = cleaned.replace(/'/g, '"');
      }

      const parsed = JSON.parse(cleaned);
      if (!parsed.projectId || !parsed.apiKey) {
        setSyncResult({ message: 'Invalid config: missing projectId or apiKey.', isError: true });
        return;
      }

      const config: FirebaseConfig = {
        projectId: parsed.projectId,
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
        appId: parsed.appId || '',
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: parsed.messagingSenderId || ''
      };

      saveStoredFirebaseConfig(config);
      setSyncResult({ message: 'Configuration saved! Connecting...' });
      setTimeout(() => {
        handleManualSync();
        setActiveTab('status');
      }, 500);
    } catch {
      setSyncResult({ message: 'Could not parse JSON. Please use the Form tab to enter fields.', isError: true });
    }
  };

  const handleDisconnect = () => {
    if (!confirm('Are you sure you want to disconnect Cloud Sync? (Local products on this device will NOT be deleted).')) return;
    clearStoredFirebaseConfig();
    setSyncResult({ message: 'Disconnected from Cloud Sync.' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isConnected ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Multi-Device Cloud Sync</h2>
              <p className="text-xs text-slate-500">Keep catalog & sales synchronized across devices</p>
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
            Cloud Status
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'setup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Setup Credentials
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-2 rounded-xl transition ${activeTab === 'json' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Paste JSON
          </button>
        </div>

        {/* Tab 1: Status */}
        {activeTab === 'status' && (
          <div className="mt-4 space-y-4">
            <div className={`p-4 rounded-2xl border ${isConnected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connection</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isConnected ? '● Connected' : '○ Not Connected'}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {isConnected ? `Project: ${currentProjectId}` : 'Local Device Only'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isConnected 
                  ? 'All changes on this device sync automatically to other devices in real-time.' 
                  : 'Products added on this phone/computer are saved in local storage. Connect Firebase below to sync across all phones & computers automatically.'}
              </p>
            </div>

            {isConnected ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Catalog Now (Push & Pull)'}</span>
                </button>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">Want to switch projects?</span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('setup')}
                  className="w-full py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Connect Firebase Project</span>
                </button>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Quick offline transfer without setup:</p>
                  <p className="mt-1 text-slate-500">
                    Go to <strong>More → Database Backup</strong>, tap <strong>Export Backup</strong> on Device 1, and tap <strong>Import Backup</strong> on Device 2 to transfer all products immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Manual Form Setup */}
        {activeTab === 'setup' && (
          <form onSubmit={handleSaveForm} className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Enter your Firebase Web App configuration from your Firebase Console (Project Settings → General → Your apps).
            </p>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Project ID *
              <input
                type="text"
                placeholder="e.g. jaydee-pos-12345"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                required
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              API Key (Web API Key) *
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                required
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Auth Domain (optional)
              <input
                type="text"
                placeholder="your-project.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              App ID (optional)
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save & Connect</span>
            </button>
          </form>
        )}

        {/* Tab 3: Paste JSON */}
        {activeTab === 'json' && (
          <form onSubmit={handleParseJson} className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">
              Paste the <code className="bg-slate-100 px-1 py-0.5 rounded text-accent font-mono text-[11px]">firebaseConfig</code> JavaScript object or JSON directly from the Firebase Console:
            </p>

            <textarea
              rows={6}
              value={jsonConfig}
              onChange={(e) => setJsonConfig(e.target.value)}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "jaydee.firebaseapp.com",\n  projectId: "jaydee",\n  appId: "1:..."\n};`}
              className="w-full font-mono text-xs rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-accent"
            />

            <button
              type="submit"
              disabled={!jsonConfig.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-accent text-white font-semibold text-sm hover:bg-purple-900 shadow-md transition disabled:opacity-50"
            >
              Parse & Save Configuration
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
