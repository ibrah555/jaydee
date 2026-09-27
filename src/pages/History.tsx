import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ArrowUpRight, Archive, Trash2, CheckSquare, Square, AlertCircle, Check, Search } from 'lucide-react';
import { useTransactionStore } from '../stores/transaction';
import { useAuthStore } from '../stores/auth';
import ReceiptModal from '../components/ReceiptModal';

export default function History() {
  const { transactions, loadTransactions, deleteTransaction, bulkDeleteTransactions } = useTransactionStore();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionMessage, setActionMessage] = useState('');

  const isAdmin = user && ['owner', 'manager', 'superadmin'].includes(user.role);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const pendingCount = useMemo(
    () => transactions.filter((transaction) => transaction.syncStatus === 'pending').length,
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const query = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.transactionId.toLowerCase().includes(query) ||
        t.cashierName.toLowerCase().includes(query) ||
        t.paymentMethod.toLowerCase().includes(query) ||
        String(t.total).includes(query)
    );
  }, [transactions, search]);

  const toggleSelectOrder = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id!).filter(Boolean));
    }
  };

  const handleDeleteSingle = async (t: any) => {
    if (!confirm(`Delete order ${t.transactionId} (KES ${t.total.toLocaleString()})? This will remove it from the system and cloud.`)) return;
    const ok = await deleteTransaction(t.id, t.transactionId);
    if (ok) {
      setActionMessage(`Order ${t.transactionId} deleted.`);
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected order(s)? This action cannot be undone.`)) return;

    const itemsToDelete = transactions
      .filter((t) => selectedIds.includes(t.id!))
      .map((t) => ({ id: t.id!, transactionId: t.transactionId }));

    const count = await bulkDeleteTransactions(itemsToDelete);
    setSelectedIds([]);
    setIsDeleteMode(false);
    setActionMessage(`${count} order(s) deleted successfully.`);
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleClearAll = async () => {
    if (transactions.length === 0) return;
    if (!confirm(`WARNING: This will permanently delete ALL ${transactions.length} orders from this device and the cloud. Are you sure?`)) return;

    const itemsToDelete = transactions.map((t) => ({ id: t.id!, transactionId: t.transactionId }));
    const count = await bulkDeleteTransactions(itemsToDelete);
    setSelectedIds([]);
    setIsDeleteMode(false);
    setActionMessage(`All ${count} orders cleared.`);
    setTimeout(() => setActionMessage(''), 3000);
  };

  return (
    <div className="min-h-screen p-4 pb-28">
      <header className="mb-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Transaction history</p>
              <h1 className="mt-1 text-2xl font-semibold text-accent">Sales & Orders</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-2xl bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">
                {pendingCount} pending sync
              </div>

              {isAdmin && transactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteMode(!isDeleteMode);
                    setSelectedIds([]);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition ${
                    isDeleteMode
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleteMode ? 'Exit Delete Mode' : 'Manage / Delete Orders'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Delete mode action toolbar */}
          {isDeleteMode && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({filteredTransactions.length})</span>
                </button>
                <span className="text-xs text-rose-800 font-medium">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 disabled:opacity-40 transition shadow-sm"
                >
                  Delete Selected ({selectedIds.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-700 border border-rose-200 font-semibold text-xs hover:bg-rose-50 transition"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Action feedback toast */}
      {actionMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>{actionMessage}</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Search Input */}
      {transactions.length > 0 && (
        <div className="mb-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order ID, cashier, or total..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs shadow-sm outline-none focus:border-accent"
          />
        </div>
      )}

      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No transactions found.</p>
            <p className="mt-2 text-xs text-slate-400">Complete a sale on the POS to start tracking orders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const isSelected = selectedIds.includes(transaction.id!);
              return (
                <div
                  key={transaction.id}
                  className={`rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
                    isSelected ? 'ring-2 ring-rose-500 bg-rose-50/20' : 'ring-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {isDeleteMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelectOrder(transaction.id!)}
                          className="mt-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-rose-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <div>
                        <p className="text-xs font-mono font-medium text-slate-500">{transaction.transactionId}</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">KES {transaction.total.toLocaleString()}</h2>
                        <p className="mt-0.5 text-xs text-slate-400">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          transaction.syncStatus === 'pending'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {transaction.syncStatus}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(transaction)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete this order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl">
                    <div>Items: <strong className="text-slate-800">{transaction.items.length}</strong></div>
                    <div>Method: <strong className="text-slate-800 uppercase">{transaction.paymentMethod.replace('_', ' ')}</strong></div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Cashier: <strong>{transaction.cashierName}</strong></span>
                    <button
                      className="inline-flex items-center gap-1.5 text-accent font-semibold hover:underline"
                      onClick={() => setSelected(transaction)}
                    >
                      View receipt <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <ReceiptModal transaction={selected} onClose={() => setSelected(null)} />}

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <Link to="/sale" className="flex flex-col items-center gap-1 text-slate-500">
            <Clock3 className="h-6 w-6" />
            <span className="text-xs">New Sale</span>
          </Link>
          <Link to="/products" className="flex flex-col items-center gap-1 text-slate-500">
            <Archive className="h-6 w-6" />
            <span className="text-xs">Products</span>
          </Link>
          <Link to="/history" className="flex flex-col items-center gap-1 text-accent">
            <span className="h-6 w-6 rounded-full bg-primary" />
            <span className="text-xs">History</span>
          </Link>
          <Link to="/more" className="flex flex-col items-center gap-1 text-slate-500">
            <span className="h-6 w-6 rounded-full bg-slate-200" />
            <span className="text-xs">More</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
