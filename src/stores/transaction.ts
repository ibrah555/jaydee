import { create } from 'zustand';
import { db, Transaction, TransactionItem } from '../db/schema';
import { pushTransactionToFirestore } from '../services/firebase';

type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'split';

const TRANSACTIONS_PER_PAGE = 50;

type TransactionState = {
  transactions: Transaction[];
  pendingCount: number;
  hasMore: boolean;
  page: number;
  loadTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  syncPendingTransactions: () => Promise<void>;
  retryTransaction: (id: number) => Promise<boolean>;
  saveTransaction: (
    items: TransactionItem[],
    discountPercent: number,
    taxRate: number,
    paymentMethod: PaymentMethod,
    paymentDetails: Record<string, unknown>,
    cashierId: string,
    cashierName: string,
    customerPhone?: string
  ) => Promise<number>;
};

const generateTransactionId = () => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `JD-${datePart}-${randomPart}`;
};

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  pendingCount: 0,
  hasMore: true,
  page: 0,
  loadTransactions: async () => {
    const transactions = await db.transactions
      .orderBy('createdAt')
      .reverse()
      .limit(TRANSACTIONS_PER_PAGE)
      .toArray();
    const hasMore = transactions.length === TRANSACTIONS_PER_PAGE;
    set({
      transactions,
      hasMore,
      page: 1,
      pendingCount: transactions.filter((transaction) => transaction.syncStatus === 'pending').length
    });
  },
  loadMoreTransactions: async () => {
    set((state) => {
      (async () => {
        const offset = state.page * TRANSACTIONS_PER_PAGE;
        const transactions = await db.transactions
          .orderBy('createdAt')
          .reverse()
          .offset(offset)
          .limit(TRANSACTIONS_PER_PAGE)
          .toArray();
        const hasMore = transactions.length === TRANSACTIONS_PER_PAGE;
        set((s) => ({
          transactions: [...s.transactions, ...transactions],
          hasMore,
          page: s.page + 1
        }));
      })();
      return state;
    });
  },
  syncPendingTransactions: async () => {
    if (!navigator.onLine) return;

    const BACKOFF_BASE_MS = 60 * 1000; // 1 minute base
    const MAX_ATTEMPTS = 5;

    const pendingTransactions = await db.transactions.where('syncStatus').equals('pending').toArray();
    await Promise.all(
      pendingTransactions.map(async (transaction) => {
        const attempts = transaction.pushAttempts || 0;
        const last = transaction.lastAttemptAt || 0;
        const now = Date.now();
        const delay = Math.pow(2, attempts) * BACKOFF_BASE_MS;

        if (now - last < delay) {
          // not yet time to retry
          return;
        }

        const pushed = await pushTransactionToFirestore(transaction).catch(() => false);
        if (pushed) {
          await db.transactions.update(transaction.id!, { syncStatus: 'synced', pushAttempts: attempts + 1, lastAttemptAt: now, syncFailureReason: '' });
        } else {
          const nextAttempts = attempts + 1;
          const updates: any = { pushAttempts: nextAttempts, lastAttemptAt: now };
          if (nextAttempts >= MAX_ATTEMPTS) {
            updates.syncStatus = 'failed';
            updates.syncFailureReason = 'max_attempts_exceeded';
          }
          await db.transactions.update(transaction.id!, updates);
        }
      })
    );

    // Only update pending count, don't reload all transactions
    const pendingCount = await db.transactions.where('syncStatus').equals('pending').count();
    set({ pendingCount });
  },
  retryTransaction: async (id: number) => {
    const tx = await db.transactions.get(id);
    if (!tx) return false;
    if (!navigator.onLine) return false;

    const pushed = await pushTransactionToFirestore(tx).catch(() => false);
    if (pushed) {
      await db.transactions.update(id, { syncStatus: 'synced', syncFailureReason: '', pushAttempts: (tx.pushAttempts || 0) + 1, lastAttemptAt: Date.now() });
      // Update the transaction in the list and update pending count
      const pendingCount = await db.transactions.where('syncStatus').equals('pending').count();
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? { ...t, syncStatus: 'synced' } : t)),
        pendingCount
      }));
      return true;
    }

    const nextAttempts = (tx.pushAttempts || 0) + 1;
    const updates: any = { pushAttempts: nextAttempts, lastAttemptAt: Date.now(), syncFailureReason: 'manual_retry_failed' };
    if (nextAttempts >= 5) updates.syncStatus = 'failed';
    await db.transactions.update(id, updates);
    const pendingCount = await db.transactions.where('syncStatus').equals('pending').count();
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...updates, id } : t)),
      pendingCount
    }));
    return false;
  },
  saveTransaction: async (
    items,
    discountPercent,
    taxRate,
    paymentMethod,
    paymentDetails,
    cashierId,
    cashierName,
    customerPhone
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
    const taxable = subtotal - discountAmount;
    const taxAmount = Math.round((taxable * taxRate) / 100 * 100) / 100;
    const total = Math.round((taxable + taxAmount) * 100) / 100;
    const syncStatus = navigator.onLine ? 'synced' : 'pending';

    const transaction: Transaction = {
      transactionId: generateTransactionId(),
      items,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      paymentMethod,
      paymentDetails,
      customerPhone,
      cashierId,
      cashierName,
      status: 'completed',
      syncStatus,
      pushAttempts: 0,
      lastAttemptAt: 0,
      syncFailureReason: '',
      createdAt: Date.now()
    };

    const id = await db.transactions.add(transaction as any);
    // attempt to push immediately if online
    if (navigator.onLine) {
      const pushed = await pushTransactionToFirestore(transaction).catch(() => false);
      if (pushed) {
        await db.transactions.update(id, { syncStatus: 'synced' });
      }
    }

    const transactions = await db.transactions.orderBy('createdAt').reverse().toArray();
    set({
      transactions,
      pendingCount: transactions.filter((transaction) => transaction.syncStatus === 'pending').length
    });
    return id;
  }
}));
