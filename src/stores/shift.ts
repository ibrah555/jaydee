import { create } from 'zustand';
import { db, Shift } from '../db/schema';

type ShiftState = {
  activeShift: Shift | null;
  loadActiveShift: (cashierId: string) => Promise<Shift | null>;
  openShift: (cashierId: string, cashierName: string, float: number) => Promise<Shift>;
  closeShift: (actualEndBalance: number) => Promise<Shift | null>;
};

export const useShiftStore = create<ShiftState>((set, get) => ({
  activeShift: null,

  loadActiveShift: async (cashierId) => {
    // Look up open shifts for this cashier
    const openShifts = await db.shifts
      .where('cashierId')
      .equals(cashierId)
      .and(s => s.status === 'open')
      .toArray();

    const active = openShifts[0] || null;
    set({ activeShift: active });
    return active;
  },

  openShift: async (cashierId, cashierName, float) => {
    const newShift: Shift = {
      cashierId,
      cashierName,
      startTime: Date.now(),
      openingBalance: float,
      expectedEndingBalance: float,
      status: 'open',
      createdAt: Date.now()
    };

    const id = await db.shifts.add(newShift);
    const savedShift = { ...newShift, id };
    set({ activeShift: savedShift });
    return savedShift;
  },

  closeShift: async (actualEndBalance) => {
    const { activeShift } = get();
    if (!activeShift || !activeShift.id) return null;

    // Calculate expected balance from transactions during this shift
    const transactions = await db.transactions
      .where('shiftId')
      .equals(activeShift.id)
      .toArray();

    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const expected = activeShift.openingBalance + totalSales;

    const updated: Shift = {
      ...activeShift,
      endTime: Date.now(),
      expectedEndingBalance: expected,
      actualEndingBalance: actualEndBalance,
      status: 'closed'
    };

    await db.shifts.put(updated);
    set({ activeShift: null });
    return updated;
  }
}));
