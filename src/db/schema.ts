import Dexie, { Table } from 'dexie';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Matte Lipstick - Ruby Red"
  barcode: string;
  stockQuantity: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate?: string;
  shadeHex?: string;
}

export interface Product {
  id?: number;
  sku: string;
  barcode: string; // Parent barcode
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  variant: string; // If single variant, legacy text
  shadeHex: string; // If single variant, legacy shade
  skinTypes: string[];
  concerns: string[];
  tags: string[];
  ingredients: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  testerQuantity: number;
  supplier: string;
  imageUrl: string;
  notes: string;
  lowStockThreshold: number;
  variants?: ProductVariant[]; // Variant support
  createdAt: number;
  updatedAt: number;
}

export interface TransactionItem {
  productId: number;
  productName: string;
  shade: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string;
  variantId?: string; // Track which variant was purchased
}

export interface Transaction {
  id?: number;
  transactionId: string;
  items: TransactionItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  paymentDetails: Record<string, unknown>;
  customerId?: number;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  status: string;
  syncStatus: string;
  pushAttempts?: number;
  lastAttemptAt?: number;
  syncFailureReason?: string;
  createdAt: number;
  shiftId?: number; // link to active shift
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  skinType?: string;
  concerns: string[];
  allergies: string[];
  preferredBrands: string[];
  notes: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  createdAt: number;
}

export interface User {
  id?: number;
  name: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier' | 'inventory';
  pinHash: string;
  isActive: boolean;
  lastLogin: number;
  createdAt: number;
}

export interface InventoryLog {
  id?: number;
  productId: number;
  type: 'stock_in' | 'stock_out' | 'sale' | 'adjustment' | 'tester_checkout';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  batchNumber?: string;
  reason?: string;
  userId: number;
  createdAt: number;
}

export interface Shift {
  id?: number;
  cashierId: string;
  cashierName: string;
  startTime: number;
  endTime?: number;
  openingBalance: number;
  expectedEndingBalance: number;
  actualEndingBalance?: number;
  status: 'open' | 'closed';
  createdAt: number;
}

export class JayDeeDB extends Dexie {
  products!: Table<Product, number>;
  transactions!: Table<Transaction, number>;
  customers!: Table<Customer, number>;
  users!: Table<User, number>;
  inventoryLog!: Table<InventoryLog, number>;
  shifts!: Table<Shift, number>;

  constructor() {
    super('JayDeePOS');
    this.version(1).stores({
      products: '++id,sku,barcode,name,brand,category,subcategory,createdAt',
      transactions: '++id,transactionId,cashierId,cashierName,createdAt,syncStatus',
      customers: '++id,phone,name,createdAt',
      users: '++id,role,isActive,lastLogin,createdAt',
      inventoryLog: '++id,productId,type,createdAt'
    });
    this.version(2).stores({
      products: '++id,sku,barcode,name,brand,category,subcategory,createdAt',
      transactions: '++id,transactionId,cashierId,cashierName,createdAt,syncStatus,shiftId',
      customers: '++id,phone,name,createdAt',
      users: '++id,role,isActive,lastLogin,createdAt',
      inventoryLog: '++id,productId,type,createdAt',
      shifts: '++id,cashierId,status,createdAt'
    });
  }
}

export const db = new JayDeeDB();
