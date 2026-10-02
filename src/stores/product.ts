import { create } from 'zustand';
import { db, Product } from '../db/schema';
import { 
  pushProductToSupabase, 
  deleteProductFromSupabase, 
  syncCatalogWithSupabase,
  clearDeletedSku,
  isSupabaseConfigured 
} from '../services/supabase';

const PRODUCTS_PER_PAGE = 50;

type ProductState = {
  products: Product[];
  loading: boolean;
  search: string;
  category: string;
  hasMore: boolean;
  page: number;
  loadProducts: () => Promise<void>;
  loadMoreProducts: () => Promise<void>;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sku'> & { sku?: string }) => Promise<number>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  syncWithCloud: () => Promise<{ success: boolean; count: number; pushed?: number; pulled?: number; error?: string }>;
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  search: '',
  category: 'All',
  hasMore: true,
  page: 0,
  setSearch: (value) => set({ search: value }),
  setCategory: (value) => set({ category: value }),
  loadProducts: async () => {
    const isInitial = get().products.length === 0;
    if (isInitial) {
      set({ loading: true, page: 0 });
    }
    try {
      // Load local IndexedDB for instant UI
      const products = await db.products
        .orderBy('createdAt')
        .reverse()
        .toArray();

      set({ products, hasMore: false, page: 1, loading: false });

      // If Supabase is configured, sync in background if empty
      if (isSupabaseConfigured() && isInitial) {
        import('../services/supabase').then(({ pullProductsFromSupabase }) => {
          pullProductsFromSupabase().then(async (res: any) => {
            if (res.success && res.count > 0) {
              const refreshed = await db.products
                .orderBy('createdAt')
                .reverse()
                .toArray();
              set({ products: refreshed, hasMore: false });
            }
          }).catch(() => undefined);
        });
      }
    } finally {
      set({ loading: false });
    }
  },
  loadMoreProducts: async () => {
    set({ loading: true });
    try {
      const page = (state: ProductState) => state.page;
      const offset = page.toString() === 'function' ? 1 : await new Promise(resolve => {
        set((state) => {
          resolve(state.page);
          return state;
        });
      });
      const products = await db.products
        .orderBy('createdAt')
        .reverse()
        .offset((offset as number) * PRODUCTS_PER_PAGE)
        .limit(PRODUCTS_PER_PAGE)
        .toArray();
      const hasMore = products.length === PRODUCTS_PER_PAGE;
      set((state) => ({
        products: [...state.products, ...products],
        hasMore,
        page: state.page + 1
      }));
    } finally {
      set({ loading: false });
    }
  },
  addProduct: async (product) => {
    const now = Date.now();
    const sku = product.sku || `JD-${now.toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const record: Product = {
      ...product,
      sku,
      createdAt: now,
      updatedAt: now
    } as Product;

    const id = await db.products.add(record);
    const saved = { ...record, id };
    clearDeletedSku(sku);
    set((state) => ({ products: [saved, ...state.products] }));

    // Sync to Supabase in background
    if (isSupabaseConfigured()) {
      pushProductToSupabase(saved).catch(() => undefined);
    }

    return id;
  },
  updateProduct: async (id, product) => {
    const updatedAt = Date.now();
    await db.products.update(id, { ...product, updatedAt });
    const updated = await db.products.get(id);

    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...product, updatedAt } : p)
    }));

    // Sync to Supabase in background
    if (isSupabaseConfigured() && updated) {
      pushProductToSupabase(updated).catch(() => undefined);
    }
  },
  deleteProduct: async (id) => {
    const target = await db.products.get(id);
    await db.products.delete(id);
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));

    // Sync to Supabase in background
    if (isSupabaseConfigured() && target) {
      deleteProductFromSupabase(target.sku).catch(() => undefined);
    }
  },
  syncWithCloud: async () => {
    if (!isSupabaseConfigured()) {
      return { 
        success: false, 
        count: 0, 
        error: 'Supabase cloud database is not connected. Check your settings.' 
      };
    }
    const res = await syncCatalogWithSupabase();
    if (res.success) {
      await get().loadProducts();
    }
    return {
      success: res.success,
      count: res.pushed + res.pulled,
      pushed: res.pushed,
      pulled: res.pulled,
      error: res.error
    };
  }
}));
