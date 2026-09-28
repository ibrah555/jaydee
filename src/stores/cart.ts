import { create } from 'zustand';
import { Product, ProductVariant } from '../db/schema';

export type CartItem = {
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
  maxStock?: number;
};

type CartState = {
  items: CartItem[];
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => { success: boolean; message?: string };
  removeItem: (productId: number, variantId?: string) => void;
  updateQuantity: (productId: number, variantId: string | undefined, quantity: number, maxStock?: number) => { success: boolean; message?: string };
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
    const availableStock = Number(variant ? variant.stockQuantity : product.stockQuantity) || 0;

    // Check if item is completely out of stock
    if (availableStock <= 0) {
      return { 
        success: false, 
        message: `"${product.name}${variant ? ` (${variant.name})` : ''}" is OUT OF STOCK (0 available)!` 
      };
    }

    const state = get();
    const match = (item: CartItem) => 
      item.productId === product.id && item.variantId === variant?.id;

    const existing = state.items.find(match);
    const currentQtyInCart = existing ? existing.quantity : 0;

    // Check if adding exceeds available stock
    if (currentQtyInCart + quantity > availableStock) {
      return {
        success: false,
        message: `Cannot add ${quantity} more. Only ${availableStock} in stock (${currentQtyInCart} already in cart)!`
      };
    }

    const price = variant ? Number(variant.sellingPrice) : Number(product.sellingPrice);
    const name = variant ? `${product.name} (${variant.name})` : product.name;
    const shade = variant?.shadeHex || product.shadeHex || '#b76e79';
    const sku = variant?.barcode || product.sku;
    const cost = variant ? Number(variant.costPrice) : Number(product.costPrice) || 0;

    const nextItems = existing
      ? state.items.map((item) => {
          if (match(item)) {
            const qty = item.quantity + quantity;
            return {
              ...item,
              quantity: qty,
              maxStock: availableStock,
              costPrice: cost,
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
            costPrice: cost,
            sku,
            variantId: variant?.id,
            variantName: variant?.name,
            maxStock: availableStock
          }
        ];

    const totals = calculateTotals(nextItems, state.discountPercent);
    saveCart(nextItems, state.discountPercent);
    set({ ...state, items: nextItems, ...totals });
    return { success: true };
  },

  removeItem: (productId, variantId) => {
    set((state) => {
      const nextItems = state.items.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      );
      const totals = calculateTotals(nextItems, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });
  },

  updateQuantity: (productId, variantId, quantity, maxStock) => {
    if (quantity < 1) return { success: false, message: 'Quantity must be at least 1' };

    if (maxStock !== undefined && quantity > maxStock) {
      return { 
        success: false, 
        message: `Cannot exceed available stock of ${maxStock} items.` 
      };
    }

    set((state) => {
      const nextItems = state.items.map((item) => {
        if (item.productId === productId && item.variantId === variantId) {
          const validQty = maxStock !== undefined ? Math.min(quantity, maxStock) : quantity;
          return {
            ...item,
            quantity: validQty,
            totalPrice: Math.round(validQty * item.unitPrice * 100) / 100
          };
        }
        return item;
      });
      const totals = calculateTotals(nextItems, state.discountPercent);
      saveCart(nextItems, state.discountPercent);
      return { ...state, items: nextItems, ...totals };
    });

    return { success: true };
  },

  clearCart: () => {
    saveCart([], 0);
    set({ items: [], discountPercent: 0, discountAmount: 0, subtotal: 0, total: 0 });
  },

  applyDiscountPercent: (percent) => {
    const validPercent = Math.max(0, Math.min(100, percent));
    set((state) => {
      const totals = calculateTotals(state.items, validPercent);
      saveCart(state.items, validPercent);
      return { ...state, discountPercent: validPercent, ...totals };
    });
  }
}));
