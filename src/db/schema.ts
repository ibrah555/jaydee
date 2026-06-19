import Dexie, { Table } from 'dexie';

export interface Product {
  id?: number;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  variant: string;
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
  batchNumber: string;
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

export class JayDeeDB extends Dexie {
  products!: Table<Product, number>;
  transactions!: Table<Transaction, number>;
  customers!: Table<Customer, number>;
  users!: Table<User, number>;
  inventoryLog!: Table<InventoryLog, number>;

  constructor() {
    super('JayDeePOS');
    this.version(1).stores({
      products: '++id,sku,barcode,name,brand,category,subcategory,createdAt',
      transactions: '++id,transactionId,cashierId,cashierName,createdAt,syncStatus',
      customers: '++id,phone,name,createdAt',
      users: '++id,role,isActive,lastLogin,createdAt',
      inventoryLog: '++id,productId,type,createdAt'
    });
  }
}

export const db = new JayDeeDB();
