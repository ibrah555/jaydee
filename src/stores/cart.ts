import { create } from 'zustand';
import { Product } from '../db/schema';

type CartItem = {
  productId: number;
  name: string;
  shadeHex: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku: string;
};

type CartState = {
  items: CartItem[];
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  applyDiscountPercent: (percent: number) => void;
};

const getStoredCart = (): { items: CartItem[]; discountPercent: number } => {
  try {
    const raw = localStorage.getItem('jaydee-cart');
    if (!raw) return { items: [], discountPercent: 0 };
    return JSON.parse(raw) as { items: CartItem[]; discountPercent: number };
  } catch {
    return { items: [], discountPercent: 0 };
  }
};

const saveCart = (items: CartItem[], discountPercent: number) => {
  try {
    localStorage.setItem('jaydee-cart', JSON.stringify({ items, discountPercent }));
  } catch {
    // ignore storage errors
  }
};

const calculateTotals = (items: CartItem[], taxRate: number, discountPercent: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
  const taxable = subtotal - discountAmount;
  const taxTotal = Math.round((taxable * taxRate) / 100 * 100) / 100;
  const total = Math.round((taxable + taxTotal) * 100) / 100;
  return { subtotal, discountAmount, taxTotal, total };
};

const storedCart = getStoredCart();
const initialTotals = calculateTotals(storedCart.items, 16, storedCart.discountPercent);

export const useCartStore = create<CartState>((set, get) => ({
  items: storedCart.items,
  discountPercent: storedCart.discountPercent,
  discountAmount: initialTotals.discountAmount,
  taxRate: 16,
  subtotal: initialTotals.subtotal,
  taxTotal: initialTotals.taxTotal,
  total: initialTotals.total,
  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((item) => item.productId === product.id);
      const nextItems = existing
        ? state.items.map((item) => {
            if (item.productId === product.id) {
              const qty = item.quantity + quantity;
              return {
                ...item,
                quantity: qty,
                totalPrice: Math.round(qty * item.unitPrice * 100) / 100
              };
            }
            return item;
          })
        : [
            ...state.items,
            {
              productId: product.id!,
              name: product.name,
              shadeHex: product.shadeHex,
              quantity,
              unitPrice: product.sellingPrice,
              totalPrice: Math.round(quantity * product.sellingPrice * 100) / 100,
              sku: product.sku
            }
          ];

      const totals = calculateTotals(nextItems, state.taxRate, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },
  removeItem: (productId) => {
    set((state) => {
      const nextItems = state.items.filter((item) => item.productId !== productId);
      const totals = calculateTotals(nextItems, state.taxRate, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },
  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return;
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity,
            totalPrice: Math.round(quantity * item.unitPrice * 100) / 100
          };
        }
        return item;
      });
      const totals = calculateTotals(nextItems, state.taxRate, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },
  clearCart: () => {
    saveCart([], 0);
    set({ items: [], discountPercent: 0, discountAmount: 0, subtotal: 0, taxTotal: 0, total: 0 });
  },
  applyDiscountPercent: (percent) => {
    set((state) => {
      const totals = calculateTotals(state.items, state.taxRate, percent);
      return { ...state, discountPercent: percent, ...totals };
    });
  }
}));
