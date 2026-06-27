import { create } from 'zustand';
import { db, Product } from '../db/schema';

const sampleProducts = [
  {
    sku: 'JD-LIP-001',
    barcode: '6901234567890',
    name: 'Matte Liquid Lipstick - Crimson',
    brand: 'JayDee Beauty',
    category: 'Makeup',
    subcategory: 'Lips',
    variant: 'Crimson Bold',
    shadeHex: '#9B1B30',
    skinTypes: ['All'],
    concerns: [],
    tags: ['Vegan', 'Cruelty-Free'],
    ingredients: 'Isododecane, Trimethylsiloxysilicate, Cyclopentasiloxane, Dimethicone',
    batchNumber: 'B101',
    manufacturingDate: '2026-01-15',
    expiryDate: '2028-01-15',
    costPrice: 5.50,
    sellingPrice: 12.00,
    stockQuantity: 45,
    testerQuantity: 2,
    supplier: 'Aura Cosmetics Ltd',
    imageUrl: '',
    notes: 'Best seller',
    lowStockThreshold: 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    sku: 'JD-SKN-002',
    barcode: '6901234567891',
    name: 'Hydrating Glow Serum',
    brand: 'JayDee Skin',
    category: 'Skincare',
    subcategory: 'Face',
    variant: 'Hyaluronic Acid 2%',
    shadeHex: '#EAEAEA',
    skinTypes: ['Dry', 'Sensitive', 'Combination'],
    concerns: ['Hydration', 'Redness'],
    tags: ['Organic', 'Fragrance-Free'],
    ingredients: 'Water, Hyaluronic Acid, Glycerin, Phenoxyethanol',
    batchNumber: 'B102',
    manufacturingDate: '2026-02-10',
    expiryDate: '2028-02-10',
    costPrice: 8.00,
    sellingPrice: 18.50,
    stockQuantity: 30,
    testerQuantity: 1,
    supplier: 'Zenith Labs',
    imageUrl: '',
    notes: 'Store in cool place',
    lowStockThreshold: 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    sku: 'JD-FGR-003',
    barcode: '6901234567892',
    name: 'Eau de Parfum - Velvet Rose',
    brand: 'JayDee Fragrance',
    category: 'Fragrance',
    subcategory: 'Women',
    variant: '50ml',
    shadeHex: '#C39B9B',
    skinTypes: ['All'],
    concerns: [],
    tags: [],
    ingredients: 'Alcohol Denat, Fragrance, Water',
    batchNumber: 'F201',
    manufacturingDate: '2025-11-20',
    expiryDate: '2030-11-20',
    costPrice: 22.00,
    sellingPrice: 48.00,
    stockQuantity: 15,
    testerQuantity: 1,
    supplier: 'ScentCraft',
    imageUrl: '',
    notes: 'Premium packaging',
    lowStockThreshold: 3,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    sku: 'JD-MKP-004',
    barcode: '6901234567893',
    name: 'Soft Focus Foundation',
    brand: 'JayDee Beauty',
    category: 'Makeup',
    subcategory: 'Face',
    variant: 'Warm Beige',
    shadeHex: '#D4A373',
    skinTypes: ['Oily', 'Combination'],
    concerns: ['Pores'],
    tags: ['SPF', 'Cruelty-Free'],
    ingredients: 'Titanium Dioxide, Zinc Oxide, Dimethicone, Silica',
    batchNumber: 'M302',
    manufacturingDate: '2026-03-01',
    expiryDate: '2029-03-01',
    costPrice: 12.00,
    sellingPrice: 26.00,
    stockQuantity: 25,
    testerQuantity: 2,
    supplier: 'Aura Cosmetics Ltd',
    imageUrl: '',
    notes: 'Medium coverage',
    lowStockThreshold: 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

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
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  search: '',
  category: 'All',
  hasMore: true,
  page: 0,
  setSearch: (value) => set({ search: value }),
  setCategory: (value) => set({ category: value }),
  loadProducts: async () => {
    set({ loading: true, page: 0, products: [] });
    try {
      const count = await db.products.count();
      if (count === 0) {
        await db.products.bulkAdd(sampleProducts as any);
      }
      const products = await db.products
        .orderBy('createdAt')
        .reverse()
        .limit(PRODUCTS_PER_PAGE)
        .toArray();
      const hasMore = products.length === PRODUCTS_PER_PAGE;
      set({ products, hasMore, page: 1 });
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
    set((state) => ({ products: [record, ...state.products] }));
    return id;
  },
  updateProduct: async (id, product) => {
    const updatedAt = Date.now();
    await db.products.update(id, { ...product, updatedAt });
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...product, updatedAt } : p)
    }));
  },
  deleteProduct: async (id) => {
    await db.products.delete(id);
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));
  }
}));
