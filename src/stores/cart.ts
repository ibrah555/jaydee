import { create } from 'zustand';
import { Product, ProductVariant } from '../db/schema';

type CartItem = {
  productId: number;
  name: string;
  shadeHex: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
  sku: string;
  variantId?: string;
  variantName?: string;
};

type CartState = {
  items: CartItem[];
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: number, variantId?: string) => void;
  updateQuantity: (productId: number, variantId: string | undefined, quantity: number) => void;
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

const calculateTotals = (items: CartItem[], discountPercent: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  return { subtotal, discountAmount, total };
};

const storedCart = getStoredCart();
const initialTotals = calculateTotals(storedCart.items, storedCart.discountPercent);

export const useCartStore = create<CartState>((set, get) => ({
  items: storedCart.items,
  discountPercent: storedCart.discountPercent,
  discountAmount: initialTotals.discountAmount,
  subtotal: initialTotals.subtotal,
  total: initialTotals.total,
  
  addItem: (product, quantity = 1, variant) => {
    set((state) => {
      const match = (item: CartItem) => 
        item.productId === product.id && item.variantId === variant?.id;

      const existing = state.items.find(match);
      
      const price = variant ? variant.sellingPrice : product.sellingPrice;
      const name = variant ? `${product.name} (${variant.name})` : product.name;
      const shade = variant?.shadeHex || product.shadeHex;
      const sku = variant?.barcode || product.sku;

      const nextItems = existing
        ? state.items.map((item) => {
            if (match(item)) {
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
              name,
              shadeHex: shade,
              quantity,
              unitPrice: price,
              totalPrice: Math.round(quantity * price * 100) / 100,
              costPrice: variant ? variant.costPrice : product.costPrice,
              sku,
              variantId: variant?.id,
              variantName: variant?.name
            }
          ];

      const totals = calculateTotals(nextItems, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },

  removeItem: (productId, variantId) => {
    set((state) => {
      const nextItems = state.items.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      );
      const totals = calculateTotals(nextItems, state.taxRate, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },

  updateQuantity: (productId, variantId, quantity) => {
    if (quantity < 1) return;
    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.productId === productId && item.variantId === variantId) {
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
    set({ items: [], discountPercent: 0, discountAmount: 0, subtotal: 0, total: 0 });
  },

  applyDiscountPercent: (percent) => {
    set((state) => {
      const totals = calculateTotals(state.items, percent);
      return { ...state, discountPercent: percent, ...totals };
    });
  }
}));
