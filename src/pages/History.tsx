import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, ArrowUpRight, Archive } from 'lucide-react';
import { useTransactionStore } from '../stores/transaction';
import ReceiptModal from '../components/ReceiptModal';

export default function History() {
  const { transactions, loadTransactions } = useTransactionStore();
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const pendingCount = useMemo(
    () => transactions.filter((transaction) => transaction.syncStatus === 'pending').length,
    [transactions]
  );

  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="mb-5">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Transaction history</p>
              <h1 className="mt-2 text-2xl font-semibold text-accent">History</h1>
            </div>
            <div className="rounded-3xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
              {pendingCount} pending
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">No transactions yet.</p>
            <p className="mt-3 text-sm text-slate-600">Complete a sale to start tracking receipts and sync status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{transaction.transactionId}</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">${transaction.total.toFixed(2)}</h2>
                    <p className="mt-1 text-sm text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-3xl px-3 py-2 text-sm font-semibold ${transaction.syncStatus === 'pending' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                    {transaction.syncStatus}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                  <div>Items: {transaction.items.length}</div>
                  <div>Method: {transaction.paymentMethod.replace('_', ' ')}</div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>Cashier: {transaction.cashierName}</span>
                  <div className="flex items-center gap-3">
                    {transaction.syncStatus === 'failed' && (
                      <button
                        className="rounded-2xl border border-rose-200 px-3 py-2 text-rose-700 text-sm"
                        onClick={async () => {
                          // import store inside handler to avoid top-level circular imports
                          const module = await import('../stores/transaction');
                          const retryTransaction = module.useTransactionStore.getState().retryTransaction;
                          if (retryTransaction) await retryTransaction(transaction.id!);
                        }}
                      >
                        Retry sync
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-2 text-accent font-semibold"
                      onClick={() => setSelected(transaction)}
                    >
                      View receipt <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
