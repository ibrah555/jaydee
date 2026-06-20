import { useState, useEffect } from 'react';
import { useShiftStore } from '../stores/shift';
import { useAuthStore } from '../stores/auth';
import { Lock, LogOut, CheckCircle, Calculator } from 'lucide-react';
import { db } from '../db/schema';
import { useLiveQuery } from 'dexie-react-hooks';

export default function ShiftManagement() {
  const { user, signOut } = useAuthStore();
  const { activeShift, loadActiveShift, openShift, closeShift } = useShiftStore();

  const [floatAmount, setFloatAmount] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      loadActiveShift(user.id);
    }
  }, [user, loadActiveShift]);

  // Fetch sales during active shift to compute real-time metrics
  const activeShiftTransactions = useLiveQuery(async () => {
    if (!activeShift?.id) return [];
    return await db.transactions
      .where('shiftId')
      .equals(activeShift.id)
      .toArray();
  }, [activeShift]);

  const totalShiftSales = activeShiftTransactions?.reduce((sum, t) => sum + t.total, 0) ?? 0;
  const expectedBalance = (activeShift?.openingBalance ?? 0) + totalShiftSales;

  if (!user) return null;

  // 1. If NO shift is open, block checkout and force entry of Opening Float
  if (!activeShift && !reconciliationReport) {
    const handleOpenShift = async (e: React.FormEvent) => {
      e.preventDefault();
      const amt = parseFloat(floatAmount);
      if (isNaN(amt) || amt < 0) return;
      await openShift(user.id, user.name, amt);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-purple-50 text-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Start Shift</h2>
            <p className="text-slate-500 text-sm mt-1">Please enter the starting cash float in the drawer to unlock the POS.</p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Opening Cash Float (KES)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={floatAmount}
                onChange={e => setFloatAmount(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-lg font-semibold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => signOut()}
                className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-accent text-white font-semibold hover:bg-purple-900 transition text-sm shadow-md shadow-accent/10"
              >
                Open Register
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. Reconciliation report modal
  if (reconciliationReport) {
    const difference = reconciliationReport.actualEndingBalance - reconciliationReport.expectedEndingBalance;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Shift Closed</h2>
            <p className="text-slate-500 text-sm mt-1">Reconciliation Shift Report</p>
          </div>

          <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span className="font-semibold text-slate-800">{reconciliationReport.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Opening Float:</span>
              <span className="font-semibold text-slate-800">KES {reconciliationReport.openingBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shift Sales (Cash):</span>
              <span className="font-semibold text-slate-800">
                KES {(reconciliationReport.expectedEndingBalance - reconciliationReport.openingBalance).toLocaleString()}
              </span>
            </div>
            <hr className="border-slate-200/60" />
            <div className="flex justify-between">
              <span className="text-slate-500">Expected in Drawer:</span>
              <span className="font-bold text-slate-800">KES {reconciliationReport.expectedEndingBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Actual Counted:</span>
              <span className="font-bold text-slate-800">KES {reconciliationReport.actualEndingBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
              <span className="text-slate-500">Difference:</span>
              <span className={`font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {difference > 0 ? '+' : ''}KES {difference.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setReconciliationReport(null);
              signOut();
            }}
            className="w-full h-12 rounded-xl bg-accent text-white font-semibold hover:bg-purple-900 transition flex items-center justify-center gap-2"
          >
            Done & Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 3. Regular view — just a sticky button in sales sidebar to Close Shift
  return (
    <>
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Shift</span>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">KES {expectedBalance.toLocaleString()} expected</p>
        </div>
        <button
          onClick={() => setIsClosing(true)}
          className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition"
        >
          Close Shift
        </button>
      </div>

      {isClosing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Close Shift</h2>
              <p className="text-slate-500 text-sm mt-1">Reconcile ending drawer balance</p>
            </div>

            <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Float + Sales:</span>
                <span className="font-semibold text-slate-800">KES {expectedBalance.toLocaleString()}</span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const actual = parseFloat(actualBalance);
                if (isNaN(actual) || actual < 0) return;
                const closed = await closeShift(actual);
                setReconciliationReport(closed);
                setIsClosing(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Actual Cash Counted (KES)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={actualBalance}
                  onChange={e => setActualBalance(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-lg font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosing(false)}
                  className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                >
                  Confirm Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
