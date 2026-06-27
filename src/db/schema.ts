import Dexie, { Table } from 'dexie';

export interface ProductVariant {
  id?: string;
  barcode: string;
  name: string;
  shadeHex: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  expiryDate?: string;
}

export interface Product {
  id?: number;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  variant: string;
  variants?: ProductVariant[];
  shadeHex: string;
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
  costPrice?: number;
  batchNumber: string;
  variantId?: string;
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
  shiftId?: number;
  createdAt: number;
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
  username: string;
  email: string;
  name: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier' | 'inventory' | 'superadmin';
  passwordHash?: string;
  isActive: boolean;
  lastLogin?: number;
  createdAt: number;
  updatedAt?: number;
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

export class JayDeeDB extends Dexie {
  products!: Table<Product, number>;
  transactions!: Table<Transaction, number>;
  customers!: Table<Customer, number>;
  users!: Table<User, number>;
  shifts!: Table<Shift, number>;
  inventoryLog!: Table<InventoryLog, number>;

  constructor() {
    super('JayDeePOS');
    this.version(1).stores({
      products: '++id,sku,barcode,name,brand,category,subcategory,createdAt',
      transactions: '++id,transactionId,cashierId,cashierName,shiftId,createdAt,syncStatus',
      customers: '++id,phone,name,createdAt',
      users: '++id,role,isActive,lastLogin,createdAt',
      shifts: '++id,cashierId,status,createdAt',
      inventoryLog: '++id,productId,type,createdAt'
    });
  }
}

export const db = new JayDeeDB();
